import { Queue, JobType as BullJobType } from 'bullmq';
import { getRedisForBullMQ } from '../config/redis';
import prisma from '../config/database';
import { JobType } from '@prisma/client';
import { Prisma } from '@prisma/client';

let queue: Queue | null = null;

export function getQueue(): Queue {
  if (!queue) {
    const connection = getRedisForBullMQ();
    queue = new Queue('scalix-jobs', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start at 1 second
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 200, // Keep last 200 failed jobs
        },
      },
    });

    queue.on('error', (error) => {
      console.error('Queue error:', error);
    });
  }

  return queue;
}

/**
 * Add a job to the queue with idempotency.
 */
export async function addJob(
  type: JobType,
  payload: Record<string, unknown>,
  organizationId?: string
): Promise<string> {
  const q = getQueue();

  // Create job record in database for tracking
  const jobRecord = await prisma.job.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      organizationId,
    },
  });

  // Add to BullMQ queue
  await q.add(type, {
    jobRecordId: jobRecord.id,
    type,
    payload,
    organizationId,
  }, {
    jobId: jobRecord.id, // Use DB record ID for idempotency
  });

  return jobRecord.id;
}

/**
 * Get job status.
 */
export async function getJobStatus(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  return job;
}

export async function closeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
