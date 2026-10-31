import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { type: String, enum: ["processing", "shipped", "delivered", "cancelled"], default: "processing" },
  paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
  shippingAddress: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
