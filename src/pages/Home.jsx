import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Shield, Target, BarChart3, Sparkles, Check, ArrowRight } from 'lucide-react';
import './Home.css';

const plans = [
  {
    name: 'Free',
    price: '€0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Unlimited transactions & budgets',
      'Reports & dashboard',
      'Multiple balances',
      'No invoice scanning or AI chat'
    ],
    buttonText: 'Start Free',
    buttonVariant: 'outline',
    popular: false
  },
  {
    name: 'Pro',
    price: '€4.99',
    period: 'per month',
    description: 'Invoice scanning + AI',
    features: [
      'Everything in Free',
      '5 invoice scans per day',
      '5 AI chat messages per day',
      'Receipt photo & upload',
      'Financial insights'
    ],
    buttonText: 'Get Pro',
    buttonVariant: 'primary',
    popular: true
  },
  {
    name: 'Pro Plus',
    price: '€9.99',
    period: 'per month',
    description: 'Unlimited power users',
    features: [
      'Everything in Pro',
      'Unlimited invoice scans',
      'Unlimited AI chat',
      'Savings rules & automation',
      'Priority support'
    ],
    buttonText: 'Get Pro Plus',
    buttonVariant: 'primary',
    popular: false
  }
];

const features = [
  { icon: Wallet, title: 'Track Everything', description: 'Log income and expenses with categories to see where your money goes' },
  { icon: BarChart3, title: 'Visual Reports', description: 'Beautiful charts and graphs to understand your spending patterns' },
  { icon: Target, title: 'Set Goals', description: 'Create savings goals and track your progress over time' },
  { icon: TrendingUp, title: 'AI Insights', description: 'Get personalized financial advice from our AI assistant' },
  { icon: Shield, title: 'Secure & Private', description: 'Your data is encrypted and only accessible by you' },
  { icon: Sparkles, title: 'Auto-Save', description: 'Automatically save a percentage of your income to your goals' }
];

function LandingPage({ user }) {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <nav className="landing-nav">
          <div className="nav-brand">
            <Wallet size={28} className="brand-icon" />
            <span>LasFinancias</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            {user ? (
              <Link to="/dashboard" className="btn-dashboard">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-outline">Sign In</Link>
                <Link to="/login" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI-Powered Finance Management</span>
          </div>
          <h1>
            Take Control of Your<br />
            <span className="gradient-text">Financial Future</span>
          </h1>
          <p>
            Track expenses, set goals, and achieve financial freedom with our intuitive
            personal finance management platform powered by AI.
          </p>
          <div className="hero-buttons">
            {!user && (
              <Link to="/login" className="btn-hero-primary">
                Start Free
              </Link>
            )}
            <a href="#features" className="btn-hero-secondary">
              Learn More
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Why Choose LasFinancias?</h2>
          <p>Everything you need to manage your finances in one place</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <feature.icon size={40} className="feature-icon" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the plan that works best for you</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="amount">{plan.price}</span>
                <span className="period">/{plan.period}</span>
              </div>
              <p className="plan-description">{plan.description}</p>
              <ul className="features-list">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={user ? "/dashboard" : "/login"}
                className={`pricing-btn ${plan.buttonVariant === 'primary' ? 'btn-primary' : 'btn-outline'}`}
              >
                {plan.buttonText}
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to take control of your finances?</h2>
          <p>Join thousands of users who are already managing their money smarter.</p>
          {!user ? (
            <Link to="/login" className="btn-cta">
              Get Started Free →
            </Link>
          ) : (
            <Link to="/dashboard" className="btn-cta">
              Go to Dashboard →
            </Link>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Wallet size={24} className="brand-icon" />
            <span>LasFinancias</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-copyright">
            <p>© 2026 LasFinancias. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;