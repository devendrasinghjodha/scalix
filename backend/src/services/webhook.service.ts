import crypto from 'crypto';
import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';

export class WebhookService {
  async create(organizationId: string, url: string, events: string[]) {
    return prisma.webhookEndpoint.create({ data: { organizationId, url, events, secret: `whsec_${crypto.randomBytes(24).toString('hex')}` }, select: { id: true, url: true, events: true, active: true, createdAt: true } });
  }

  async list(organizationId: string) {
    return prisma.webhookEndpoint.findMany({ where: { organizationId }, select: { id: true, url: true, events: true, active: true, createdAt: true, _count: { select: { deliveries: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, organizationId: string, data: { url?: string; events?: string[]; active?: boolean }) {
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    return prisma.webhookEndpoint.update({ where: { id }, data, select: { id: true, url: true, events: true, active: true, updatedAt: true } });
  }

  async delete(id: string, organizationId: string) {
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, organizationId } });
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    await prisma.webhookEndpoint.delete({ where: { id } });
  }

  async deliveries(endpointId: string, organizationId: string) {
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId } });
    if (!endpoint) throw new NotFoundError('Webhook endpoint not found');
    return prisma.webhookDelivery.findMany({ where: { endpointId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}

export const webhookService = new WebhookService();
