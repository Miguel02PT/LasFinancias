import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, getDoc } from 'firebase/firestore';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { useUserRole } from '../hooks/useUserRole';
import { showSuccess, showError } from '../components/ToastWithUndo';
import { motion } from 'framer-motion';
import {
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  PlusCircle, Trash2, Edit2, Save, XCircle, RefreshCw, Calendar, ToggleLeft, ToggleRight, PieChart, PiggyBank
, MessageSquare} from 'lucide-react';
import './Recurring.css';

function Recurring() {
  const [recurring, setRecurring] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [selectedBalance, setSelectedBalance] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const user = auth.currentUser;

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Other'];
  const frequencies = ['monthly', 'weekly', 'yearly'];

  const { formatCurrency } = useCurrency();
  const { balances, loadBalances } = useBalances();

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

  const calculateFirstExecution = (frequency, startDateValue) => {
    const now = new Date();
    const start = new Date(startDateValue);
    let first = new Date(start);
    let maxIterations = 100;
    
    while (first <= now && maxIterations-- > 0) {
      if (frequency === 'monthly') {
        first.setMonth(first.getMonth() + 1);
      } else if (frequency === 'weekly') {
        first.setDate(first.getDate() + 7);
      } else if (frequency === 'yearly') {
        first.setFullYear(first.getFullYear() + 1);
      }
    }
    
    return first;
  };

  const addRecurring = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category || !selectedBalance) {
      showError('Please fill all fields');
      return;
    }

    const now = new Date();
    const start = new Date(startDate);
    let transactionCreatedToday = false;
    let updatedBalance = null;

    // Automatically create transaction TODAY if startDate is today or in the past
    if (start <= now) {
      const amountValue = parseFloat(amount);
      
      // Set transaction date to today (start of day)
      const todayAtMidnight = new Date(now);
      todayAtMidnight.setHours(0, 0, 0, 0);

      const transactionToday = {
        amount: amountValue,
        description: description,
        category,
        type,
        date: todayAtMidnight,
        userId: user.uid,
        balanceId: selectedBalance,
        isRecurring: true,
        fromRecurring: true
      };
      
      await addDoc(collection(db, 'users', user.uid, 'transactions'), transactionToday);
      transactionCreatedToday = true;
      
      // Fetch current balance from Firestore (not from state which may be outdated)
      const balanceRef = doc(db, 'users', user.uid, 'balances', selectedBalance);
      const balanceDoc = await getDoc(balanceRef);
      
      if (balanceDoc.exists()) {
        const currentBalance = balanceDoc.data().amount;
        let newBalance = currentBalance;
        
        if (type === 'income') {
          newBalance += amountValue;
        } else {
          newBalance -= amountValue;
        }
        
        // Update balance in Firestore
        await updateDoc(balanceRef, { amount: newBalance });
        updatedBalance = newBalance;
        
        // Refresh balances context to update UI everywhere
        await loadBalances();
      }
    }

    const newRecurring = {
      description,
      amount: parseFloat(amount),
      category,
      type,
      frequency,
      startDate: startDate,
      balanceId: selectedBalance,
      balanceName: balances.find(b => b.id === selectedBalance)?.name,
      isActive: true,
      createdAt: new Date(),
      lastExecuted: transactionCreatedToday ? new Date() : null,
      nextExecution: calculateFirstExecution(frequency, startDate)
    };

    await addDoc(collection(db, 'users', user.uid, 'recurring'), newRecurring);
    
    if (transactionCreatedToday) {
      showSuccess('Transaction created for today and recurring added!');
    } else {
      showSuccess('Recurring transaction added!');
    }
    
    resetForm();
    loadRecurring();
  };

  const updateRecurring = async (e) => {
    e.preventDefault();
    if (!editing || !description || !amount || !category || !selectedBalance) return;

    const recurringRef = doc(db, 'users', user.uid, 'recurring', editing.id);
    await updateDoc(recurringRef, {
      description,
      amount: parseFloat(amount),
      category,
      type,
      frequency,
      startDate: startDate,
      balanceId: selectedBalance,
      balanceName: balances.find(b => b.id === selectedBalance)?.name,
      isActive,
      nextExecution: calculateFirstExecution(frequency, startDate)
    });
    showSuccess('Recurring transaction updated!');
    setEditing(null);
    resetForm();
    loadRecurring();
    await loadBalances();
  };

  const deleteRecurring = async (id) => {
    if (window.confirm('Delete this recurring transaction?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'recurring', id));
      showSuccess('Deleted');
      loadRecurring();
      await loadBalances();
    }
  };

  const toggleActive = async (item) => {
    const recurringRef = doc(db, 'users', user.uid, 'recurring', item.id);
    await updateDoc(recurringRef, { isActive: !item.isActive });
    showSuccess(item.isActive ? 'Disabled' : 'Enabled');
    loadRecurring();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('');
    setType('expense');
    setFrequency('monthly');
    setStartDate(new Date());
    setSelectedBalance('');
    setIsActive(true);
    setShowForm(false);
    setEditing(null);
    setUseCustomCategory(false);
  };

  const startEdit = (item) => {
    setEditing(item);
    setDescription(item.description);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setType(item.type);
    setFrequency(item.frequency);
    setStartDate(item.startDate?.toDate ? item.startDate.toDate() : new Date(item.startDate));
    setSelectedBalance(item.balanceId);
    setIsActive(item.isActive);
    setShowForm(true);
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const formatDate = (date) => {
    if (!date) return 'Not scheduled';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChart, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/savings-rules', icon: PiggyBank, label: 'Auto-Save' },  { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/admin', icon: Settings, label: 'Admin' },
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
            <motion.form initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="recurring-form" onSubmit={editing ? updateRecurring : addRecurring}>
              <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
              <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              {useCustomCategory ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter custom category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomCategory(false);
                      setCategory('');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}
                  >
                    ✕ Use Select
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required style={{ flex: 1 }}>
                    <option value="">Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setUseCustomCategory(true);
                      setCategory('');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#fff5e6',
                      border: '2px solid #f6ad55',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#dd6b20'
                    }}
                  >
                    ✏️ Custom
                  </button>
                </div>
              )}
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              <div className="date-picker-wrapper">
                <Calendar size={18} />
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="date-input"
                />
              </div>

              <select value={selectedBalance} onChange={(e) => setSelectedBalance(e.target.value)} required>
                <option value="">Select Balance</option>
                {balances.map(b => <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.amount)})</option>)}
              </select>

              <div className="active-toggle">
                <button type="button" onClick={() => setIsActive(!isActive)} className={`toggle-active-btn ${isActive ? 'active' : ''}`}>
                  {isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <button type="submit"><Save size={16} /> {editing ? 'Update' : 'Save'}</button>
              <button type="button" onClick={resetForm}><XCircle size={16} /> Cancel</button>
            </motion.form>
          )}

          <div className="recurring-list">
            <h3>Your Recurring Transactions</h3>
            {recurring.length === 0 ? (
              <div className="empty-state">
                <RefreshCw size={48} />
                <p>No recurring transactions yet.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>Add your first recurring transaction</button>
              </div>
            ) : (
              recurring.map((item) => (
                <motion.div key={item.id} className={`recurring-card ${item.type} ${!item.isActive ? 'inactive' : ''}`}>
                  <div className="recurring-info">
                    <strong>{item.description}</strong>
                    <span>{item.category}</span>
                    <span className="frequency-badge">{item.frequency}</span>
                    <span className="balance-badge">{item.balanceName || 'No balance'}</span>
                    <span className="next-date">Next: {formatDate(item.nextExecution)}</span>
                    {item.hasPastTransactions && <span className="past-badge">📜 Past created</span>}
                  </div>
                  <div className="recurring-amount">
                    {formatCurrency(item.amount)}
                    <button onClick={() => toggleActive(item)} className="toggle-btn" title={item.isActive ? 'Disable' : 'Enable'}>
                      {item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => startEdit(item)} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={() => deleteRecurring(item.id)} className="delete-btn"><Trash2 size={16} /></button>
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