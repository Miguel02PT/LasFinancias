import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { useCurrency } from '../context/CurrencyContext';
import { Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings as SettingsIcon, LogOut, Moon, Sun, DollarSign, RefreshCw,PieChart, PiggyBank , MessageSquare, Eye, EyeOff, Lock, User as UserIcon, Crown, Zap, Shield} from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getSubscriptionDetails } from '../services/subscriptionService';
import { doc, getDoc } from 'firebase/firestore';
import './Settings.css';

function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const user = auth.currentUser;

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
  const [isAdmin, setIsAdmin] = useState(false);

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

        // Verificar se é admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data()?.role === 'admin' || false);
        }
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

    const planName = subscription.plan?.toUpperCase() || 'FREE';
    const badgeColors = {
      free: { bg: '#f0f0f0', text: '#666', icon: null },
      pro: { bg: '#667eea', text: 'white', icon: '⚡' },
      fulltime: { bg: '#22c55e', text: 'white', icon: '👑' },
      'full-time': { bg: '#22c55e', text: 'white', icon: '👑' }
    };

    const color = badgeColors[subscription.plan?.toLowerCase()] || badgeColors.free;
    
    return {
      plan: planName,
      status: subscription.status || 'active',
      invoiceScansUsed: subscription.invoiceScansUsed || 0,
      invoiceScansLimit: subscription.invoiceScansLimit || -1,
      color: color
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

          {/* PREFERENCES SECTION - TERCEIRO */}
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
                <span>Account Email</span>
              </div>
              <div className="account-info">
                <p>{user?.email}</p>
              </div>
            </div>

            {/* SUBSCRIPTION SECTION */}
            {subscriptionLoading ? (
              <div className="setting-item">
                <div className="setting-label">
                  <Zap size={20} />
                  <span>Premium Plan</span>
                </div>
                <p style={{ color: '#999', fontSize: '0.9rem' }}>Loading...</p>
              </div>
            ) : getSubscriptionInfo() ? (
              <div className="setting-item subscription-item">
                <div className="setting-label">
                  <Crown size={20} />
                  <span>Premium Plan</span>
                </div>
                <div className="subscription-info">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      background: getSubscriptionInfo().color.bg,
                      color: getSubscriptionInfo().color.text,
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {getSubscriptionInfo().plan === 'PRO' && <Zap size={16} />}
                      {getSubscriptionInfo().plan === 'FULL-TIME' && (getSubscriptionInfo().plan === 'FULLTIME' ? <Crown size={16} /> : <Crown size={16} />)}
                      {getSubscriptionInfo().plan}
                    </div>
                    {getSubscriptionInfo().plan !== 'FREE' && getSubscriptionInfo().status === 'active' && (
                      <span style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: '500' }}>✓ Active</span>
                    )}
                  </div>
                  
                  {getSubscriptionInfo().plan === 'PRO' && (
                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                      📊 Invoice Scans: {getSubscriptionInfo().invoiceScansUsed}/{getSubscriptionInfo().invoiceScansLimit}
                    </p>
                  )}

                  {getSubscriptionInfo().plan === 'FREE' && (
                    <Link to="/pricing" className="upgrade-btn" style={{
                      display: 'inline-block',
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'transform 0.2s'
                    }}>
                      🚀 Upgrade to PRO
                    </Link>
                  )}

                  {(getSubscriptionInfo().plan === 'PRO' || getSubscriptionInfo().plan === 'FULLTIME' || getSubscriptionInfo().plan === 'FULL-TIME') && (
                    <Link to="/pricing" className="upgrade-btn" style={{
                      display: 'inline-block',
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#f0f0f0',
                      color: '#333',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'transform 0.2s'
                    }}>
                      💳 Manage Subscription
                    </Link>
                  )}
                </div>
              </div>
            ) : null}

            {/* ADMIN SECTION */}
            {isAdmin && (
              <div className="setting-item admin-item">
                <div className="setting-label">
                  <Shield size={20} />
                  <span>Admin Tools</span>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <Link to="/admin" className="admin-btn" style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'transform 0.2s'
                  }}>
                    🛡️ Admin Dashboard
                  </Link>
                </div>
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