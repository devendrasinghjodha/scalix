import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRole } from '../middleware/rbac';

const router = Router({ mergeParams: true });
router.use(authenticate, requireRole());
router.get('/', teamController.list.bind(teamController));
router.post('/', requireMinRole('ADMIN'), teamController.create.bind(teamController));
router.get('/:teamId', teamController.get.bind(teamController));
router.patch('/:teamId', requireMinRole('ADMIN'), teamController.update.bind(teamController));
router.delete('/:teamId', requireMinRole('ADMIN'), teamController.delete.bind(teamController));
router.post('/:teamId/members', requireMinRole('ADMIN'), teamController.addMember.bind(teamController));
router.delete('/:teamId/members/:userId', requireMinRole('ADMIN'), teamController.removeMember.bind(teamController));
export default router;
