// src/controllers/authController.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../middleware/asyncHandler.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const user = new User({ name, email, role: 'ENGINEER' });
  await user.setPassword(password);
  await user.save();
  const token = generateToken(user._id);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.status(201).json({
    message: 'User registered',
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'This account has been disabled' });
  }
  const valid = await user.validatePassword(password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user._id);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged in', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export const getMe = asyncHandler(async (req, res) => {
  // protect middleware already attached user
  res.json({ user: req.user });
});
