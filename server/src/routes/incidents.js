// src/routes/incidents.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  reopenIncident,
  getIncidentActivity,
} from '../controllers/incidentController.js';
import { validateIncidentCreate, validateIncidentUpdate } from '../validators/incidentValidator.js';

const router = express.Router();

router.use(protect); // all routes require authentication

router.get('/', getIncidents); // list with pagination, filters
router.post('/', authorize('ADMIN', 'ENGINEER'), validateIncidentCreate, createIncident);
router.get('/:id', getIncidentById);
router.patch('/:id', authorize('ADMIN', 'ENGINEER'), validateIncidentUpdate, updateIncident);
router.post('/:id/reopen', authorize('ADMIN', 'ENGINEER'), reopenIncident);
router.get('/:id/activity', getIncidentActivity);

export default router;
