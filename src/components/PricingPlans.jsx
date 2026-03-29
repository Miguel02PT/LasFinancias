import React, { useState, useEffect } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getSubscriptionStatus } from '../services/subscriptionService';
import { createCheckoutSession, createBillingPortalSession } from '../services/stripeCheckout';
import { showError } from './Toast';
import './PricingPlans.css';

export function PricingPlans({ userId, onUpgrade }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, [userId]);

  const loadCurrentPlan = async () => {
    const plan = await getSubscriptionStatus(userId);
    setCurrentPlan(plan);
    if (userId) {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        setStripeCustomerId(snap.data()?.stripeCustomerId || null);
      }
    }
  };

  const handlePlanAction = async (plan) => {
    if (plan === currentPlan) {
      showError('You already have this plan');
      return;
    }

    setLoading(true);
    try {
      if (plan === 'free') {
        if (stripeCustomerId) {
          const { url } = await createBillingPortalSession();
          if (url) window.location.href = url;
        } else {
          showError('Contact support to switch to the Free plan.');
        }
        return;
      }

      const { url } = await createCheckoutSession(plan);
      if (url) window.location.href = url;
      onUpgrade?.(plan);
    } catch (e) {
      showError(e.message || 'Could not open checkout');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '€0',
      period: '/month',
      description: 'Perfect to get started',
      features: [
        { name: 'Unlimited transactions', included: true },
        { name: 'Custom categories', included: true },
        { name: 'Core reports', included: true },
        { name: 'Invoice scanner', included: false },
        { name: 'AI chat', included: false },
        { name: 'Auto-save rules', included: false }
      ],
      cta: 'Current',
      disabled: currentPlan === 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '€4.99',
      period: '/month',
      description: 'For power users',
      recommended: true,
      features: [
        { name: 'Everything in Free', included: true },
        { name: '5 invoice scans per day', included: true },
        { name: '5 AI chat messages per day', included: true },
        { name: 'Insights & reports', included: true },
        { name: 'Auto-save rules', included: false },
        { name: 'Priority support', included: false }
      ],
      cta: 'Upgrade to Pro',
      disabled: currentPlan === 'pro'
    },
    {
      id: 'fulltime',
      name: 'Premium',
      price: '€9.99',
      period: '/month',
      description: 'Unlimited automation',
      features: [
        { name: 'Everything in Pro', included: true },
        { name: 'Unlimited invoice scans', included: true },
        { name: 'Unlimited AI chat', included: true },
        { name: 'Advanced auto-save rules', included: true },
        { name: 'Recurring automation', included: true },
        { name: '24/7 priority support', included: true }
      ],
      cta: 'Upgrade to Premium',
      disabled: currentPlan === 'fulltime'
    }
  ];

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Choose your plan</h2>
        <p>Upgrade when you need scanning, AI, and automation</p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`pricing-card ${plan.recommended ? 'recommended' : ''} ${currentPlan === plan.id ? 'active' : ''}`}
          >
            {plan.recommended && (
              <div className="recommended-badge">
                <Zap size={16} /> Most popular
              </div>
            )}

            <div className="plan-header">
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="price-section">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
            </div>

            <div className="features-list">
              {plan.features.map((feature, idx) => (
                <div key={idx} className={`feature ${feature.included ? 'included' : 'excluded'}`}>
                  {feature.included ? (
                    <Check size={18} className="icon-check" />
                  ) : (
                    <X size={18} className="icon-x" />
                  )}
                  <span>{feature.name}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`cta-btn ${currentPlan === plan.id ? 'active' : ''}`}
              onClick={() => handlePlanAction(plan.id)}
              disabled={plan.disabled || loading}
            >
              {currentPlan === plan.id ? 'Your current plan' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <h3>FAQ</h3>
        <div className="faq-items">
          <div className="faq-item">
            <h4>Can I change plans anytime?</h4>
            <p>Yes. Upgrades use checkout; downgrades and cancellations use the Stripe billing portal when applicable.</p>
          </div>
          <div className="faq-item">
            <h4>Is my data synced?</h4>
            <p>Yes. Your transactions, budgets, and goals stay synced regardless of plan.</p>
          </div>
          <div className="faq-item">
            <h4>Is there a trial?</h4>
            <p>You start on Free. Upgrade whenever you are ready.</p>
          </div>
          <div className="faq-item">
            <h4>How do I cancel?</h4>
            <p>Use the Free plan button to open the Stripe portal and manage or cancel your subscription.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
