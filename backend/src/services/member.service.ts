import prisma from '../config/database';
import { Role } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import { addJob } from '../jobs/queue';
import { config } from '../config';
import { generateInvitationLink } from '../utils/helpers';

export class MemberService {
  /**
   * List members of an organization.
   */
  async listMembers(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  /**
   * Invite a member to the organization.
   */
  async inviteMember(data: {
    email: string;
    role: Role;
    organizationId: string;
    invitedById: string;
  }) {
    // Cannot invite as OWNER
    if (data.role === 'OWNER') {
      throw new BadRequestError('Cannot invite someone as OWNER');
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: data.organizationId,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        organizationId: data.organizationId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new ConflictError('An invitation has already been sent to this email');
    }

    // Create invitation (expires in 7 days)
    const invitation = await prisma.invitation.create({
      data: {
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
        invitedById: data.invitedById,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    // Generate invitation link
    const invitationLink = generateInvitationLink(
      invitation.token,
      config.frontendUrl
    );

    // Queue invitation job (would send email in production)
    await addJob(
      'SEND_INVITATION',
      {
        invitationId: invitation.id,
        email: data.email,
        organizationName: invitation.organization.name,
        invitedByName: invitation.invitedBy.name,
        role: data.role,
        invitationLink,
      },
      data.organizationId
    );

    // Log invitation link to console for development
    console.log('\n' + '='.repeat(60));
    console.log('📧 INVITATION GENERATED');
    console.log(`   To: ${data.email}`);
    console.log(`   Org: ${invitation.organization.name}`);
    console.log(`   Role: ${data.role}`);
    console.log(`   Link: ${invitationLink}`);
    console.log('='.repeat(60) + '\n');

    return { invitation, invitationLink };
  }

  /**
   * Accept an invitation using the token.
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestError(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      // Update status to expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestError('Invitation has expired');
    }

    // Verify the accepting user's email matches
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invitation.email) {
      throw new ForbiddenError('This invitation was sent to a different email');
    }

    // Check if already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('You are already a member of this organization');
    }

    // Accept invitation and create membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      const membership = await tx.organizationMember.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      return membership;
    });

    return result;
  }

  /**
   * Change a member's role.
   */
  async changeRole(data: {
    memberId: string;
    newRole: Role;
    organizationId: string;
    actorId: string;
    actorRole: Role;
  }) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: data.memberId,
        organizationId: data.organizationId,
      },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Cannot change OWNER's role
    if (member.role === 'OWNER') {
      throw new ForbiddenError('Cannot change the owner\'s role');
    }

    // Cannot assign OWNER role
    if (data.newRole === 'OWNER') {
      throw new ForbiddenError('Cannot assign OWNER role');
    }

    // Cannot change your own role
    if (member.userId === data.actorId) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const updated = await prisma.organizationMember.update({
      where: { id: data.memberId },
      data: { role: data.newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return { member: updated, oldRole: member.role };
  }

  /**
   * Remove a member from the organization.
   */
  async removeMember(data: {
    memberId: string;
    organizationId: string;
    actorId: string;
  }) {
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: data.memberId,
        organizationId: data.organizationId,
      },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Cannot remove OWNER
    if (member.role === 'OWNER') {
      throw new ForbiddenError('Cannot remove the owner');
    }

    // Cannot remove yourself
    if (member.userId === data.actorId) {
      throw new ForbiddenError('Cannot remove yourself. Leave the organization instead.');
    }

    await prisma.organizationMember.delete({
      where: { id: data.memberId },
    });

    return member;
  }

  /**
   * List pending invitations for an organization.
   */
  async listInvitations(organizationId: string) {
    return prisma.invitation.findMany({
      where: {
        organizationId,
        status: 'PENDING',
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a pending invitation.
   */
  async revokeInvitation(invitationId: string, organizationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      throw new NotFoundError('Pending invitation not found');
    }

    return prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
  }
}

export const memberService = new MemberService();
