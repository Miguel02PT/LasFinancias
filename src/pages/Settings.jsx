import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useCurrency } from '../context/CurrencyContext';
import { Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings as SettingsIcon, LogOut, Moon, Sun, DollarSign, RefreshCw } from 'lucide-react';
import './Settings.css';
import { PieChart } from 'lucide-react';

function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();  // ← usar o contexto
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const user = auth.currentUser;

  const currencies = ['USD', 'EUR', 'GBP', 'BRL'];

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    await auth.signOut();
  };

  const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: Receipt, label: 'Transactions' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/budgets', icon: Target, label: 'Budgets' },
  { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Wallet size={28} className="sidebar-logo" />
          <span>LasFinancias</span>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/settings' ? 'active' : ''}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="logout-sidebar">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <main className="main-content">
        <header className="main-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>Settings</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="settings-content">
          <div className="settings-card">
            <h2>Preferences</h2>
            
            <div className="setting-item">
              <div className="setting-label">
                <DollarSign size={20} />
                <span>Currency</span>
              </div>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {currencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                <span>Theme</span>
              </div>
              <div className="theme-toggle">
                <button 
                  className={theme === 'light' ? 'active' : ''} 
                  onClick={() => setTheme('light')}
                >
                  <Sun size={16} /> Light
                </button>
                <button 
                  className={theme === 'dark' ? 'active' : ''} 
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>Account</span>
              </div>
              <div className="account-info">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User ID:</strong> {user?.uid?.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>About</span>
              </div>
              <div className="about-info">
                <p><strong>LasFinancias</strong> v1.0.0</p>
                <p>Take control of your financial future</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;