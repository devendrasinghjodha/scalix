import prisma from '../config/database';

function periodStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export class UsageService {
  async increment(organizationId: string, field: 'apiRequests' | 'jobsExecuted' = 'apiRequests') {
    const period = periodStart();
    return prisma.usageRecord.upsert({
      where: { organizationId_period: { organizationId, period } },
      create: { organizationId, period, [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  }

  async current(organizationId: string) {
    const record = await prisma.usageRecord.findUnique({ where: { organizationId_period: { organizationId, period: periodStart() } } });
    const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
    const limits = subscription?.plan === 'BUSINESS' ? 1000000 : subscription?.plan === 'PRO' ? 500000 : 10000;
    return { period: periodStart(), apiRequests: record?.apiRequests ?? 0, jobsExecuted: record?.jobsExecuted ?? 0, limit: limits };
  }

  async history(organizationId: string) {
    return prisma.usageRecord.findMany({ where: { organizationId }, orderBy: { period: 'desc' }, take: 12 });
  }
}

export const usageService = new UsageService();
