// src/validators/releaseValidator.js
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  version: z.string().min(1, { message: 'Version is required' }),
  description: z.string().optional(),
  notes: z.string().optional(),
  checklist: z.array(
    z.object({
      item: z.string().min(1),
      completed: z.boolean().optional().default(false),
    })
  ).optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'RELEASED', 'CANCELLED']).optional(),
  checklist: z.array(
    z.object({
      _id: z.string().optional(),
      item: z.string().optional(),
      completed: z.boolean().optional(),
    })
  ).optional(),
});

export const validateReleaseCreate = (req, res, next) => {
  try {
    createSchema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ error: e.errors });
  }
};

export const validateReleaseUpdate = (req, res, next) => {
  try {
    updateSchema.parse(req.body);
    next();
  } catch (e) {
    return res.status(400).json({ error: e.errors });
  }
};
