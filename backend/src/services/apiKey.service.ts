import crypto from 'crypto';
import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';

function hashKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export class ApiKeyService {
  async create(organizationId: string, createdById: string, name: string, expiresAt?: Date) {
    const secret = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const key = await prisma.apiKey.create({
      data: {
        organizationId,
        createdById,
        name,
        prefix: secret.slice(0, 14),
        keyHash: hashKey(secret),
        expiresAt,
      },
      select: { id: true, name: true, prefix: true, expiresAt: true, createdAt: true },
    });
    return { ...key, secret };
  }

  async list(organizationId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, organizationId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, organizationId, revokedAt: null } });
    if (!key) throw new NotFoundError('API key not found');
    return prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}

export const apiKeyService = new ApiKeyService();
