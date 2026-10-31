import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./src/routes/auth.js";
import productRoutes from "./src/routes/products.js";
import orderRoutes from "./src/routes/orders.js";
import { requireAuth, requireAdmin } from "./src/middleware/auth.js";
import Product from "./src/models/Product.js";
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "TechCart API" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Admin-only inventory summary
app.get("/api/admin/summary", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [productCount, orderCount, lowStock, orders] = await Promise.all([
      Product.countDocuments(),
      (await import("./src/models/Order.js")).default.countDocuments(),
      Product.countDocuments({ stock: { $lte: 5 } }),
      (await import("./src/models/Order.js")).default.find().sort({ createdAt: -1 }).limit(5)
    ]);
    res.json({ productCount, orderCount, lowStock, recentOrders: orders });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => console.log(`TechCart API listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
