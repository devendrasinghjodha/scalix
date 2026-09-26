import prisma from '../config/database';
import { Role, Plan } from '@prisma/client';
import { slugify } from '../utils/helpers';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import { cacheService } from './cache.service';
import { auditLogService } from './auditLog.service';

export class OrganizationService {
  /**
   * Create a new organization. Creator becomes OWNER.
   */
  async create(data: { name: string; userId: string }) {
    const slug = slugify(data.name);

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictError('An organization with this name already exists');
    }

    // Create org + owner membership + free subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          ownerId: data.userId,
        },
      });

      // Add creator as OWNER member
      await tx.organizationMember.create({
        data: {
          userId: data.userId,
          organizationId: org.id,
          role: 'OWNER',
        },
      });

      // Create free subscription
      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      return org;
    });

    return result;
  }

  /**
   * Get organization by ID with caching.
   */
  async getById(orgId: string) {
    // Check cache
    const cached = await cacheService.getOrganization(orgId);
    if (cached) return cached;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        subscription: true,
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Cache result
    await cacheService.setOrganization(orgId, org);

    return org;
  }

  /**
   * List organizations the user belongs to.
   */
  async listByUser(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true, projects: true },
            },
            subscription: {
              select: { plan: true, status: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  /**
   * Update organization.
   */
  async update(
    orgId: string,
    data: { name?: string },
    actorId: string
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.name) {
      const slug = slugify(data.name);
      // Check slug uniqueness
      const existing = await prisma.organization.findFirst({
        where: { slug, NOT: { id: orgId } },
      });
      if (existing) {
        throw new ConflictError('An organization with this name already exists');
      }
      updateData.name = data.name;
      updateData.slug = slug;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    // Invalidate cache
    await cacheService.invalidateOrganization(orgId);

    return org;
  }

  /**
   * Delete organization (OWNER only).
   */
  async delete(orgId: string, actorId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.ownerId !== actorId) {
      throw new ForbiddenError('Only the owner can delete the organization');
    }

    await prisma.organization.delete({ where: { id: orgId } });

    // Invalidate cache
    await cacheService.invalidateOrganization(orgId);
  }
}

export const organizationService = new OrganizationService();
