import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut, PlusCircle, Trash2 } from 'lucide-react';
import './Goals.css';
import { RefreshCw } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = auth.currentUser;

  const { formatCurrency } = useCurrency();

  // Carregar transações e metas quando user estiver disponível
  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (transactions.length > 0 || user) {
      loadGoals();
    }
  }, [transactions, user]);

  const loadTransactions = async () => {
    if (!user) return;
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

  const loadGoals = async () => {
    if (!user) return;
    const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'goals'));
    const goalsData = [];
    
    querySnapshot.forEach((doc) => {
      const goal = { id: doc.id, ...doc.data() };
      
      // Calcula quanto foi poupado (soma de todas as receitas)
      // Podes ajustar a lógica conforme quiseres
      const totalSaved = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      goal.savedAmount = Math.min(totalSaved, goal.targetAmount);
      goalsData.push(goal);
    });
    
    setGoals(goalsData);
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    await addDoc(collection(db, 'users', user.uid, 'goals'), {
      name,
      targetAmount: parseFloat(targetAmount),
      savedAmount: 0,
      createdAt: new Date()
    });

    setName('');
    setTargetAmount('');
    loadGoals();
  };

  const deleteGoal = async (id) => {
    if (window.confirm('Delete this goal?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
      loadGoals();
    }
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/goals' ? 'active' : ''}`}>
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
          <h1>Financial Goals</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="goals-content">
          <form className="goal-form" onSubmit={addGoal}>
            <input
              type="text"
              placeholder="Goal name (e.g., New Car)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Target Amount"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
            <button type="submit">
              <PlusCircle size={18} /> Add Goal
            </button>
          </form>

          <div className="goals-list">
            {goals.length === 0 ? (
              <p className="empty-state">No goals yet. Start saving today!</p>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="goal-card">
                  <div className="goal-info">
                    <h3>{goal.name}</h3>
                    <p>Target: {formatCurrency(goal.targetAmount)}</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.min(((goal.savedAmount / goal.targetAmount) * 100), 100).toFixed(0)}% achieved
                    </span>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="delete-goal">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Goals;