import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { authenticate } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { inviteMemberSchema, changeRoleSchema } from '../validators/schemas';

const router = Router({ mergeParams: true });

// All member routes require authentication
router.use(authenticate);

// GET /api/organizations/:organizationId/members
router.get(
  '/',
  requireRole(),
  memberController.list.bind(memberController)
);

// POST /api/organizations/:organizationId/members/invite
router.post(
  '/invite',
  requireMinRole('ADMIN'),
  validate(inviteMemberSchema),
  memberController.invite.bind(memberController)
);

// PATCH /api/organizations/:organizationId/members/:memberId/role
router.patch(
  '/:memberId/role',
  requireMinRole('ADMIN'),
  validate(changeRoleSchema),
  memberController.changeRole.bind(memberController)
);

// DELETE /api/organizations/:organizationId/members/:memberId
router.delete(
  '/:memberId',
  requireMinRole('ADMIN'),
  memberController.remove.bind(memberController)
);

// GET /api/organizations/:organizationId/invitations
router.get(
  '/invitations',
  requireMinRole('ADMIN'),
  memberController.listInvitations.bind(memberController)
);

// DELETE /api/organizations/:organizationId/invitations/:invitationId
router.delete(
  '/invitations/:invitationId',
  requireMinRole('ADMIN'),
  memberController.revokeInvitation.bind(memberController)
);

export default router;
