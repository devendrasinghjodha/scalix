import prisma from '../config/database';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class TaskService {
  /**
   * Create a new task.
   */
  async create(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    projectId: string;
    organizationId: string;
    assigneeId?: string | null;
    createdById: string;
    dueDate?: string | null;
  }) {
    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId: data.organizationId },
    });

    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    // Verify assignee is a member of the org (if provided)
    if (data.assigneeId) {
      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: data.assigneeId,
            organizationId: data.organizationId,
          },
        },
      });
      if (!member) {
        throw new NotFoundError('Assignee is not a member of this organization');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        projectId: data.projectId,
        organizationId: data.organizationId,
        assigneeId: data.assigneeId,
        createdById: data.createdById,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return task;
  }

  /**
   * List tasks with filtering, sorting, and pagination.
   */
  async list(
    organizationId: string,
    params: {
      skip: number;
      take: number;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      projectId?: string;
      search?: string;
    }
  ) {
    const where: Record<string, unknown> = { organizationId };

    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.assigneeId) where.assigneeId = params.assigneeId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total };
  }

  /**
   * Get task by ID (with tenant isolation).
   */
  async getById(taskId: string, organizationId: string) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    return task;
  }

  /**
   * Update a task.
   */
  async update(
    taskId: string,
    organizationId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) {
    // Verify task belongs to org
    const existing = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    // Verify assignee if provided
    if (data.assigneeId) {
      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: data.assigneeId,
            organizationId,
          },
        },
      });
      if (!member) {
        throw new NotFoundError('Assignee is not a member of this organization');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return { task, oldStatus: existing.status };
  }

  /**
   * Delete a task.
   */
  async delete(taskId: string, organizationId: string) {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    await prisma.task.delete({ where: { id: taskId } });

    return existing;
  }
}

export const taskService = new TaskService();
