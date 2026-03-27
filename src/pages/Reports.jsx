import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import {
  PieChart as RechartsPieChart,
  Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, XAxis, YAxis
} from 'recharts';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  Calendar, Download, FileText, RefreshCw, PieChart as PieChartIcon
} from 'lucide-react';
import './Reports.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { showSuccess } from '../components/ToastWithUndo';
import { PageTransition } from '../components/PageTransition';
import { SkeletonCard } from '../components/Skeleton';

function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
  }, [transactions, selectedYear]);

  const loadTransactions = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  // Filtrar transações por ano
  const filteredTransactions = transactions.filter(t => {
    const year = t.date?.toDate()?.getFullYear();
    return year === selectedYear;
  });

  // Obter anos disponíveis
  const availableYears = [...new Set(transactions.map(t => 
    t.date?.toDate()?.getFullYear()
  ).filter(y => y))].sort((a, b) => b - a);

  const prepareMonthlyData = () => {
    const monthlyMap = new Map();
    
    filteredTransactions.forEach(t => {
      const date = t.date?.toDate();
      if (date) {
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!monthlyMap.has(monthYear)) {
          monthlyMap.set(monthYear, { 
            month: monthYear, 
            income: 0, 
            expense: 0,
            balance: 0
          });
        }
        const data = monthlyMap.get(monthYear);
        if (t.type === 'income') {
          data.income += t.amount;
        } else {
          data.expense += t.amount;
        }
        data.balance = data.income - data.expense;
      }
    });
    
    // Ordenar por data (mais antigo primeiro)
    const sortedData = Array.from(monthlyMap.values()).sort((a, b) => {
      const [aMonth, aYear] = a.month.split('/');
      const [bMonth, bYear] = b.month.split('/');
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      return parseInt(aMonth) - parseInt(bMonth);
    });
    
    setMonthlyData(sortedData);
  };

  const categoryData = filteredTransactions.reduce((acc, t) => {
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('LasFinancias - Financial Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Year: ${selectedYear}`, 14, 37);
    
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 14, 45);
    doc.text(`Total Expenses: ${formatCurrency(totalExpense)}`, 14, 52);
    doc.text(`Net: ${formatCurrency(totalIncome - totalExpense)}`, 14, 59);
    
    const tableData = filteredTransactions.slice(0, 20).map(t => [
      new Date(t.date?.toDate()).toLocaleDateString(),
      t.description,
      t.category,
      t.type,
      formatCurrency(t.amount)
    ]);
    
    doc.autoTable({
      startY: 70,
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234] }
    });
    
    doc.save(`lasfinancias_report_${selectedYear}_${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess('PDF exported!');
  };

  const handleExportCSV = () => {
    const csv = filteredTransactions.map(t => ({
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
    a.download = `transactions_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('CSV exported!');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChartIcon, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/settings', icon: Settings, label: 'Settings' },  
  ];

  async function handleLogout() {
    await auth.signOut();
  }

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
            {availableYears.length > 0 && (
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="year-selector"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
            <button onClick={handleExportCSV} className="export-btn">
              <Download size={18} /> CSV
            </button>
            <button onClick={handleExportPDF} className="export-pdf-btn">
              <FileText size={18} /> PDF
            </button>
            <span>{user?.email}</span>
          </div>
        </header>

        <PageTransition>
          <div className="reports-content">
            {loading ? (
              <SkeletonCard />
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-reports">
                <p>No transactions yet for {selectedYear}. Add some to see your reports!</p>
                <Link to="/transactions" className="action-link">Add Transaction →</Link>
              </div>
            ) : (
              <>
                <div className="report-card">
                  <h3>Expenses by Category</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsPieChart>
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
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {monthlyData.length > 0 && (
                  <>
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

                    <div className="report-card">
                      <h3>Cumulative Balance</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#667eea" 
                            strokeWidth={3}
                            dot={{ fill: '#667eea', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                <div className="report-stats">
                  <div className="stat-card-small">
                    <Calendar size={20} />
                    <span>Total Transactions</span>
                    <strong>{filteredTransactions.length}</strong>
                  </div>
                  <div className="stat-card-small">
                    <span>Total Income</span>
                    <strong className="positive">
                      {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
                    </strong>
                  </div>
                  <div className="stat-card-small">
                    <span>Total Expenses</span>
                    <strong className="negative">
                      {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}

export default Reports;