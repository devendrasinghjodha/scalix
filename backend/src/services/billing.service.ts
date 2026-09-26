import Stripe from 'stripe';
import prisma from '../config/database';
import { getStripe } from '../config/stripe';
import { config } from '../config';
import { Plan } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class BillingService {
  /**
   * Create a Stripe Checkout session for a plan upgrade.
   */
  async createCheckoutSession(organizationId: string, plan: 'PRO' | 'BUSINESS') {
    const stripe = getStripe();

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Get or create Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organizationId },
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get the price ID
    const priceId =
      plan === 'PRO' ? config.stripe.prices.pro : config.stripe.prices.business;

    if (!priceId) {
      throw new BadRequestError('Price not configured for this plan');
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${config.frontendUrl}/billing?success=true`,
      cancel_url: `${config.frontendUrl}/billing?canceled=true`,
      metadata: {
        organizationId,
        plan,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Get the current subscription for an organization.
   */
  async getSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return subscription;
  }

  /**
   * Create a Stripe billing portal session.
   */
  async createPortalSession(organizationId: string) {
    const stripe = getStripe();

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org || !org.stripeCustomerId) {
      throw new BadRequestError('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${config.frontendUrl}/billing`,
    });

    return { url: session.url };
  }

  /**
   * Cancel subscription.
   */
  async cancelSubscription(organizationId: string) {
    const stripe = getStripe();

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestError('No active subscription found');
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: true },
    });

    return { message: 'Subscription will be cancelled at the end of the billing period' };
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan as Plan;

    if (!organizationId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) {
      console.error(`No organization found for customer: ${customerId}`);
      return;
    }

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      incomplete: 'INCOMPLETE',
      trialing: 'TRIALING',
    };

    const status = statusMap[subscription.status] || 'ACTIVE';

    await prisma.subscription.upsert({
      where: { organizationId: org.id },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status: status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        organizationId: org.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        plan: org.plan,
        status: status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) return;

    await prisma.$transaction([
      prisma.subscription.update({
        where: { organizationId: org.id },
        data: { status: 'CANCELLED' },
      }),
      prisma.organization.update({
        where: { id: org.id },
        data: { plan: 'FREE' },
      }),
    ]);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) return;

    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!org) return;

    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: { status: 'PAST_DUE' },
    });

    console.log(`⚠️ Payment failed for organization: ${org.name} (${org.id})`);
  }
}

export const billingService = new BillingService();
