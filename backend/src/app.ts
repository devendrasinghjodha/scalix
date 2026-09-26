import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import { config } from './config';
import { configurePassport } from './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import memberRoutes from './routes/member.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import auditLogRoutes from './routes/auditLog.routes';
import billingRoutes from './routes/billing.routes';
import webhookRoutes from './routes/webhook.routes';
import healthRoutes from './routes/health.routes';
import invitationRoutes from './routes/invitation.routes';
import teamRoutes from './routes/team.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import usageRoutes from './routes/usage.routes';
import outboundWebhookRoutes from './routes/outboundWebhook.routes';

const app = express();

// ─── Stripe Webhook (must be before express.json) ──────────────
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' })
);

// ─── Global Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Passport
configurePassport();
app.use(passport.initialize());
app.use('/api', apiRateLimiter);

// ─── API Routes ─────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/auth', authRoutes);

// Protected routes with API rate limiting
app.use('/api/organizations', organizationRoutes);
app.use('/api/organizations/:organizationId/members', memberRoutes);
app.use('/api/organizations/:organizationId/projects', projectRoutes);
app.use('/api/organizations/:organizationId/tasks', taskRoutes);
app.use('/api/organizations/:organizationId/audit-logs', auditLogRoutes);
app.use('/api/organizations/:organizationId/billing', billingRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/organizations/:organizationId/teams', teamRoutes);
app.use('/api/organizations/:organizationId/api-keys', apiKeyRoutes);
app.use('/api/organizations/:organizationId/usage', usageRoutes);
app.use('/api/organizations/:organizationId/webhooks', outboundWebhookRoutes);

// ─── 404 Handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ─── Error Handler ──────────────────────────────────────────────
app.use(errorHandler);

export default app;
