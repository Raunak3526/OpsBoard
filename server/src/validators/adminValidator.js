import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['ADMIN', 'ENGINEER']),
}).strict();

const activeSchema = z.object({
  active: z.boolean(),
}).strict();

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
};

export const validateUserRole = validate(roleSchema);
export const validateUserActive = validate(activeSchema);
