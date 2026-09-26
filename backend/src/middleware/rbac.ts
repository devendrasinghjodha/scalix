import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, BadRequestError } from '../utils/errors';
import prisma from '../config/database';
import { usageService } from '../services/usage.service';

// Role hierarchy: OWNER > ADMIN > MANAGER > MEMBER
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      memberRole?: Role;
    }
  }
}

/**
 * Middleware to verify user belongs to the organization
 * and has the minimum required role.
 * 
 * Expects organizationId from:
 * 1. req.params.organizationId
 * 2. req.headers['x-organization-id']
 * 3. req.body.organizationId
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId =
        req.params.organizationId ||
        (req.headers['x-organization-id'] as string) ||
        req.body?.organizationId;

      if (!organizationId) {
        throw new BadRequestError('Organization ID is required');
      }

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.id,
            organizationId,
          },
        },
      });

      if (!member) {
        throw new ForbiddenError('You are not a member of this organization');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`
        );
      }

      req.organizationId = organizationId;
      req.memberRole = member.role;
      await usageService.increment(organizationId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check minimum role level using hierarchy.
 * e.g., requireMinRole('MANAGER') allows MANAGER, ADMIN, OWNER
 */
export function requireMinRole(minRole: Role) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId =
        req.params.organizationId ||
        (req.headers['x-organization-id'] as string) ||
        req.body?.organizationId;

      if (!organizationId) {
        throw new BadRequestError('Organization ID is required');
      }

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.id,
            organizationId,
          },
        },
      });

      if (!member) {
        throw new ForbiddenError('You are not a member of this organization');
      }

      if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minRole]) {
        throw new ForbiddenError(
          `Insufficient permissions. Minimum role required: ${minRole}`
        );
      }

      req.organizationId = organizationId;
      req.memberRole = member.role;
      await usageService.increment(organizationId);
      next();
    } catch (error) {
      next(error);
    }
  };
}
