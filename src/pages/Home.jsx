import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Shield, BarChart3, Target } from 'lucide-react';
import './Home.css';
import { PieChart } from 'lucide-react';

function Home({ user }) {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <nav className="navbar">
          <div className="nav-brand">
            <Wallet size={28} className="brand-icon" />
            <span>LasFinancias</span>
          </div>
          <div className="nav-links">
            {user ? (
              <Link to="/dashboard" className="btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-outline">Sign In</Link>
                <Link to="/login" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </nav>
        
        <div className="hero-content">
          <h1>
            Take Control of Your<br />
            <span className="gradient-text">Financial Future</span>
          </h1>
          <p>
            Track expenses, set goals, and achieve financial freedom with our intuitive
            personal finance management platform.
          </p>
          {!user && (
            <Link to="/login" className="btn-hero">Start Free →</Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose LasFinancias?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <TrendingUp size={40} className="feature-icon" />
            <h3>Track Everything</h3>
            <p>Log income and expenses with categories to see where your money goes.</p>
          </div>
          <div className="feature-card">
            <BarChart3 size={40} className="feature-icon" />
            <h3>Visual Reports</h3>
            <p>Beautiful charts and graphs to understand your spending patterns.</p>
          </div>
          <div className="feature-card">
            <Target size={40} className="feature-icon" />
            <h3>Set Goals</h3>
            <p>Create savings goals and track your progress over time.</p>
          </div>
          <div className="feature-card">
            <Shield size={40} className="feature-icon" />
            <h3>Secure & Private</h3>
            <p>Your data is encrypted and only accessible by you.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat">
            <h3>10K+</h3>
            <p>Active Users</p>
          </div>
          <div className="stat">
            <h3>$2M+</h3>
            <p>Money Tracked</p>
          </div>
          <div className="stat">
            <h3>98%</h3>
            <p>Satisfaction Rate</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2024 LasFinancias. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;