'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { billingApi } from '@/lib/api';
import { CreditCard, Check, Zap, Building2 } from 'lucide-react';

const plans = [
  {
    name: 'FREE',
    price: '₹0',
    period: 'forever',
    features: ['5 projects', '10 members', 'Basic task management', 'Community support'],
    icon: Building2,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'PRO',
    price: '₹999',
    period: '/month',
    features: ['Unlimited projects', '50 members', 'Advanced analytics', 'Priority support', 'Custom roles'],
    icon: Zap,
    gradient: 'from-blue-500 to-purple-500',
    popular: true,
  },
  {
    name: 'BUSINESS',
    price: '₹2,999',
    period: '/month',
    features: ['Everything in Pro', 'Unlimited members', 'SSO integration', 'Audit log export', 'Dedicated support', 'Custom SLA'],
    icon: CreditCard,
    gradient: 'from-purple-500 to-pink-500',
  },
];

export default function BillingPage() {
  const { currentOrg } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) loadSubscription();
  }, [currentOrg]);

  const loadSubscription = async () => {
    if (!currentOrg) return;
    try {
      const res = await billingApi.getSubscription(currentOrg.id);
      setSubscription(res.data.data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (plan: string) => {
    if (!currentOrg || plan === 'FREE') return;
    try {
      const res = await billingApi.createCheckout(currentOrg.id, { plan });
      if (res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create checkout');
    }
  };

  const handleCancel = async () => {
    if (!currentOrg || !confirm('Cancel your subscription?')) return;
    try {
      await billingApi.cancel(currentOrg.id);
      loadSubscription();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to cancel');
    }
  };

  const handlePortal = async () => {
    if (!currentOrg) return;
    try {
      const res = await billingApi.createPortal(currentOrg.id);
      if (res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to open portal');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your subscription plan</p>
        </div>
        {subscription?.stripeSubscriptionId && (
          <button onClick={handlePortal} className="btn-secondary">
            Manage Billing →
          </button>
        )}
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Current Plan</div>
              <div className="text-xl font-bold gradient-text">{subscription.plan}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Status: <span className={subscription.status === 'ACTIVE' ? 'badge-green' : 'badge-orange'}>{subscription.status}</span>
              </div>
            </div>
            {subscription.plan !== 'FREE' && (
              <button onClick={handleCancel} className="btn-danger text-sm">
                Cancel Subscription
              </button>
            )}
          </div>
          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--accent-orange)' }}>
              ⚠️ Your subscription will end at the current billing period.
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.name;
          const Icon = plan.icon;

          return (
            <div
              key={plan.name}
              className={`card relative ${plan.popular ? 'animate-pulse-glow' : ''}`}
              style={plan.popular ? { borderColor: 'var(--accent-blue)' } : {}}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--gradient-1)', color: 'white' }}>
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ background: plan.popular ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)' }}>
                  <Icon size={24} style={{ color: plan.popular ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="text-3xl font-bold mt-2">
                  {plan.price}
                  <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check size={16} style={{ color: 'var(--accent-green)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.name)}
                disabled={isCurrent || plan.name === 'FREE'}
                className={`w-full ${isCurrent ? 'btn-secondary' : plan.popular ? 'btn-primary' : 'btn-secondary'} disabled:opacity-50`}
              >
                {isCurrent ? 'Current Plan' : plan.name === 'FREE' ? 'Free' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        All payments are processed in Stripe Test Mode. No real charges will be made.
      </p>
    </div>
  );
}
