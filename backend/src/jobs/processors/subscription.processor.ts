import prisma from '../../config/database';
import { getStripe } from '../../config/stripe';

/**
 * SYNC_SUBSCRIPTION processor
 * Syncs subscription data from Stripe.
 */
export async function processSyncSubscription(
  payload: Record<string, unknown>
): Promise<{ synced: boolean }> {
  const { organizationId } = payload;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId as string },
    include: { subscription: true },
  });

  if (!org || !org.stripeCustomerId) {
    console.log(`No Stripe customer for org: ${organizationId}`);
    return { synced: false };
  }

  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: org.stripeCustomerId,
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];

      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        past_due: 'PAST_DUE',
        canceled: 'CANCELLED',
        incomplete: 'INCOMPLETE',
        trialing: 'TRIALING',
      };

      await prisma.subscription.upsert({
        where: { organizationId: org.id },
        update: {
          stripeSubscriptionId: sub.id,
          status: (statusMap[sub.status] || 'ACTIVE') as any,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        create: {
          organizationId: org.id,
          stripeSubscriptionId: sub.id,
          plan: org.plan,
          status: (statusMap[sub.status] || 'ACTIVE') as any,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
    }

    console.log(`🔄 Subscription synced for org: ${org.name}`);
    return { synced: true };
  } catch (error: any) {
    console.error(`Failed to sync subscription for org ${organizationId}:`, error.message);
    throw error;
  }
}
