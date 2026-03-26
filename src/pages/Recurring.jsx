import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { useCurrency } from '../context/CurrencyContext';
import { showSuccess, showError } from '../components/Toast';
import { motion } from 'framer-motion';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  PlusCircle, Trash2, Edit2, Save, XCircle, RefreshCw
} from 'lucide-react';
import './Recurring.css';

function Recurring() {
  const [recurring, setRecurring] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [frequency, setFrequency] = useState('monthly');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = auth.currentUser;

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Other'];
  const frequencies = ['monthly', 'weekly', 'yearly'];

  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) loadRecurring();
  }, [user]);

  const loadRecurring = async () => {
    const q = query(collection(db, 'users', user.uid, 'recurring'));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    setRecurring(data);
  };

  const addRecurring = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category) return;

    await addDoc(collection(db, 'users', user.uid, 'recurring'), {
      description,
      amount: parseFloat(amount),
      category,
      type,
      frequency,
      createdAt: new Date(),
      lastExecuted: null
    });
    showSuccess('Recurring transaction added!');
    setDescription('');
    setAmount('');
    setCategory('');
    setShowForm(false);
    loadRecurring();
  };

  const deleteRecurring = async (id) => {
    if (window.confirm('Delete this recurring transaction?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'recurring', id));
      showSuccess('Deleted');
      loadRecurring();
    }
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/recurring' ? 'active' : ''}`}>
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
          <h1>Recurring Transactions</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="recurring-content">
          {!showForm ? (
            <button className="add-recurring-btn" onClick={() => setShowForm(true)}>
              <PlusCircle size={20} /> Add Recurring Transaction
            </button>
          ) : (
            <form className="recurring-form" onSubmit={addRecurring}>
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button type="submit"><Save size={16} /> Save</button>
              <button type="button" onClick={() => setShowForm(false)}><XCircle size={16} /> Cancel</button>
            </form>
          )}

          <div className="recurring-list">
            <h3>Your Recurring Transactions</h3>
            {recurring.length === 0 ? (
              <div className="empty-state">
                <RefreshCw size={48} />
                <p>No recurring transactions yet.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  Add your first recurring transaction
                </button>
              </div>
            ) : (
              recurring.map((item) => (
                <motion.div key={item.id} className={`recurring-card ${item.type}`}>
                  <div className="recurring-info">
                    <strong>{item.description}</strong>
                    <span>{item.category}</span>
                    <span className="frequency-badge">{item.frequency}</span>
                  </div>
                  <div className="recurring-amount">
                    {formatCurrency(item.amount)}
                    <button onClick={() => deleteRecurring(item.id)} className="delete-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Recurring;