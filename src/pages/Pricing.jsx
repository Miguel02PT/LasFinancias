import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { Menu, X, Wallet, LogOut, Check, Zap, Crown } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { createCheckoutSession, createBillingPortalSession } from '../services/stripeCheckout';
import './Pricing.css';

function Pricing() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const user = auth.currentUser;

  useEffect(() => {
    loadCurrentPlan();
  }, [user]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('checkout') === 'success') {
      setMessage('Payment received. Your plan will update in a few seconds.');
      window.history.replaceState({}, '', '/pricing');
    }
    if (p.get('checkout') === 'cancel') {
      setError('Checkout was cancelled.');
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  const loadCurrentPlan = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setCurrentPlan(d?.subscription || 'free');
        setStripeCustomerId(d?.stripeCustomerId || null);
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlan) => {
    if (newPlan === currentPlan) {
      setError('You are already on this plan.');
      return;
    }

    setUpgrading(true);
    setError('');
    setMessage('');

    try {
      const { url } = await createCheckoutSession(newPlan);
      if (url) window.location.href = url;
    } catch (err) {
      setError(err.message || 'Could not start checkout.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    setUpgrading(true);
    setError('');
    setMessage('');

    try {
      if (stripeCustomerId) {
        const { url } = await createBillingPortalSession();
        if (url) window.location.href = url;
      } else {
        setError(
          'To cancel or switch to Free, you need an active Stripe subscription. Contact support if you need help.'
        );
      }
    } catch (err) {
      setError(err.message || 'Could not open the billing portal.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '€0',
      period: 'forever',
      description: 'Core tools to get started',
      icon: Wallet,
      features: [
        'Unlimited transactions',
        'Unlimited budgets',
        'Reports & dashboard',
        'Multiple balances',
        'Real-time sync'
      ],
      cta: 'Current plan',
      color: '#94a3b8',
      textColor: '#0f172a'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '€4.99',
      period: '/month',
      description: 'Scan receipts and use AI',
      icon: Zap,
      featured: true,
      features: [
        'Everything in Free',
        'Invoice scanner (OCR)',
        'AI chat assistant',
        'Financial insights',
        '100 invoice scans / month',
        'Priority support'
      ],
      cta: 'Upgrade to Pro',
      color: '#6366f1',
      textColor: '#ffffff'
    },
    {
      id: 'fulltime',
      name: 'Premium',
      price: '€9.99',
      period: '/month',
      description: 'Unlimited scans & AI',
      icon: Crown,
      features: [
        'Everything in Pro',
        'Unlimited invoice scans',
        'Unlimited AI chat',
        'Savings rules & automation',
        'Advanced analytics',
        'Priority support'
      ],
      cta: 'Get Premium',
      color: '#059669',
      textColor: '#ffffff'
    }
  ];

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/settings', label: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="pricing-page-loading">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Wallet size={28} className="sidebar-logo" />
          <span>LasFinancias</span>
          <button type="button" className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link to={item.path} key={item.path} className="nav-item">
              {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" onClick={handleLogout} className="logout-sidebar">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} role="presentation" />
      )}

      <main className="main-content">
        <header className="main-header">
          <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>Pricing</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="pricing-content">
          <header className="pricing-hero">
            <span className="pricing-hero__eyebrow">Plans</span>
            <h2 className="pricing-hero__title">Pick the plan that fits you</h2>
            <p className="pricing-hero__lead">
              Start free. Upgrade when you want invoice scanning, AI, and automation. Secure payments with Stripe.
            </p>
          </header>

          {message && <div className="success-banner">{message}</div>}
          {error && <div className="error-banner">{error}</div>}

          <div className="pricing-cards-grid">
            {plans.map(plan => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${isCurrentPlan ? 'active' : ''} ${plan.featured ? 'pricing-card--featured' : ''}`}
                >
                  {plan.featured && (
                    <span className="pricing-card__ribbon">Most popular</span>
                  )}
                  <div className="plan-header">
                    <div className="plan-header__top">
                      <div
                        className="plan-header__icon"
                        style={{
                          background: plan.color,
                          color: plan.textColor
                        }}
                      >
                        <Icon size={24} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="plan-header__name">{plan.name}</h3>
                        <p className="plan-header__desc">{plan.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="plan-pricing">
                    <span className="plan-pricing__amount">{plan.price}</span>
                    <span className="plan-pricing__period">{plan.period}</span>
                  </div>

                  <ul className="plan-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="feature">
                        <Check size={18} className="feature__check" strokeWidth={2.5} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`plan-button ${isCurrentPlan ? 'current' : ''}`}
                    style={{
                      background: isCurrentPlan ? undefined : plan.color,
                      color: isCurrentPlan ? undefined : plan.textColor,
                      borderColor: plan.color
                    }}
                    onClick={() => {
                      if (isCurrentPlan) return;
                      if (plan.id === 'free') {
                        handleDowngrade();
                      } else {
                        handleUpgrade(plan.id);
                      }
                    }}
                    disabled={upgrading}
                  >
                    {upgrading ? 'Processing…' : isCurrentPlan ? 'Current plan' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          <section className="pricing-faq" aria-labelledby="faq-heading">
            <h3 id="faq-heading">FAQ</h3>

            <div className="faq-item">
              <h4>Can I change plans anytime?</h4>
              <p>
                Yes. Upgrades go through secure checkout. To cancel or move to Free, use the Free plan button to open
                the Stripe billing portal (when you have an active subscription).
              </p>
            </div>

            <div className="faq-item">
              <h4>What is the invoice scanner?</h4>
              <p>
                Pro and Premium can capture receipts and draft transactions using OCR and AI. Pro allows 5 scans per
                day; Premium is unlimited. Free cannot use invoice photo or upload.
              </p>
            </div>

            <div className="faq-item">
              <h4>Is there a transaction limit?</h4>
              <p>No. All plans support unlimited manual transactions. Scan limits apply only to the invoice scanner.</p>
            </div>

            <div className="faq-item">
              <h4>How does billing work?</h4>
              <p>
                Payments are processed by Stripe. After a successful payment, your plan updates automatically. Manage
                cards and invoices in the billing portal.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Pricing;
