import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { auditLogService } from '../services/auditLog.service';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskController {
  /**
   * POST /api/organizations/:organizationId/tasks
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.create({
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        priority: req.body.priority,
        projectId: req.body.projectId,
        organizationId: req.organizationId!,
        assigneeId: req.body.assigneeId,
        createdById: req.user!.id,
        dueDate: req.body.dueDate,
      });

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'TASK_CREATED',
        entity: 'Task',
        entityId: task.id,
        metadata: { title: task.title, projectId: task.projectId },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/tasks
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const result = await taskService.list(req.organizationId!, {
        skip: pagination.skip,
        take: pagination.limit,
        status: req.query.status as TaskStatus | undefined,
        priority: req.query.priority as TaskPriority | undefined,
        assigneeId: req.query.assigneeId as string | undefined,
        projectId: req.query.projectId as string | undefined,
        search: req.query.search as string | undefined,
      });

      res.json({
        success: true,
        ...createPaginatedResponse(result.tasks, result.total, pagination),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/tasks/:taskId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getById(
        req.params.taskId,
        req.organizationId!
      );

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/tasks/:taskId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await taskService.update(
        req.params.taskId,
        req.organizationId!,
        req.body
      );

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'TASK_UPDATED',
        entity: 'Task',
        entityId: result.task.id,
        metadata: {
          changes: req.body,
          oldStatus: result.oldStatus,
        },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/tasks/:taskId
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.delete(
        req.params.taskId,
        req.organizationId!
      );

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'TASK_DELETED',
        entity: 'Task',
        entityId: req.params.taskId,
        metadata: { title: task.title },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
