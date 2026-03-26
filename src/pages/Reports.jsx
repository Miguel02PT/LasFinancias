import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  Calendar, Download
} from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import './Reports.css';

function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const user = auth.currentUser;

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  const { formatCurrency } = useCurrency();
  
  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  useEffect(() => {
    if (transactions.length > 0) {
      prepareMonthlyData();
    }
  }, [transactions]);

  const loadTransactions = async () => {
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const transactionsData = [];
    querySnapshot.forEach((doc) => {
      transactionsData.push({ id: doc.id, ...doc.data() });
    });
    setTransactions(transactionsData);
  };

  const prepareMonthlyData = () => {
    const monthlyMap = new Map();
    
    transactions.forEach(t => {
      const date = t.date?.toDate();
      if (date) {
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthlyMap.has(monthYear)) {
          monthlyMap.set(monthYear, { month: monthYear, income: 0, expense: 0 });
        }
        const data = monthlyMap.get(monthYear);
        if (t.type === 'income') {
          data.income += t.amount;
        } else {
          data.expense += t.amount;
        }
      }
    });
    
    const sortedData = Array.from(monthlyMap.values()).reverse();
    setMonthlyData(sortedData);
  };

  const categoryData = transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
    }
    return acc;
  }, []);


  const handleExport = () => {
    const csv = transactions.map(t => ({
      Date: new Date(t.date?.toDate()).toLocaleDateString(),
      Description: t.description,
      Category: t.category,
      Type: t.type,
      Amount: t.amount
    }));
    
    const csvStr = [
      ['Date', 'Description', 'Category', 'Type', 'Amount'].join(','),
      ...csv.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = async () => {
    await auth.signOut();
  };

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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/reports' ? 'active' : ''}`}>
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
          <h1>Reports</h1>
          <div className="header-user">
            <button onClick={handleExport} className="export-btn">
              <Download size={18} /> Export CSV
            </button>
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="reports-content">
          {transactions.length === 0 ? (
            <div className="empty-reports">
              <p>No transactions yet. Add some to see your reports!</p>
              <Link to="/transactions" className="action-link">Add Transaction →</Link>
            </div>
          ) : (
            <>
              {/* Category Chart */}
              <div className="report-card">
                <h3>Expenses by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Trend */}
              {monthlyData.length > 0 && (
                <div className="report-card">
                  <h3>Monthly Trend</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="income" stroke="#48bb78" strokeWidth={2} />
                      <Line type="monotone" dataKey="expense" stroke="#f56565" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Summary Stats */}
              <div className="report-stats">
                <div className="stat-card-small">
                  <Calendar size={20} />
                  <span>Total Transactions</span>
                  <strong>{transactions.length}</strong>
                </div>
                <div className="stat-card-small">
                  <span>Total Income</span>
                  <strong className="positive">
                    {formatCurrency(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                  </strong>
                </div>
                <div className="stat-card-small">
                  <span>Total Expenses</span>
                  <strong className="negative">
                    {formatCurrency(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                  </strong>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Reports;