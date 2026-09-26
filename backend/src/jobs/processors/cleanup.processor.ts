import prisma from '../../config/database';

/**
 * CLEANUP_DATA processor
 * Cleans up expired invitations and old completed jobs.
 */
export async function processCleanup(
  _payload: Record<string, unknown>
): Promise<{ cleanedInvitations: number; cleanedJobs: number }> {
  // Expire old invitations
  const expiredInvitations = await prisma.invitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  // Clean up old completed jobs (older than 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cleanedJobs = await prisma.job.deleteMany({
    where: {
      status: { in: ['COMPLETED', 'FAILED'] },
      updatedAt: { lt: thirtyDaysAgo },
    },
  });

  console.log(
    `🧹 Cleanup: ${expiredInvitations.count} invitations expired, ${cleanedJobs.count} jobs cleaned`
  );

  return {
    cleanedInvitations: expiredInvitations.count,
    cleanedJobs: cleanedJobs.count,
  };
}
