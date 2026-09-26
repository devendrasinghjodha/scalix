import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/auditLog.service';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { AuditAction } from '@prisma/client';

export class AuditLogController {
  /**
   * GET /api/organizations/:organizationId/audit-logs
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const result = await auditLogService.getByOrganization(
        req.organizationId!,
        {
          skip: pagination.skip,
          take: pagination.limit,
          action: req.query.action as AuditAction | undefined,
          actorId: req.query.actorId as string | undefined,
          entity: req.query.entity as string | undefined,
        }
      );

      res.json({
        success: true,
        ...createPaginatedResponse(result.logs, result.total, pagination),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogController = new AuditLogController();
