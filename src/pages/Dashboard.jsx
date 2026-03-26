import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Target, 
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  Menu,
  X,
  Trash2,
  PlusCircle
} from 'lucide-react';
import './Dashboard.css';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import AIInsights from '../components/AIInsights';

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState(0);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newBalanceName, setNewBalanceName] = useState('');
  const [newBalanceAmount, setNewBalanceAmount] = useState('');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const user = auth.currentUser;
  
  const { balances, addBalance, deleteBalance, getTotalWithBalances } = useBalances();
  const { formatCurrency } = useCurrency();
  const location = useLocation();

  useEffect(() => {
    if (user?.uid) {
      const savedBalance = localStorage.getItem(`initialBalance_${user.uid}`);
      if (savedBalance) {
        setInitialBalance(parseFloat(savedBalance));
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user, initialBalance]);

  const loadTransactions = async () => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    let balance = initialBalance;
    let income = 0;
    let expense = 0;
    const transactionsData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactionsData.push({ id: doc.id, ...data });
      if (data.type === 'income') {
        balance += data.amount;
        income += data.amount;
      } else {
        balance -= data.amount;
        expense += data.amount;
      }
    });
    
    setTransactions(transactionsData);
    setTotalBalance(balance);
    setTotalIncome(income);
    setTotalExpense(expense);
  };

  const setInitialBalanceHandler = () => {
    const amount = parseFloat(prompt('Enter your current total balance:', initialBalance || '0'));
    if (!isNaN(amount) && amount !== null) {
      setInitialBalance(amount);
      if (user?.uid) {
        localStorage.setItem(`initialBalance_${user.uid}`, amount);
      }
      loadTransactions();
    }
  };

  const handleAddBalance = async (e) => {
    e.preventDefault();
    if (!newBalanceName || !newBalanceAmount) return;
    await addBalance(newBalanceName, parseFloat(newBalanceAmount), includeInTotal);
    setNewBalanceName('');
    setNewBalanceAmount('');
    setShowBalanceModal(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const transactionTotal = totalBalance;
  const finalTotal = getTotalWithBalances(transactionTotal);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/settings', icon: Settings, label: 'Settings' },
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
            <Link 
              to={item.path} 
              key={item.path} 
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
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
          <h1>Dashboard</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="dashboard-content">
          <AIInsights transactions={transactions} />
          
          {/* Stats Cards with Balances */}
          <div className="stats-grid">
            <div className="stat-card balance">
              <Wallet size={24} />
              <h3>Total Balance</h3>
              <div className={`stat-value ${finalTotal >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(finalTotal)}
              </div>
            </div>
            <div className="stat-card income">
              <TrendingUp size={24} />
              <h3>Income</h3>
              <div className="stat-value positive">{formatCurrency(totalIncome)}</div>
            </div>
            <div className="stat-card expense">
              <TrendingDown size={24} />
              <h3>Expenses</h3>
              <div className="stat-value negative">{formatCurrency(totalExpense)}</div>
            </div>
          </div>

          {/* Custom Balances Section */}
          {balances.length > 0 && (
            <div className="quick-actions">
              <h3>Your Balances</h3>
              <div className="balances-list">
                {balances.map(balance => (
                  <div key={balance.id} className="balance-item">
                    <div className="balance-info">
                      <span className="balance-name">{balance.name}</span>
                      <span className="balance-amount">{formatCurrency(balance.amount)}</span>
                      {balance.includeInTotal && (
                        <span className="included-badge">Included in Total</span>
                      )}
                    </div>
                    <button onClick={() => deleteBalance(balance.id)} className="delete-balance-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Balance Modal */}
          {showBalanceModal && (
            <div className="modal-overlay" onClick={() => setShowBalanceModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Create New Balance</h3>
                <form onSubmit={handleAddBalance}>
                  <input
                    type="text"
                    placeholder="Name (e.g., Savings, Travel, Emergency)"
                    value={newBalanceName}
                    onChange={(e) => setNewBalanceName(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newBalanceAmount}
                    onChange={(e) => setNewBalanceAmount(e.target.value)}
                    required
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeInTotal}
                      onChange={(e) => setIncludeInTotal(e.target.checked)}
                    />
                    Include in Total Balance
                  </label>
                  <div className="modal-buttons">
                    <button type="submit">Create</button>
                    <button type="button" onClick={() => setShowBalanceModal(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Balance Actions */}
          <div className="quick-actions">
            <h3>Balance Actions</h3>
            <div className="action-buttons balance-actions">
              <button onClick={setInitialBalanceHandler} className="balance-btn">
                <Wallet size={20} />
                {initialBalance > 0 ? `Update Balance (${formatCurrency(initialBalance)})` : 'Set Initial Balance'}
              </button>
              <button onClick={() => setShowBalanceModal(true)} className="balance-btn new-balance-btn">
                <PlusCircle size={20} />
                Create New Balance
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <Link to="/transactions" className="action-btn">
                <Receipt size={20} />
                Add Transaction
              </Link>
              <Link to="/reports" className="action-btn">
                <BarChart3 size={20} />
                View Reports
              </Link>
            </div>
          </div>

          {/* Recent Activity Preview */}
          <div className="recent-preview">
            <h3>Recent Activity</h3>
            <p className="preview-text">
              {totalBalance === initialBalance && totalIncome === 0 && totalExpense === 0 ? 
                'No transactions yet. Add your first one!' : 
                `You have ${totalIncome > 0 ? formatCurrency(totalIncome) + ' income' : 'no income'} and ${totalExpense > 0 ? formatCurrency(totalExpense) + ' expenses' : 'no expenses'} this period.`
              }
            </p>
            <Link to="/transactions" className="view-all">View All Transactions →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;