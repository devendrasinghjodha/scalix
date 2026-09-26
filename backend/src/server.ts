import app from './app';
import { config } from './config';
import prisma from './config/database';
import { startWorker } from './jobs/worker';

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start BullMQ worker (in-process for simplicity)
    if (config.env !== 'test' && process.env.RUN_WORKER === 'true') {
      try {
        startWorker();
      } catch (error) {
        console.error('⚠️  Failed to start worker (Redis may not be available):', (error as Error).message);
      }
    }

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Scalix API running on http://localhost:${config.port}`);
      console.log(`📋 Environment: ${config.env}`);
      console.log(`🔗 Health: http://localhost:${config.port}/api/health\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server shut down');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
