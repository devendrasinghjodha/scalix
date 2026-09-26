import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '../validators/schemas';

const router = Router({ mergeParams: true });

// All project routes require authentication
router.use(authenticate);

// POST /api/organizations/:organizationId/projects
router.post(
  '/',
  requireMinRole('MANAGER'),
  validate(createProjectSchema),
  projectController.create.bind(projectController)
);

// GET /api/organizations/:organizationId/projects
router.get(
  '/',
  requireRole(),
  projectController.list.bind(projectController)
);

// GET /api/organizations/:organizationId/projects/:projectId
router.get(
  '/:projectId',
  requireRole(),
  projectController.getById.bind(projectController)
);

// PATCH /api/organizations/:organizationId/projects/:projectId
router.patch(
  '/:projectId',
  requireMinRole('MANAGER'),
  validate(updateProjectSchema),
  projectController.update.bind(projectController)
);

// DELETE /api/organizations/:organizationId/projects/:projectId
router.delete(
  '/:projectId',
  requireMinRole('ADMIN'),
  projectController.delete.bind(projectController)
);

export default router;
