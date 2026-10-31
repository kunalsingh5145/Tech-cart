import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { items, shippingAddress } = req.body;
    if (!Array.isArray(items) || items.length === 0 || !shippingAddress?.trim()) {
      return res.status(400).json({ message: "Cart items and shipping address are required." });
    }
    let createdOrder;
    await session.withTransaction(async () => {
      const orderItems = [];
      let total = 0;
      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw Object.assign(new Error("Invalid item quantity."), { status: 400 });
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw Object.assign(new Error("A product in your cart no longer exists."), { status: 400 });
        if (product.stock < quantity) throw Object.assign(new Error(`${product.name} does not have enough stock.`), { status: 409 });
        product.stock -= quantity;
        await product.save({ session });
        orderItems.push({ product: product._id, name: product.name, price: product.price, quantity });
        total += product.price * quantity;
      }
      [createdOrder] = await Order.create([{
        customer: req.user._id, customerName: req.user.name, customerEmail: req.user.email,
        items: orderItems, total, shippingAddress: shippingAddress.trim(),
        status: "processing", paymentStatus: "pending"
      }], { session });
    });
    res.status(201).json(createdOrder);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try { res.json(await Order.find({ customer: req.user._id }).sort({ createdAt: -1 })); }
  catch (err) { next(err); }
});

router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await Order.find().sort({ createdAt: -1 })); }
  catch (err) { next(err); }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  } catch (err) { next(err); }
});

export default router;
