import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const makeToken = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "2h" });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;
