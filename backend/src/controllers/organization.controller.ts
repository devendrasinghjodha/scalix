import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { auditLogService } from '../services/auditLog.service';

export class OrganizationController {
  /**
   * POST /api/organizations
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationService.create({
        name: req.body.name,
        userId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizations = await organizationService.listByUser(req.user!.id);

      res.json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationService.getById(req.params.organizationId);

      res.json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/organizations/:organizationId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationService.update(
        req.params.organizationId,
        req.body,
        req.user!.id
      );

      // Audit log
      await auditLogService.log({
        organizationId: req.params.organizationId,
        actorId: req.user!.id,
        action: 'PROJECT_UPDATED',
        entity: 'Organization',
        entityId: org.id,
        metadata: { changes: req.body },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: org,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:organizationId
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await organizationService.delete(
        req.params.organizationId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
