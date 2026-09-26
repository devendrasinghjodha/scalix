import { Worker, Job } from 'bullmq';
import { getRedisForBullMQ } from '../config/redis';
import prisma from '../config/database';
import { processInvitation } from './processors/invitation.processor';
import { processAuditLog } from './processors/auditLog.processor';
import { processReport } from './processors/report.processor';
import { processSyncSubscription } from './processors/subscription.processor';
import { processCleanup } from './processors/cleanup.processor';

interface JobData {
  jobRecordId: string;
  type: string;
  payload: Record<string, unknown>;
  organizationId?: string;
}

async function processJob(job: Job<JobData>): Promise<unknown> {
  const { jobRecordId, type, payload } = job.data;

  console.log(`🔄 Processing job: ${type} (${jobRecordId})`);

  // Update job status to PROCESSING
  await prisma.job.update({
    where: { id: jobRecordId },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      processedAt: new Date(),
    },
  });

  try {
    let result: unknown;

    switch (type) {
      case 'SEND_INVITATION':
        result = await processInvitation(payload);
        break;
      case 'PROCESS_AUDIT_LOG':
        result = await processAuditLog(payload);
        break;
      case 'GENERATE_REPORT':
        result = await processReport(payload);
        break;
      case 'SYNC_SUBSCRIPTION':
        result = await processSyncSubscription(payload);
        break;
      case 'CLEANUP_DATA':
        result = await processCleanup(payload);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    // Update job status to COMPLETED
    await prisma.job.update({
      where: { id: jobRecordId },
      data: {
        status: 'COMPLETED',
        result: result as any,
        completedAt: new Date(),
      },
    });

    console.log(`✅ Job completed: ${type} (${jobRecordId})`);
    return result;
  } catch (error: any) {
    console.error(`❌ Job failed: ${type} (${jobRecordId})`, error.message);

    // Update job status
    const jobRecord = await prisma.job.findUnique({ where: { id: jobRecordId } });
    const isLastAttempt = (jobRecord?.attempts || 0) >= (jobRecord?.maxAttempts || 3);

    await prisma.job.update({
      where: { id: jobRecordId },
      data: {
        status: isLastAttempt ? 'FAILED' : 'RETRYING',
        error: error.message,
        failedAt: isLastAttempt ? new Date() : undefined,
      },
    });

    throw error; // Re-throw for BullMQ retry mechanism
  }
}

export function startWorker(): Worker {
  const connection = getRedisForBullMQ();

  const worker = new Worker('scalix-jobs', processJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    console.log(`📋 Worker: Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`📋 Worker: Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('🚀 BullMQ Worker started');

  return worker;
}

// Run worker if this file is executed directly
if (require.main === module) {
  startWorker();
}
