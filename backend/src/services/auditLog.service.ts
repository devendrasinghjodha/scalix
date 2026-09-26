import prisma from '../config/database';
import { AuditAction } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { addJob } from '../jobs/queue';

interface AuditLogData {
  organizationId: string;
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditLogService {
  /**
   * Create an audit log entry.
   * Queues the log creation as a background job for performance.
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await addJob('PROCESS_AUDIT_LOG', data as unknown as Record<string, unknown>, data.organizationId);
    } catch (error) {
      // Fallback: create directly if queue fails
      console.error('Failed to queue audit log, creating directly:', error);
      await this.createDirectly(data);
    }
  }

  /**
   * Create audit log directly in the database.
   * Used by the job processor and as a fallback.
   */
  async createDirectly(data: AuditLogData): Promise<void> {
    await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        actorId: data.actorId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
      },
    });
  }

  /**
   * Get audit logs for an organization with pagination and filtering.
   */
  async getByOrganization(
    organizationId: string,
    params: {
      skip: number;
      take: number;
      action?: AuditAction;
      actorId?: string;
      entity?: string;
    }
  ) {
    const where: Record<string, unknown> = { organizationId };

    if (params.action) where.action = params.action;
    if (params.actorId) where.actorId = params.actorId;
    if (params.entity) where.entity = params.entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

export const auditLogService = new AuditLogService();
