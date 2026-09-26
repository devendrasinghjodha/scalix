import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createCheckoutSchema } from '../validators/schemas';

const router = Router({ mergeParams: true });

router.use(authenticate);

// POST /api/organizations/:organizationId/billing/checkout
router.post(
  '/checkout',
  requireRole('OWNER'),
  validate(createCheckoutSchema),
  billingController.createCheckout.bind(billingController)
);

// GET /api/organizations/:organizationId/billing/subscription
router.get(
  '/subscription',
  requireRole(),
  billingController.getSubscription.bind(billingController)
);

// POST /api/organizations/:organizationId/billing/portal
router.post(
  '/portal',
  requireRole('OWNER'),
  billingController.createPortal.bind(billingController)
);

// POST /api/organizations/:organizationId/billing/cancel
router.post(
  '/cancel',
  requireRole('OWNER'),
  billingController.cancel.bind(billingController)
);

export default router;
