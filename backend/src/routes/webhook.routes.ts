import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';

const router = Router();

// POST /api/webhooks/stripe
// Note: raw body parsing is configured in app.ts for this route
router.post(
  '/stripe',
  billingController.handleWebhook.bind(billingController)
);

export default router;
