// src/routes/releases.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  updateChecklistItem,
} from '../controllers/releaseController.js';
import { validateReleaseCreate, validateReleaseUpdate } from '../validators/releaseValidator.js';

const router = express.Router();

router.use(protect);

router.get('/', getReleases);
router.post('/', authorize('ADMIN'), validateReleaseCreate, createRelease);
router.get('/:id', getReleaseById);
router.patch('/:id', authorize('ADMIN'), validateReleaseUpdate, updateRelease);
router.patch('/:id/checklist/:itemId', authorize('ADMIN'), updateChecklistItem);

export default router;
