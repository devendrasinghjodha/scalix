import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/invitations/:token/accept
router.post(
  '/:token/accept',
  authenticate,
  memberController.acceptInvitation.bind(memberController)
);

export default router;
