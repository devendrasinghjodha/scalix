import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });
router.use(authenticate, requireMinRole('ADMIN'));
router.get('/', apiKeyController.list.bind(apiKeyController));
router.post('/', apiKeyController.create.bind(apiKeyController));
router.delete('/:keyId', apiKeyController.revoke.bind(apiKeyController));
export default router;
