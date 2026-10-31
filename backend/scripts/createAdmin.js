import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
dotenv.config();

const products = [
  { name: "Nova Gaming Laptop", category: "Laptops", description: "High-performance gaming laptop for work and play.", price: 89999, stock: 8, image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80" },
  { name: "iPhone Pro", category: "Phones", description: "Premium smartphone with a bright display and pro camera system.", price: 119999, stock: 12, image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80" },
  { name: "Mechanical RGB Keyboard", category: "Keyboards", description: "Mechanical switches with customizable RGB lighting.", price: 4999, stock: 25, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80" },
  { name: "Wireless Gaming Mouse", category: "Mice", description: "Lightweight wireless mouse with precise tracking.", price: 2499, stock: 30, image: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80" },
  { name: "Studio Headphones", category: "Audio", description: "Comfortable over-ear headphones for music and gaming.", price: 6999, stock: 14, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80" },
  { name: "27-inch Gaming Monitor", category: "Monitors", description: "Large display for immersive gaming and productivity.", price: 21999, stock: 6, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80" }
];

try {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || "Store Admin", email,
      passwordHash: await bcrypt.hash(password, 12), role: "admin"
    });
    console.log(`Admin created: ${email}`);
  } else {
    admin.role = "admin";
    await admin.save();
    console.log(`Existing account promoted to admin: ${email}`);
  }
  if (await Product.countDocuments() === 0) {
    await Product.insertMany(products);
    console.log("Sample products added.");
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
