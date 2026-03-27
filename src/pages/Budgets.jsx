import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { useCurrency } from '../context/CurrencyContext';
import { showSuccess, showError } from '../components/Toast';
import { motion } from 'framer-motion';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  PlusCircle, Trash2, Edit2, Save, XCircle, AlertCircle,PieChart
} from 'lucide-react';
import './Budgets.css';
import { RefreshCw } from 'lucide-react';

function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = auth.currentUser;

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) {
      loadBudgets();
      loadTransactions();
    }
  }, [user]);

  const loadBudgets = async () => {
    const q = query(collection(db, 'users', user.uid, 'budgets'));
    const querySnapshot = await getDocs(q);
    const budgetsData = [];
    querySnapshot.forEach((doc) => {
      budgetsData.push({ id: doc.id, ...doc.data() });
    });
    setBudgets(budgetsData);
  };

  const loadTransactions = async () => {
    const q = query(collection(db, 'users', user.uid, 'transactions'));
    const querySnapshot = await getDocs(q);
    const transactionsData = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.date?.toDate();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        transactionsData.push(data);
      }
    });
    setTransactions(transactionsData);
  };

  const addBudget = async (e) => {
    e.preventDefault();
    if (!category || !limit) return;

    await addDoc(collection(db, 'users', user.uid, 'budgets'), {
      category,
      limit: parseFloat(limit),
      createdAt: new Date()
    });
    showSuccess('Budget created!');
    setCategory('');
    setLimit('');
    setShowForm(false);
    loadBudgets();
  };

  const updateBudget = async (e) => {
    e.preventDefault();
    if (!category || !limit || !editingBudget) return;

    const budgetRef = doc(db, 'users', user.uid, 'budgets', editingBudget.id);
    await updateDoc(budgetRef, {
      category,
      limit: parseFloat(limit),
    });
    showSuccess('Budget updated!');
    setEditingBudget(null);
    setCategory('');
    setLimit('');
    setShowForm(false);
    loadBudgets();
  };

  const deleteBudget = async (id) => {
    if (window.confirm('Delete this budget?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
      showSuccess('Budget deleted');
      loadBudgets();
    }
  };

  const startEdit = (budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setLimit(budget.limit.toString());
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingBudget(null);
    setCategory('');
    setLimit('');
    setShowForm(false);
  };

  const getSpent = (category) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChart, label: 'Budgets' },  // ← mudado
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/settings', icon: Settings, label: 'Settings' },  // ← SEMPRE ÚLTIMO
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/budgets' ? 'active' : ''}`}>
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
          <h1>Monthly Budgets</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="budgets-content">
          {!showForm ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              className="add-budget-btn" 
              onClick={() => setShowForm(true)}
            >
              <PlusCircle size={20} /> Set Budget
            </motion.button>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="budget-form" 
              onSubmit={editingBudget ? updateBudget : addBudget}
            >
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Monthly Limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
              <button type="submit">
                <Save size={16} /> {editingBudget ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={cancelEdit}>
                <XCircle size={16} /> Cancel
              </button>
            </motion.form>
          )}

          <div className="budgets-list">
            <h3>Your Budgets</h3>
            {budgets.length === 0 ? (
              <div className="empty-state">
                <Target size={48} />
                <p>No budgets set yet.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  Create your first budget
                </button>
              </div>
            ) : (
              budgets.map((budget) => {
                const spent = getSpent(budget.category);
                const percentage = (spent / budget.limit) * 100;
                const isOver = spent > budget.limit;
                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`budget-card ${isOver ? 'over' : ''}`}
                  >
                    <div className="budget-header">
                      <h3>{budget.category}</h3>
                      <div className="budget-actions">
                        <button onClick={() => startEdit(budget)} className="edit-btn">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteBudget(budget.id)} className="delete-btn">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="budget-stats">
                      <span>Spent: {formatCurrency(spent)}</span>
                      <span>Limit: {formatCurrency(budget.limit)}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${isOver ? 'over' : ''}`} 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    {isOver && (
                      <div className="budget-alert">
                        <AlertCircle size={16} />
                        <span>You've exceeded your budget by {formatCurrency(spent - budget.limit)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Budgets;