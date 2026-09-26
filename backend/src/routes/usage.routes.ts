import { Router } from 'express';
import { usageController } from '../controllers/usage.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });
router.use(authenticate, requireRole());
router.get('/current', usageController.current.bind(usageController));
router.get('/history', usageController.history.bind(usageController));
export default router;
