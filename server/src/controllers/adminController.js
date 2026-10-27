import Activity from '../models/Activity.js';
import User from '../models/User.js';
import asyncHandler from '../middleware/asyncHandler.js';

const userFields = 'name email role active createdAt updatedAt';

const isSelf = (userId, currentUserId) =>
  String(userId).toLowerCase() === String(currentUserId).toLowerCase();

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(userFields)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, page, limit });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  if (isSelf(id, req.user._id)) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === role) return res.json({ user: safeUser(user) });

  if (user.active && user.role === 'ADMIN' && role !== 'ADMIN') {
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', active: true });
    if (activeAdmins <= 1) {
      return res.status(409).json({ error: 'The last active administrator cannot be demoted' });
    }
  }

  const previousRole = user.role;
  user.role = role;
  await user.save();
  await Activity.create({
    actor: req.user._id,
    subject: user._id,
    action: 'USER_ROLE_UPDATE',
    details: `Role changed from ${previousRole} to ${role}`,
    previousValue: previousRole,
    newValue: role,
  });

  res.json({ user: safeUser(user) });
});

export const updateUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  if (isSelf(id, req.user._id)) {
    return res.status(400).json({ error: 'You cannot change your own account status' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.active === active) return res.json({ user: safeUser(user) });

  if (!active && user.role === 'ADMIN') {
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', active: true });
    if (activeAdmins <= 1) {
      return res.status(409).json({ error: 'The last active administrator cannot be disabled' });
    }
  }

  user.active = active;
  await user.save();
  await Activity.create({
    actor: req.user._id,
    subject: user._id,
    action: 'USER_STATUS_UPDATE',
    details: `Account ${active ? 'enabled' : 'disabled'}`,
    previousValue: String(!active),
    newValue: String(active),
  });

  res.json({ user: safeUser(user) });
});
