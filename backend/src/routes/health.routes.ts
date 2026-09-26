import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { getRedis } from '../config/redis';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    (health.services as any).database = 'connected';
  } catch (error) {
    (health.services as any).database = 'disconnected';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redis = getRedis();
    await redis.ping();
    (health.services as any).redis = 'connected';
  } catch (error) {
    (health.services as any).redis = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
