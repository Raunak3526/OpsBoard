// src/routes/dashboard.js
import express from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboardMetrics } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);
router.get('/', getDashboardMetrics);

export default router;
