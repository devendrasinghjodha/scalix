import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { auditLogService } from '../services/auditLog.service';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

export class ProjectController {
  /**
   * POST /api/organizations/:organizationId/projects
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.create({
        name: req.body.name,
        description: req.body.description,
        organizationId: req.organizationId!,
        createdById: req.user!.id,
      });

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'PROJECT_CREATED',
        entity: 'Project',
        entityId: project.id,
        metadata: { name: project.name },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/projects
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const result = await projectService.listByOrganization(
        req.organizationId!,
        { skip: pagination.skip, take: pagination.limit }
      );

      res.json({
        success: true,
        ...createPaginatedResponse(result.projects, result.total, pagination),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/projects/:projectId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(
        req.params.projectId,
        req.organizationId!
      );

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/projects/:projectId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.update(
        req.params.projectId,
        req.organizationId!,
        req.body
      );

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'PROJECT_UPDATED',
        entity: 'Project',
        entityId: project.id,
        metadata: { changes: req.body },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/projects/:projectId
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.delete(req.params.projectId, req.organizationId!);

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'PROJECT_DELETED',
        entity: 'Project',
        entityId: req.params.projectId,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
