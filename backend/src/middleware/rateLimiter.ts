import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { config } from '../config';
import { TooManyRequestsError } from '../utils/errors';

/**
 * Redis-based rate limiter using sliding window.
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - windowMs;

  const multi = redis.multi();
  // Remove old entries outside the window
  multi.zremrangebyscore(key, 0, windowStart);
  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`);
  // Count requests in window
  multi.zcard(key);
  // Set expiry on the key
  multi.pexpire(key, windowMs);

  const results = await multi.exec();
  const requestCount = (results?.[2]?.[1] as number) || 0;

  return {
    allowed: requestCount <= maxRequests,
    remaining: Math.max(0, maxRequests - requestCount),
    resetAt: now + windowMs,
  };
}

/**
 * Rate limiter for login attempts: 5 per minute per IP.
 */
export async function loginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:login:${ip}`;

    const result = await checkRateLimit(
      key,
      config.rateLimit.login.max,
      config.rateLimit.login.windowMs
    );

    res.set('X-RateLimit-Limit', config.rateLimit.login.max.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

    if (!result.allowed) {
      throw new TooManyRequestsError(
        'Too many login attempts. Please try again later.'
      );
    }

    next();
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      next(error);
    } else {
      // If Redis is down, allow the request to proceed
      console.error('Rate limiter error:', error);
      next();
    }
  }
}

/**
 * Rate limiter for API requests: 100 per minute per user.
 */
export async function apiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id || req.ip || 'anonymous';
    const key = `rate_limit:api:${userId}`;

    const result = await checkRateLimit(
      key,
      config.rateLimit.api.max,
      config.rateLimit.api.windowMs
    );

    res.set('X-RateLimit-Limit', config.rateLimit.api.max.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

    if (!result.allowed) {
      throw new TooManyRequestsError(
        'Too many requests. Please slow down.'
      );
    }

    next();
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      next(error);
    } else {
      console.error('Rate limiter error:', error);
      next();
    }
  }
}
