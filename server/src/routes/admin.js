import express from 'express';
import { getUsers, updateUserActive, updateUserRole } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateUserActive, validateUserRole } from '../validators/adminValidator.js';

const router = express.Router();

router.use(protect, authorize('ADMIN'));
router.get('/users', getUsers);
router.patch('/users/:id/role', validateUserRole, updateUserRole);
router.patch('/users/:id/active', validateUserActive, updateUserActive);

export default router;
