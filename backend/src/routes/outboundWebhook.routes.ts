import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });
router.use(authenticate, requireRole());
router.get('/', webhookController.list.bind(webhookController));
router.post('/', requireMinRole('ADMIN'), webhookController.create.bind(webhookController));
router.patch('/:endpointId', requireMinRole('ADMIN'), webhookController.update.bind(webhookController));
router.delete('/:endpointId', requireMinRole('ADMIN'), webhookController.delete.bind(webhookController));
router.get('/:endpointId/deliveries', webhookController.deliveries.bind(webhookController));
export default router;
