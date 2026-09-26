import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /api/organizations/:organizationId/audit-logs
router.get(
  '/',
  requireMinRole('ADMIN'),
  auditLogController.list.bind(auditLogController)
);

export default router;
