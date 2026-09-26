import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema } from '../validators/schemas';

const router = Router({ mergeParams: true });

// All task routes require authentication
router.use(authenticate);

// POST /api/organizations/:organizationId/tasks
router.post(
  '/',
  requireRole(),
  validate(createTaskSchema),
  taskController.create.bind(taskController)
);

// GET /api/organizations/:organizationId/tasks
router.get(
  '/',
  requireRole(),
  taskController.list.bind(taskController)
);

// GET /api/organizations/:organizationId/tasks/:taskId
router.get(
  '/:taskId',
  requireRole(),
  taskController.getById.bind(taskController)
);

// PATCH /api/organizations/:organizationId/tasks/:taskId
router.patch(
  '/:taskId',
  requireRole(),
  validate(updateTaskSchema),
  taskController.update.bind(taskController)
);

// DELETE /api/organizations/:organizationId/tasks/:taskId
router.delete(
  '/:taskId',
  requireRole(),
  taskController.delete.bind(taskController)
);

export default router;
