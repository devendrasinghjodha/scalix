import Stripe from 'stripe';
import { config } from './index';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripe;
}

export default getStripe;
