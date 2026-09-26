import prisma from '../../config/database';

/**
 * GENERATE_REPORT processor
 * Generates organization reports (task stats, member activity).
 */
export async function processReport(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { organizationId } = payload;

  // Gather stats
  const [
    totalMembers,
    totalProjects,
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    recentActivity,
  ] = await Promise.all([
    prisma.organizationMember.count({
      where: { organizationId: organizationId as string },
    }),
    prisma.project.count({
      where: { organizationId: organizationId as string },
    }),
    prisma.task.count({
      where: { organizationId: organizationId as string },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { organizationId: organizationId as string },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { organizationId: organizationId as string },
      _count: true,
    }),
    prisma.auditLog.count({
      where: {
        organizationId: organizationId as string,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    organizationId,
    summary: {
      totalMembers,
      totalProjects,
      totalTasks,
      recentActivityCount: recentActivity,
    },
    taskBreakdown: {
      byStatus: tasksByStatus,
      byPriority: tasksByPriority,
    },
  };

  console.log('📊 Report generated:', JSON.stringify(report, null, 2));

  return report;
}
