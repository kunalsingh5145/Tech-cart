import { Router } from "express";
import Product from "../models/Product.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== "All") filter.category = req.query.category;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };
    res.json(await Product.find(filter).sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});
router.post("/import/dummyjson", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const response = await fetch("https://dummyjson.com/products?limit=0");

    if (!response.ok) {
      throw new Error("Could not fetch products from DummyJSON");
    }

    const data = await response.json();

    // Only import electronics-related categories
    const categoryMap = {
      laptops: "Laptops",
      smartphones: "Phones",
      tablets: "Accessories",
      "mobile-accessories": "Accessories"
    };

    const electronics = data.products.filter(
      product => categoryMap[product.category]
    );

    if (electronics.length === 0) {
      return res.status(404).json({
        message: "No electronics products found."
      });
    }

    const operations = electronics.map(product => ({
      updateOne: {
        filter: {
          name: product.title,
          category: categoryMap[product.category]
        },
        update: {
          $set: {
            name: product.title,
            category: categoryMap[product.category],
            description: product.description || "",
            price: Number(product.price),
            image: product.thumbnail || "",
            stock: Math.max(0, Number(product.stock) || 0)
          }
        },
        upsert: true
      }
    }));

    const result = await Product.bulkWrite(operations);

    res.json({
      message: "Electronics imported successfully!",
      fetched: data.products.length,
      electronicsFound: electronics.length,
      inserted: result.upsertedCount,
      updated: result.modifiedCount
    });

  } catch (err) {
    next(err);
  }
});


router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, category, description = "", price, image = "", stock } = req.body;
    if (!name || !category || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: "Enter a name, category, valid price, and whole-number stock." });
    }
    res.status(201).json(await Product.create({ name, category, description, price: Number(price), image, stock: Number(stock) }));
  } catch (err) { next(err); }
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) { next(err); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted." });
  } catch (err) { next(err); }
});

export default router;
