import { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service';
import { auditLogService } from '../services/auditLog.service';
import { Role } from '@prisma/client';

export class MemberController {
  /**
   * GET /api/organizations/:organizationId/members
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await memberService.listMembers(req.organizationId!);

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/organizations/:organizationId/members/invite
   */
  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await memberService.inviteMember({
        email: req.body.email,
        role: req.body.role as Role,
        organizationId: req.organizationId!,
        invitedById: req.user!.id,
      });

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'USER_INVITED',
        entity: 'Invitation',
        entityId: result.invitation.id,
        metadata: { email: req.body.email, role: req.body.role },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          invitation: result.invitation,
          invitationLink: result.invitationLink,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/invitations/:token/accept
   */
  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const membership = await memberService.acceptInvitation(
        req.params.token,
        req.user!.id
      );

      res.json({
        success: true,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/members/:memberId/role
   */
  async changeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await memberService.changeRole({
        memberId: req.params.memberId,
        newRole: req.body.role as Role,
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        actorRole: req.memberRole!,
      });

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'ROLE_CHANGED',
        entity: 'OrganizationMember',
        entityId: result.member.id,
        metadata: {
          userId: result.member.userId,
          userName: result.member.user.name,
          oldRole: result.oldRole,
          newRole: req.body.role,
        },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: result.member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/members/:memberId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await memberService.removeMember({
        memberId: req.params.memberId,
        organizationId: req.organizationId!,
        actorId: req.user!.id,
      });

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'USER_REMOVED',
        entity: 'OrganizationMember',
        entityId: member.id,
        metadata: {
          userId: member.userId,
          userName: member.user.name,
        },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/invitations
   */
  async listInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await memberService.listInvitations(
        req.organizationId!
      );

      res.json({
        success: true,
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/invitations/:invitationId
   */
  async revokeInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      await memberService.revokeInvitation(
        req.params.invitationId,
        req.organizationId!
      );

      res.json({
        success: true,
        message: 'Invitation revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const memberController = new MemberController();
