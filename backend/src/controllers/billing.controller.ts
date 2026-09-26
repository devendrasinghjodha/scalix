import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { auditLogService } from '../services/auditLog.service';
import { getStripe } from '../config/stripe';
import { config } from '../config';

export class BillingController {
  /**
   * POST /api/organizations/:organizationId/billing/checkout
   */
  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await billingService.createCheckoutSession(
        req.organizationId!,
        req.body.plan
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organizations/:organizationId/billing/subscription
   */
  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const subscription = await billingService.getSubscription(
        req.organizationId!
      );

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/organizations/:organizationId/billing/portal
   */
  async createPortal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await billingService.createPortalSession(
        req.organizationId!
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/organizations/:organizationId/billing/cancel
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await billingService.cancelSubscription(
        req.organizationId!
      );

      // Audit log
      await auditLogService.log({
        organizationId: req.organizationId!,
        actorId: req.user!.id,
        action: 'SUBSCRIPTION_CANCELLED',
        entity: 'Subscription',
        entityId: req.organizationId!,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/webhooks/stripe
   * Note: This uses raw body for Stripe signature verification.
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const stripe = getStripe();
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body, // raw body
          signature,
          config.stripe.webhookSecret
        );
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      // Process webhook
      await billingService.handleWebhook(event);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
