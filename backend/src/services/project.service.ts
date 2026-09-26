import prisma from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { cacheService } from './cache.service';

export class ProjectService {
  /**
   * Create a new project in an organization.
   */
  async create(data: {
    name: string;
    description?: string;
    organizationId: string;
    createdById: string;
  }) {
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          organizationId: data.organizationId,
          createdById: data.createdById,
        },
      });

      // Add creator as project member
      await tx.projectMember.create({
        data: {
          userId: data.createdById,
          projectId: proj.id,
          role: 'OWNER',
        },
      });

      return proj;
    });

    // Invalidate cache
    await cacheService.invalidateProjectList(data.organizationId);

    return project;
  }

  /**
   * List projects in an organization with pagination.
   */
  async listByOrganization(
    organizationId: string,
    params: { skip: number; take: number }
  ) {
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.project.count({ where: { organizationId } }),
    ]);

    return { projects, total };
  }

  /**
   * Get project by ID (with tenant isolation).
   */
  async getById(projectId: string, organizationId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  /**
   * Update a project.
   */
  async update(
    projectId: string,
    organizationId: string,
    data: { name?: string; description?: string | null }
  ) {
    // Verify project belongs to org
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    await cacheService.invalidateProjectList(organizationId);

    return project;
  }

  /**
   * Delete a project.
   */
  async delete(projectId: string, organizationId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    await prisma.project.delete({ where: { id: projectId } });

    await cacheService.invalidateProjectList(organizationId);
  }
}

export const projectService = new ProjectService();
