// src/validators/incidentValidator.js
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  assignee: z.string().regex(/^[a-f\d]{24}$/i, 'Assignee must be a valid user ID.').optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']).optional(),
  assignee: z.string().regex(/^[a-f\d]{24}$/i, 'Assignee must be a valid user ID.').nullable().optional(),
  resolutionNote: z.string().optional(),
});

export const validateIncidentCreate = (req, res, next) => {
  try {
    createSchema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ error: e.errors });
  }
};

export const validateIncidentUpdate = (req, res, next) => {
  try {
    updateSchema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ error: e.errors });
  }
};
