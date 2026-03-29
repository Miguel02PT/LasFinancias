import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { useUserRole } from '../hooks/useUserRole';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Area, AreaChart, Legend, BarChart, Bar, Cell
} from 'recharts';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  RefreshCw, PieChart as PieChartIcon, PiggyBank, MessageSquare, TrendingDown, TrendingUp
} from 'lucide-react';
import './Reports.css';
import { PageTransition } from '../components/PageTransition';
import { SkeletonCard } from '../components/Skeleton';

function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBalanceId, setSelectedBalanceId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [chartWidth, setChartWidth] = useState(800);
  const contentRef = useRef(null);
  const user = auth.currentUser;
  const { isAdmin } = useUserRole(user?.uid);

  const { formatCurrency } = useCurrency();
  const { balances, loading: balancesLoading } = useBalances();

  // Medir largura do container para os gráficos
  useEffect(() => {
    const updateChartWidth = () => {
      if (contentRef.current) {
        // Largura disponível = container width - padding
        const width = contentRef.current.clientWidth - 32; // 32 = padding (2rem)
        // Mínimo 300px para não ficar muito pequeno
        setChartWidth(Math.max(300, width));
      }
    };

    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);
    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);

  // Carregar transações
  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  // Definir balance padrão quando carregar
  useEffect(() => {
    if (balances.length > 0 && !selectedBalanceId) {
      setSelectedBalanceId(balances[0].id);
    }
  }, [balances]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar todos os dias do ano e calcular saldo para cada dia
  const dailyBalanceHistory = useMemo(() => {
    if (!selectedBalanceId || balances.length === 0) return [];

    // Saldo atual do balance selecionado
    const selectedBalance = balances.find(b => b.id === selectedBalanceId);
    if (!selectedBalance) return [];

    const currentBalance = selectedBalance.amount || 0;

    // Filtrar transações do balance selecionado
    const allBalanceTransactions = transactions
      .filter(t => t.balanceId === selectedBalanceId || !t.balanceId)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      });

    if (allBalanceTransactions.length === 0) {
      // Se não há transações, mostrar apenas o saldo atual num ponto
      const today = new Date();
      return [{
        date: today.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        fullDate: today,
        balance: currentBalance
      }];
    }

    // Criar um mapa de transações por dia
    const transactionsByDay = new Map();
    for (const t of allBalanceTransactions) {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!transactionsByDay.has(dateKey)) {
        transactionsByDay.set(dateKey, { income: 0, expense: 0, date: date });
      }
      
      const dayData = transactionsByDay.get(dateKey);
      if (t.type === 'income') {
        dayData.income += t.amount;
      } else if (t.type === 'expense') {
        dayData.expense += t.amount;
      }
    }

    // Ordenar as chaves por data
    const sortedDates = Array.from(transactionsByDay.keys()).sort();
    
    if (sortedDates.length === 0) return [];

    // Calcular saldo acumulado (trabalhando para trás a partir do saldo atual)
    let totalTransactionAmount = 0;
    for (const dateKey of sortedDates) {
      const dayData = transactionsByDay.get(dateKey);
      totalTransactionAmount += dayData.income;
      totalTransactionAmount -= dayData.expense;
    }

    // Saldo inicial = saldo atual - total de transações
    let runningBalance = currentBalance - totalTransactionAmount;
    const result = [];

    for (const dateKey of sortedDates) {
      const dayData = transactionsByDay.get(dateKey);
      runningBalance += dayData.income;
      runningBalance -= dayData.expense;
      
      result.push({
        date: dayData.date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        fullDate: dayData.date,
        balance: Number(runningBalance.toFixed(2))
      });
    }

    return result;
  }, [transactions, selectedBalanceId, balances]);

  // Anos disponíveis
  const availableYears = useMemo(() => {
    const years = [...new Set(transactions.map(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return date.getFullYear();
    }).filter(y => y && !isNaN(y)))];
    if (years.length === 0) return [new Date().getFullYear()];
    return years.sort((a, b) => b - a);
  }, [transactions]);

  // Filtrar por ano
  const filteredHistory = useMemo(() => {
    return dailyBalanceHistory.filter(item => {
      return item.fullDate && item.fullDate.getFullYear() === selectedYear;
    });
  }, [dailyBalanceHistory, selectedYear]);

  // Dados de expenses por categoria
  const expensesByCategory = useMemo(() => {
    const filtered = transactions.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return t.type === 'expense' && 
             date.getFullYear() === selectedYear &&
             date.getMonth() + 1 === selectedMonth &&
             (!selectedDay || date.getDate() === parseInt(selectedDay)) &&
             (selectedCategory === 'all' || t.category === selectedCategory);
    });

    const categoryMap = new Map();
    filtered.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const current = categoryMap.get(cat) || 0;
      categoryMap.set(cat, current + t.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2))
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, selectedYear, selectedMonth, selectedDay, selectedCategory]);

  // Dados de income vs expenses por mês
  const incomeVsExpenses = useMemo(() => {
    const monthData = new Map();
    
    transactions.forEach(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (date.getFullYear() === selectedYear) {
        const monthKey = date.getMonth();
        if (!monthData.has(monthKey)) {
          monthData.set(monthKey, { month: new Date(selectedYear, monthKey, 1).toLocaleDateString('en-US', { month: 'short' }), income: 0, expenses: 0 });
        }
        const data = monthData.get(monthKey);
        if (t.type === 'income') data.income += t.amount;
        else data.expenses += t.amount;
      }
    });

    return Array.from({length: 12}, (_, i) => 
      monthData.get(i) || { month: new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' }), income: 0, expenses: 0 }
    );
  }, [transactions, selectedYear]);

  // Categorias disponíveis
  const availableCategories = useMemo(() => {
    const categories = [...new Set(transactions.filter(t => t.type === 'expense').map(t => t.category).filter(Boolean))];
    return categories.sort();
  }, [transactions]);

  // Dias disponíveis para o mês selecionado
  const availableDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({length: daysInMonth}, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChartIcon, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/savings-rules', icon: PiggyBank, label: 'Auto-Save' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(isAdmin ? [{ path: '/admin', icon: Settings, label: 'Admin' }] : [])
  ];

  // Stats do período selecionado
  const periodStats = useMemo(() => {
    const filtered = transactions.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return date.getFullYear() === selectedYear &&
             date.getMonth() + 1 === selectedMonth &&
             (!selectedDay || date.getDate() === parseInt(selectedDay));
    });

    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expenses;

    return { income, expenses, net, total: filtered.length };
  }, [transactions, selectedYear, selectedMonth, selectedDay]);

  async function handleLogout() {
    await auth.signOut();
  }

  // Estado vazio
  if (!loading && transactions.length === 0) {
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
              <span>{user?.email}</span>
            </div>
          </header>
          <div className="reports-content">
            <div className="empty-reports">
              <p>No transactions yet. Add some to see your reports!</p>
              <Link to="/transactions" className="action-link">Add Transaction →</Link>
            </div>
          </div>
        </main>
      </div>
    );
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
            <div className="header-actions">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="year-selector"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <span>{user?.email}</span>
          </div>
        </header>

        <PageTransition>
          <div className="reports-content" ref={contentRef}>
            {/* GRÁFICO ORIGINAL: Balance Over Time - PRIMEIRO! */}
            {!loading && !balancesLoading && (
              <div className="report-card">
                <div className="chart-header">
                  <h3>💳 Account Balance Over Time</h3>
                  {balances.length > 0 && (
                    <select
                      value={selectedBalanceId}
                      onChange={(e) => setSelectedBalanceId(e.target.value)}
                      className="balance-selector"
                    >
                      {balances.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({formatCurrency(b.amount)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {filteredHistory.length > 0 ? (
                  <div style={{ width: '100%' }}>
                    {/* Estatísticas do Saldo */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                      <div style={{ padding: '1.5rem', backgroundColor: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px', borderLeft: '4px solid #667eea' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#718096' }}>Current Balance</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#667eea', fontWeight: 'bold' }}>
                          {formatCurrency(filteredHistory[filteredHistory.length - 1]?.balance || 0)}
                        </h3>
                      </div>
                      <div style={{ padding: '1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#718096' }}>Highest Balance</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#22c55e', fontWeight: 'bold' }}>
                          {formatCurrency(Math.max(...filteredHistory.map(h => h.balance)))}
                        </h3>
                      </div>
                      <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#718096' }}>Lowest Balance</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#ef4444', fontWeight: 'bold' }}>
                          {formatCurrency(Math.min(...filteredHistory.map(h => h.balance)))}
                        </h3>
                      </div>
                    </div>

                    {/* Gráfico */}
                    <div style={{ 
                      width: '100%', 
                      overflowX: 'auto',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '2rem',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <AreaChart 
                        width={chartWidth}
                        height={450}
                        data={filteredHistory} 
                        margin={{ top: 10, right: 40, left: 20, bottom: 80 }}
                      >
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="#e2e8f0"
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#718096', fontSize: 12 }}
                          interval={Math.floor(filteredHistory.length / 10)}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          style={{ fontFamily: 'system-ui' }}
                        />
                        <YAxis 
                          tick={{ fill: '#718096', fontSize: 12 }} 
                          tickFormatter={(value) => formatCurrency(value)}
                          style={{ fontFamily: 'system-ui' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '2px solid #667eea',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            fontFamily: 'system-ui'
                          }}
                          labelStyle={{ color: '#1a202c', fontWeight: 'bold' }}
                          formatter={(value) => [formatCurrency(value), 'Balance']}
                          labelFormatter={(label) => `📅 ${label}`}
                          cursor={{ stroke: '#667eea', strokeWidth: 2 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="balance" 
                          stroke="#667eea" 
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorBalance)"
                          isAnimationActive={true}
                          animationDuration={1000}
                          dot={{ fill: '#667eea', r: filteredHistory.length < 30 ? 5 : 0 }}
                          activeDot={{ r: 8, fill: '#667eea', stroke: 'white', strokeWidth: 2 }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          wrapperStyle={{ fontFamily: 'system-ui' }}
                        />
                      </AreaChart>
                    </div>

                    <p className="chart-note">📈 Your balance evolution throughout the year</p>
                  </div>
                ) : (
                  <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    {dailyBalanceHistory.length === 0 ? (
                      <>
                        <p><strong>No data available</strong></p>
                        {transactions.length === 0 ? (
                          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
                            You haven't added any transactions yet.
                          </p>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: '#718096' }}>
                            No transactions found for the selected balance.<br/>
                            📝 Total transactions: {transactions.length} | 
                            ✅ With balanceId: {transactions.filter(t => t.balanceId).length}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p><strong>No data for {selectedYear}</strong></p>
                        <p style={{ fontSize: '0.85rem', color: '#718096' }}>
                          Available years: {availableYears.join(', ')}<br/>
                          Records: {dailyBalanceHistory.length}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            

            {/* GRÁFICOS */}
            {loading || balancesLoading ? (
              <SkeletonCard />
            ) : (
              <>
                {/* GRÁFICO 1: Income vs Expenses */}
                {incomeVsExpenses.some(d => d.income > 0 || d.expenses > 0) && (
                  <div className="report-card">
                    <h3>💰 Income vs Expenses ({selectedYear})</h3>
                    
                    {/* FILTROS DENTRO DO CARD */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      marginBottom: '2rem',
                      padding: '1.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }} className="filters-container">
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#718096', display: 'block', marginBottom: '0.5rem' }} className="filter-label">Year</label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="year-selector"
                          style={{ width: '100%' }}
                        >
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#718096', display: 'block', marginBottom: '0.5rem' }} className="filter-label">Month</label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                          className="year-selector"
                          style={{ width: '100%' }}
                        >
                          {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>
                              {new Date(selectedYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#718096', display: 'block', marginBottom: '0.5rem' }} className="filter-label">Day</label>
                        <select
                          value={selectedDay || ''}
                          onChange={(e) => setSelectedDay(e.target.value ? parseInt(e.target.value) : null)}
                          className="year-selector"
                          style={{ width: '100%' }}
                        >
                          <option value="">All Days</option>
                          {availableDays.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#718096', display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="year-selector"
                          style={{ width: '100%' }}
                        >
                          <option value="all">All Categories</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* STATS CARDS: Income, Expenses e Net Balance - ANTES DO GRÁFICO */}
                    <div className="stats-grid" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                      <div className="stat-card income">
                        <div className="stat-card-content">
                          <p>Income</p>
                          <h3>{formatCurrency(periodStats.income)}</h3>
                        </div>
                        <TrendingUp size={32} color="#22c55e" strokeWidth={1.5} />
                      </div>

                      <div className="stat-card expenses">
                        <div className="stat-card-content">
                          <p>Expenses</p>
                          <h3>{formatCurrency(periodStats.expenses)}</h3>
                        </div>
                        <TrendingDown size={32} color="#ef4444" strokeWidth={1.5} />
                      </div>

                      <div className={`stat-card net ${periodStats.net >= 0 ? 'positive' : 'negative'}`}>
                        <div className="stat-card-content">
                          <p>Net Balance</p>
                          <h3>{formatCurrency(periodStats.net)}</h3>
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      width: '100%', 
                      overflowX: 'auto',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '2rem'
                    }}>
                      <AreaChart 
                        width={chartWidth}
                        height={400}
                        data={incomeVsExpenses} 
                        margin={{ top: 10, right: 40, left: 20, bottom: 40 }}
                      >
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#718096', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '2px solid #667eea',
                            borderRadius: '8px'
                          }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} />
                        <Legend wrapperStyle={{ fontFamily: 'system-ui' }} />
                      </AreaChart>
                    </div>
                  </div>
                )}

                {/* GRÁFICO 2: Expenses por Categoria */}
                {expensesByCategory.length > 0 && (
                  <div className="report-card">
                    <h3>📊 Expenses by Category</h3>
                    <div style={{ 
                      width: '100%', 
                      overflowX: 'auto',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '2rem'
                    }}>
                      <BarChart 
                        width={chartWidth}
                        height={400}
                        data={expensesByCategory} 
                        margin={{ top: 10, right: 40, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fill: '#718096', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fill: '#718096', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '2px solid #ef4444',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]}>
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4'][index % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}

export default Reports;