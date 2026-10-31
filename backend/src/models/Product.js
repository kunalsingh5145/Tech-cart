import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: "" },
  stock: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
