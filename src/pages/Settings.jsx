import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { useCurrency } from '../context/CurrencyContext';
import { useUserRole } from '../hooks/useUserRole';
import { Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings as SettingsIcon, LogOut, Moon, Sun, DollarSign, RefreshCw,PieChart, PiggyBank , MessageSquare, Eye, EyeOff, Lock, User as UserIcon, Crown, Zap, Shield} from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getSubscriptionDetails } from '../services/subscriptionService';
import './Settings.css';

function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const user = auth.currentUser;
  const { isAdmin } = useUserRole(user?.uid);

  // Password Change Form States
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // User Profile Form States
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [fullName, setFullName] = useState(localStorage.getItem('userFullName') || '');
  const [age, setAge] = useState(localStorage.getItem('userAge') || '');
  const [occupation, setOccupation] = useState(localStorage.getItem('userOccupation') || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Subscription and Admin States
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const currencies = ['USD', 'EUR', 'GBP', 'BRL'];

  // Garantir que o tema começa light se não houver saved
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  }, []);

  // Aplicar o tema quando mudar
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Carregar dados de subscription e verificar se é admin
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!user) return;

      try {
        // Buscar dados de subscription
        const subData = await getSubscriptionDetails(user.uid);
        setSubscription(subData);
      } catch (error) {
        console.error('Erro ao buscar dados de subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscriptionData();
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setPasswordMessage('✅ Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.message === 'Firebase: Error (auth/wrong-password).' 
        ? 'Current password is incorrect' 
        : error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');

    if (!fullName || !age) {
      setProfileError('Name and age are required');
      return;
    }

    if (isNaN(age) || age < 1 || age > 120) {
      setProfileError('Please enter a valid age');
      return;
    }

    setProfileLoading(true);
    try {
      // Save to localStorage (alternative: could use Firestore database)
      localStorage.setItem('userFullName', fullName);
      localStorage.setItem('userAge', age);
      localStorage.setItem('userOccupation', occupation);

      setProfileMessage('✅ Profile updated successfully!');
      setTimeout(() => {
        setShowProfileForm(false);
        setProfileMessage('');
      }, 2000);
    } catch (error) {
      setProfileError('Failed to save profile: ' + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  // Helper para obter informações formatadas de subscription
  const getSubscriptionInfo = () => {
    if (!subscription) return null;

    const raw = String(subscription.plan || 'free').toLowerCase();
    let planName = 'FREE';
    if (raw === 'pro') planName = 'PRO';
    else if (raw === 'fulltime' || raw === 'full-time') planName = 'PREMIUM';

    const badgeColors = {
      free: { bg: '#f1f5f9', text: '#475569' },
      pro: { bg: '#667eea', text: '#fff' },
      fulltime: { bg: '#059669', text: '#fff' },
      'full-time': { bg: '#059669', text: '#fff' }
    };

    const color = badgeColors[raw] || badgeColors.free;

    return {
      plan: planName,
      status: subscription.status || 'active',
      invoiceScansUsed: subscription.invoiceScansUsed || 0,
      invoiceScansLimit: subscription.invoiceScansLimit ?? -1,
      invoiceScansPeriod: subscription.invoiceScansPeriod || 'none',
      aiChatDailyLimit: subscription.aiChatDailyLimit ?? 0,
      aiChatUsedToday: subscription.aiChatUsedToday ?? 0,
      color
    };
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChart, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/savings-rules', icon: PiggyBank, label: 'Auto-Save' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
    ...(isAdmin ? [{ path: '/admin', icon: SettingsIcon, label: 'Admin' }] : [])
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
          {/* PROFILE SECTION - PRIMEIRO */}
          <div className="settings-card">
            <div className="card-header">
              <h2>User Profile</h2>
              <button 
                className="edit-toggle-btn"
                onClick={() => setShowProfileForm(!showProfileForm)}
              >
                {showProfileForm ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {showProfileForm ? (
              <form onSubmit={handleSaveProfile} className="settings-form">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    min="1"
                    max="120"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Enter your occupation (optional)"
                  />
                </div>

                {profileError && <div className="error-message">{profileError}</div>}
                {profileMessage && <div className="success-message">{profileMessage}</div>}

                <button type="submit" className="save-btn" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            ) : (
              <div className="profile-display">
                <p><strong>Name:</strong> {fullName || 'Not set'}</p>
                <p><strong>Age:</strong> {age || 'Not set'}</p>
                <p><strong>Occupation:</strong> {occupation || 'Not set'}</p>
              </div>
            )}
          </div>

          {/* PASSWORD SECTION - SEGUNDO */}
          <div className="settings-card">
            <div className="card-header">
              <h2>Security</h2>
              <button 
                className="edit-toggle-btn"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm ? (
              <form onSubmit={handleChangePassword} className="settings-form">
                <div className="form-group">
                  <label>Current Password *</label>
                  <div className="password-input">
                    <input
                      type={showCurrentPwd ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button 
                      type="button" 
                      className="pwd-toggle"
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    >
                      {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <div className="password-input">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                    <button 
                      type="button" 
                      className="pwd-toggle"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                    >
                      {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {passwordError && <div className="error-message">{passwordError}</div>}
                {passwordMessage && <div className="success-message">{passwordMessage}</div>}

                <button type="submit" className="save-btn" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            ) : (
              <div className="security-display">
                <div className="security-item">
                  <Lock size={20} />
                  <span>Password protected account</span>
                </div>
              </div>
            )}
          </div>

          <div className="settings-card settings-card--plan">
            <div className="plan-card__header">
              <div>
                <p className="plan-card__eyebrow">Billing</p>
                <h2 className="plan-card__title">Your plan</h2>
                <p className="plan-card__subtitle">Usage and upgrades</p>
              </div>
            </div>

            {subscriptionLoading ? (
              <p className="plan-card__loading">Loading plan…</p>
            ) : (
              <div className="plan-card__body">
                {(() => {
                  const planData = getSubscriptionInfo() || {
                    plan: 'FREE',
                    status: 'active',
                    invoiceScansUsed: 0,
                    invoiceScansLimit: -1,
                    invoiceScansPeriod: 'none',
                    aiChatDailyLimit: 0,
                    aiChatUsedToday: 0,
                    color: { bg: '#f1f5f9', text: '#475569' }
                  };
                  const isFree = planData.plan === 'FREE';
                  const isPro = planData.plan === 'PRO';
                  const isPremium = planData.plan === 'PREMIUM';
                  const limit = planData.invoiceScansLimit;
                  const used = planData.invoiceScansUsed;
                  const pct =
                    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                  const aiLimit = planData.aiChatDailyLimit;
                  const aiUsed = planData.aiChatUsedToday;
                  const aiPct =
                    aiLimit > 0 ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0;

                  return (
                    <>
                      <div className="plan-card__row">
                        <div
                          className={`plan-badge plan-badge--${isFree ? 'free' : isPro ? 'pro' : 'full'}`}
                        >
                          {isPro && <Zap size={18} strokeWidth={2.2} />}
                          {isPremium && <Crown size={18} strokeWidth={2.2} />}
                          {isFree && <span className="plan-badge__dot" aria-hidden />}
                          <span>{planData.plan}</span>
                        </div>
                        {!isFree && planData.status === 'active' && (
                          <span className="plan-status plan-status--live">
                            <span className="plan-status__dot" />
                            Active
                          </span>
                        )}
                      </div>

                      <div className="plan-card__panel">
                        {isFree && (
                          <ul className="plan-card__list">
                            <li>Transactions, budgets, and reports</li>
                            <li>No invoice photo / upload — upgrade to Pro or Premium</li>
                            <li>No AI chat — upgrade to Pro or Premium</li>
                          </ul>
                        )}
                        {isPro && (
                          <>
                            <p className="plan-card__line">
                              <strong>Invoice capture:</strong> {used} / {limit === -1 ? '∞' : limit} today (resets
                              daily)
                            </p>
                            {limit > 0 && (
                              <div className="plan-scan__meter" aria-hidden>
                                <div
                                  className="plan-scan__fill"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                            <p className="plan-card__line">
                              <strong>AI chat:</strong> {aiUsed} / {aiLimit} messages today
                            </p>
                            {aiLimit > 0 && (
                              <div className="plan-scan__meter plan-scan__meter--ai" aria-hidden>
                                <div
                                  className="plan-scan__fill plan-scan__fill--ai"
                                  style={{ width: `${aiPct}%` }}
                                />
                              </div>
                            )}
                            <p className="plan-card__muted">Insights on dashboard included</p>
                          </>
                        )}
                        {isPremium && (
                          <ul className="plan-card__list">
                            <li>Unlimited invoice scans</li>
                            <li>Unlimited AI chat</li>
                            <li>Savings rules, automation, and full analytics</li>
                          </ul>
                        )}
                      </div>

                      <div className="plan-card__actions">
                        {isFree && (
                          <Link to="/pricing" className="btn-plan btn-plan--primary">
                            View plans & upgrade
                          </Link>
                        )}
                        {(isPro || isPremium) && (
                          <>
                            <Link to="/pricing" className="btn-plan btn-plan--secondary">
                              Manage billing
                            </Link>
                            {isPro && (
                              <Link to="/pricing" className="btn-plan btn-plan--accent">
                                Upgrade to Premium
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

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
                <UserIcon size={20} />
                <span>Account email</span>
              </div>
              <div className="account-info">
                <p>{user?.email}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="setting-item admin-item">
                <div className="setting-label">
                  <Shield size={20} />
                  <span>Admin</span>
                </div>
                <Link to="/admin" className="btn-plan btn-plan--admin">
                  Open admin dashboard
                </Link>
              </div>
            )}

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