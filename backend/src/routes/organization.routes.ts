import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '../validators/schemas';

const router = Router();

// All org routes require authentication
router.use(authenticate);

// POST /api/organizations
router.post(
  '/',
  validate(createOrganizationSchema),
  organizationController.create.bind(organizationController)
);

// GET /api/organizations
router.get('/', organizationController.list.bind(organizationController));

// GET /api/organizations/:organizationId
router.get(
  '/:organizationId',
  requireRole(),
  organizationController.getById.bind(organizationController)
);

// PATCH /api/organizations/:organizationId
router.patch(
  '/:organizationId',
  requireMinRole('ADMIN'),
  validate(updateOrganizationSchema),
  organizationController.update.bind(organizationController)
);

// DELETE /api/organizations/:organizationId
router.delete(
  '/:organizationId',
  requireRole('OWNER'),
  organizationController.delete.bind(organizationController)
);

export default router;
