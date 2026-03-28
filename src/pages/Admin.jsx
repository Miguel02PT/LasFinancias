import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { Menu, X, Wallet, LayoutDashboard, Receipt, LogOut, Shield, Users, TrendingUp, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import './Admin.css';

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    proUsers: 0,
    fullTimeUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });
  const [users, setUsers] = useState([]);
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Buscar todos os usuários
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = [];
      
      let totalUsers = 0;
      let freeUsers = 0;
      let proUsers = 0;
      let fullTimeUsers = 0;
      let totalRevenue = 0;
      let activeSubscriptions = 0;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const subscription = userData.subscription || 'free';
        
        totalUsers++;

        if (subscription === 'free') freeUsers++;
        if (subscription === 'pro') {
          proUsers++;
          activeSubscriptions++;
          totalRevenue += 4.99; // Pro costs €4.99/month
        }
        if (subscription === 'fulltime' || subscription === 'full-time') {
          fullTimeUsers++;
          activeSubscriptions++;
          totalRevenue += 9.99; // Full-time costs €9.99/month
        }

        usersData.push({
          id: userDoc.id,
          email: userData.email || userDoc.id,
          subscription: subscription,
          createdAt: userData.createdAt,
          invoiceScans: userData.invoiceScans || 0,
          role: userData.role || 'user'
        });
      }

      setAdminStats({
        totalUsers,
        freeUsers,
        proUsers,
        fullTimeUsers,
        totalRevenue,
        activeSubscriptions
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar dados de admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeUser = async (userId, newPlan) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        subscription: newPlan
      });
      
      // Recarregar dados
      loadAdminData();
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao atualizar user:', error);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin'
      });
      
      // Recarregar dados
      loadAdminData();
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao fazer admin:', error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const filteredUsers = users.filter(u => 
    filterPlan === 'all' ? true : u.subscription === filterPlan
  );

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Shield size={28} className="sidebar-logo" />
          <span>Admin Panel</span>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/settings" className="nav-item">
            <Shield size={20} />
            <span>Settings</span>
          </Link>
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
          <h1>🛡️ Admin Dashboard</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="admin-content">
          {/* STATS SECTION */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#667eea' }}>
                <Users size={24} color="white" />
              </div>
              <div className="stat-body">
                <p>Total Users</p>
                <h3>{adminStats.totalUsers}</h3>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#f0f0f0' }}>
                <Users size={24} color="#666" />
              </div>
              <div className="stat-body">
                <p>Free Users</p>
                <h3>{adminStats.freeUsers}</h3>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#667eea' }}>
                <TrendingUp size={24} color="white" />
              </div>
              <div className="stat-body">
                <p>Pro Users</p>
                <h3>{adminStats.proUsers}</h3>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#22c55e' }}>
                <CheckCircle size={24} color="white" />
              </div>
              <div className="stat-body">
                <p>Full-Time Users</p>
                <h3>{adminStats.fullTimeUsers}</h3>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#f59e0b' }}>
                <DollarSign size={24} color="white" />
              </div>
              <div className="stat-body">
                <p>Monthly Revenue</p>
                <h3>€{adminStats.totalRevenue.toFixed(2)}</h3>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: '#06b6d4' }}>
                <AlertCircle size={24} color="white" />
              </div>
              <div className="stat-body">
                <p>Active Subscriptions</p>
                <h3>{adminStats.activeSubscriptions}</h3>
              </div>
            </div>
          </div>

          {/* USERS SECTION */}
          <div className="admin-users-section">
            <div className="section-header">
              <h2>👥 Users Management</h2>
              <div className="filter-buttons">
                <button 
                  className={`filter-btn ${filterPlan === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterPlan('all')}
                >
                  All ({users.length})
                </button>
                <button 
                  className={`filter-btn ${filterPlan === 'free' ? 'active' : ''}`}
                  onClick={() => setFilterPlan('free')}
                >
                  Free ({adminStats.freeUsers})
                </button>
                <button 
                  className={`filter-btn ${filterPlan === 'pro' ? 'active' : ''}`}
                  onClick={() => setFilterPlan('pro')}
                >
                  Pro ({adminStats.proUsers})
                </button>
                <button 
                  className={`filter-btn ${filterPlan === 'fulltime' ? 'active' : ''}`}
                  onClick={() => setFilterPlan('fulltime')}
                >
                  Full-Time ({adminStats.fullTimeUsers})
                </button>
              </div>
            </div>

            {loading ? (
              <p>Loading users...</p>
            ) : (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Role</th>
                      <th>Invoice Scans</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          <span className={`plan-badge ${u.subscription}`}>
                            {u.subscription?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`role-badge ${u.role}`}>
                            {u.role?.toUpperCase()}
                          </span>
                        </td>
                        <td>{u.invoiceScans || 0}</td>
                        <td>
                          <button 
                            className="action-btn"
                            onClick={() => setSelectedUser(u)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* USER MODAL */}
          {selectedUser && (
            <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Edit User: {selectedUser.email}</h3>
                  <button className="close-modal" onClick={() => setSelectedUser(null)}>
                    <X size={24} />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="form-group">
                    <label>Change Subscription Plan</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {['free', 'pro', 'fulltime'].map(plan => (
                        <button
                          key={plan}
                          className={`plan-select-btn ${selectedUser.subscription === plan ? 'active' : ''}`}
                          onClick={() => handleUpgradeUser(selectedUser.id, plan)}
                        >
                          {plan.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>User Role</label>
                    <div style={{ marginTop: '0.5rem' }}>
                      {selectedUser.role !== 'admin' ? (
                        <button 
                          className="make-admin-btn"
                          onClick={() => handleMakeAdmin(selectedUser.id)}
                        >
                          ✓ Make Admin
                        </button>
                      ) : (
                        <span style={{ color: '#22c55e', fontWeight: '600' }}>👑 Admin User</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Current Status</label>
                    <p style={{ marginTop: '0.5rem', color: '#666' }}>
                      Plan: <strong>{selectedUser.subscription?.toUpperCase()}</strong><br />
                      Role: <strong>{selectedUser.role?.toUpperCase() || 'USER'}</strong><br />
                      Invoice Scans: <strong>{selectedUser.invoiceScans || 0}</strong>
                    </p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    className="modal-close-btn"
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;
