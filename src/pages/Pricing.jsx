// src/pages/Pricing.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { Menu, X, Wallet, LogOut, Check, Zap, Crown, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { createCheckout } from '../services/lemonSqueezy';
import { showError, showSuccess } from '../components/Toast';
import './Pricing.css';

function Pricing() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    loadCurrentPlan();
  }, [user]);

  const loadCurrentPlan = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setCurrentPlan(userDoc.data()?.subscription || 'free');
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (variantId, planName) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (currentPlan === planName) {
      showError('You are already on this plan');
      return;
    }

    setCheckoutLoading(true);

    try {
      const checkoutUrl = await createCheckout({
        variantId,
        userId: user.uid,
        userEmail: user.email
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showError(err.message || 'Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '€0',
      period: 'forever',
      description: 'Core tools to get started',
      icon: Wallet,
      variantId: null,
      features: [
        'Unlimited transactions',
        'Unlimited budgets',
        'Reports & dashboard',
        'Multiple balances',
        'Real-time sync'
      ],
      cta: currentPlan === 'free' ? 'Current plan' : 'Current plan',
      color: '#94a3b8'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '€4.99',
      period: '/month',
      description: 'Scan receipts and use AI',
      icon: Zap,
      featured: true,
      variantId: 1460089,
      features: [
        'Everything in Free',
        'Invoice scanner (OCR)',
        'AI chat assistant',
        'Financial insights',
        '5 invoice scans per day',
        'Priority support'
      ],
      cta: currentPlan === 'pro' ? 'Current plan' : 'Upgrade to Pro',
      color: '#6366f1'
    },
    {
      id: 'fulltime',
      name: 'Premium',
      price: '€9.99',
      period: '/month',
      description: 'Unlimited scans & AI',
      icon: Crown,
      variantId: 1460101,
      features: [
        'Everything in Pro',
        'Unlimited invoice scans',
        'Unlimited AI chat',
        'Savings rules & automation',
        'Advanced analytics',
        'Priority support'
      ],
      cta: currentPlan === 'fulltime' ? 'Current plan' : 'Get Premium',
      color: '#059669'
    }
  ];

  const handleLogout = async () => {
    await auth.signOut();
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/settings', label: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="pricing-page-loading">
        <p>Loading...</p>
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
              Start free. Upgrade when you want invoice scanning, AI, and automation. Secure payments with Lemon Squeezy.
            </p>
          </header>

          <div className="pricing-cards-grid">
            {plans.map(plan => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;
              const isProcessing = checkoutLoading && plan.variantId;

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
                          color: '#ffffff'
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
                      color: isCurrentPlan ? undefined : '#ffffff',
                      borderColor: plan.color
                    }}
                    onClick={() => {
                      if (isCurrentPlan) return;
                      if (plan.id === 'free') {
                        // Downgrade: show message
                        showError('To cancel your subscription, please manage it in your Lemon Squeezy customer portal.');
                      } else if (plan.variantId) {
                        handleSubscribe(plan.variantId, plan.id);
                      }
                    }}
                    disabled={isCurrentPlan || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="spinning" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current plan'
                    ) : (
                      plan.cta
                    )}
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
                Yes. Upgrades go through secure checkout. To cancel or move to Free, manage your subscription in the
                Lemon Squeezy customer portal.
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
                Payments are processed by Lemon Squeezy. After a successful payment, your plan updates automatically.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Pricing;