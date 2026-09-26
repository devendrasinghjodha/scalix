import prisma from '../../config/database';
import { AuditAction } from '@prisma/client';

/**
 * PROCESS_AUDIT_LOG processor
 * Creates audit log entries in the database.
 */
export async function processAuditLog(
  payload: Record<string, unknown>
): Promise<{ created: boolean }> {
  const {
    organizationId,
    actorId,
    action,
    entity,
    entityId,
    metadata,
    ipAddress,
  } = payload;

  await prisma.auditLog.create({
    data: {
      organizationId: organizationId as string,
      actorId: actorId as string,
      action: action as AuditAction,
      entity: entity as string,
      entityId: entityId as string,
      metadata: (metadata as any) || {},
      ipAddress: ipAddress as string | undefined,
    },
  });

  return { created: true };
}
