// Transactions.jsx - COMPLETO CORRIGIDO
import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '../components/Toast';
import { generateFutureExecutions } from '../services/recurringService';
import { 
  PlusCircle, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Menu,
  X,
  Wallet,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Target,
  Settings,
  LogOut,
  Search,
  Edit2,
  Save,
  XCircle,
  RefreshCw,
  PieChart,
  Calendar,
  PiggyBank,
  MessageSquare,
  Camera
} from 'lucide-react';
import './Transactions.css';
import { useSavingsRules } from '../context/SavingsRulesContext';
import { useBalances } from '../context/BalancesContext';
import { InvoiceScanner } from '../components/InvoiceScanner';
import { checkInvoiceScannerAccess } from '../services/subscriptionService';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [scheduledTransactions, setScheduledTransactions] = useState([]);
  const [showScheduled, setShowScheduled] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [selectedBalance, setSelectedBalance] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [invoiceScannerOpen, setInvoiceScannerOpen] = useState(false);
  const user = auth.currentUser;

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Other'];

  const { formatCurrency } = useCurrency();
  const { balances, loadBalances } = useBalances();
  const { processSalaryTransaction } = useSavingsRules();

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadScheduledTransactions();
    }
  }, [user]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, filterType, filterCategory, filterMonth]);

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

  const loadScheduledTransactions = async () => {
    const recurringRef = collection(db, 'users', user.uid, 'recurring');
    const snapshot = await getDocs(recurringRef);
    const scheduled = [];
    
    snapshot.forEach(doc => {
      const rec = { id: doc.id, ...doc.data() };
      if (rec.isActive) {
        const nextDate = rec.nextExecution?.toDate ? rec.nextExecution.toDate() : new Date(rec.nextExecution);
        const now = new Date();
        
        if (nextDate > now) {
          scheduled.push({
            date: new Date(nextDate),
            amount: rec.amount,
            description: rec.description,
            category: rec.category,
            type: rec.type,
            balanceId: rec.balanceId,
            balanceName: rec.balanceName,
            isScheduled: true,
            recurringId: rec.id,
            frequency: rec.frequency
          });
        }
      }
    });
    
    scheduled.sort((a, b) => new Date(a.date) - new Date(b.date));
    setScheduledTransactions(scheduled);
  };

  const getMonthYear = (date) => {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    
    if (filterMonth !== 'all') {
      filtered = filtered.filter(t => getMonthYear(t.date) === filterMonth);
    }
    
    setFilteredTransactions(filtered);
  };

  const handleInvoiceScannerClick = async () => {
    try {
      const { hasAccess, message } = await checkInvoiceScannerAccess(user.uid);
      
      if (hasAccess) {
        setInvoiceScannerOpen(true);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      showError('Erro ao verificar acesso ao Invoice Scanner');
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !description || !category) return;

    const addAmountValue = parseFloat(amount);
    const newTransaction = {
      amount: addAmountValue,
      description,
      category,
      type,
      date: new Date(),
      userId: user.uid,
      balanceId: selectedBalance || null
    };

    const docRef = await addDoc(collection(db, 'users', user.uid, 'transactions'), newTransaction);
    
    // Atualizar balance se selecionado
    if (selectedBalance) {
      const balance = balances.find(b => b.id === selectedBalance);
      if (balance) {
        const newBalance = type === 'income' 
          ? balance.amount + addAmountValue
          : balance.amount - addAmountValue;
        const balanceRef = doc(db, 'users', user.uid, 'balances', selectedBalance);
        await updateDoc(balanceRef, { amount: newBalance });
        await loadBalances();
      }
    }
    
    // Se for um salário, aplicar auto-save rules
    if (type === 'income' && (description.toLowerCase().includes('salary') || category === 'Salary')) {
      await processSalaryTransaction(addAmountValue, docRef.id, new Date());
      showSuccess('Transaction added! Auto-save rules applied!');
    } else {
      showSuccess('Transaction added!');
    }
    
    setAmount('');
    setDescription('');
    setCategory('');
    setSelectedBalance('');
    setUseCustomCategory(false);
    setShowForm(false);
    loadTransactions();
  };

  const updateTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !description || !category || !editingTransaction) return;

    const transactionRef = doc(db, 'users', user.uid, 'transactions', editingTransaction.id);
    await updateDoc(transactionRef, {
      amount: parseFloat(amount),
      description,
      category,
      type,
    });
    
    showSuccess('Transaction updated!');
    setEditingTransaction(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setType('expense');
    setSelectedBalance('');
    setUseCustomCategory(false);
    loadTransactions();
  };

  const deleteTransaction = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      // Recuperar a transação para reverter o saldo
      const transaction = transactions.find(t => t.id === id);
      if (transaction && transaction.balanceId) {
        const balance = balances.find(b => b.id === transaction.balanceId);
        if (balance) {
          // Desfazer o impacto da transação no saldo
          const reversedAmount = transaction.type === 'income' 
            ? balance.amount - transaction.amount  // Remover o que foi adicionado
            : balance.amount + transaction.amount; // Adicionar o que foi removido
          
          const balanceRef = doc(db, 'users', user.uid, 'balances', transaction.balanceId);
          await updateDoc(balanceRef, { amount: reversedAmount });
          await loadBalances();
        }
      }
      
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      showSuccess('Transaction deleted and saldo reverted ↩️');
      loadTransactions();
    }
  };

  const startEdit = (transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setCategory(transaction.category);
    setType(transaction.type);
    setSelectedBalance(transaction.balanceId || '');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingTransaction(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setType('expense');
    setSelectedBalance('');
    setUseCustomCategory(false);
    setShowForm(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const months = ['all', ...new Set(transactions.map(t => getMonthYear(t.date)))];

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/budgets', icon: PieChart, label: 'Budgets' },
    { path: '/recurring', icon: RefreshCw, label: 'Recurring' },
    { path: '/savings-rules', icon: PiggyBank, label: 'Auto-Save' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/transactions' ? 'active' : ''}`}>
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
          <h1>Transactions</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="transactions-content">
          {/* Scheduled Toggle */}
          <div className="scheduled-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showScheduled}
                onChange={(e) => setShowScheduled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <Calendar size={16} />
              Show scheduled transactions
            </span>
          </div>

          {!showForm ? (
            <div className="action-buttons-group">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="add-transaction-btn" 
                onClick={() => setShowForm(true)}
              >
                <PlusCircle size={20} /> Add Transaction
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="invoice-scanner-btn" 
                onClick={handleInvoiceScannerClick}
                title="Pro Feature - Scan invoice"
              >
                <Camera size={20} /> Invoice Scanner
              </motion.button>
            </div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="transaction-form" 
              onSubmit={editingTransaction ? updateTransaction : addTransaction}
            >
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                step="0.01"
              />
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
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
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
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
              <select value={selectedBalance} onChange={(e) => setSelectedBalance(e.target.value)}>
                <option value="">Select Balance (optional)</option>
                {balances.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.amount)})</option>
                ))}
              </select>
              <button type="submit">
                <Save size={16} /> {editingTransaction ? 'Update' : 'Save'}
              </button>
              <button type="button" onClick={cancelEdit}>
                <XCircle size={16} /> Cancel
              </button>
            </motion.form>
          )}

          <div className="filters-section">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-buttons">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="all">All Months</option>
                {months.filter(m => m !== 'all').map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="transactions-list-full">
            <h3>All Transactions</h3>
            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : filteredTransactions.length === 0 && (!showScheduled || scheduledTransactions.length === 0) ? (
              <div className="empty-state">
                <Receipt size={48} />
                <p>No transactions found.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  Add your first transaction
                </button>
              </div>
            ) : (
              <>
                {filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`transaction-item ${transaction.type}`}
                  >
                    <div className="transaction-info">
                      <strong>{transaction.description}</strong>
                      <span>{transaction.category}</span>
                      <span>{new Date(transaction.date?.toDate()).toLocaleDateString()}</span>
                    </div>
                    <div className="transaction-amount">
                      <span className={`amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </span>
                      <button onClick={() => startEdit(transaction)} className="edit-btn" aria-label="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteTransaction(transaction.id)} className="delete-btn" aria-label="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {showScheduled && scheduledTransactions.length > 0 && (
                  <>
                    <div className="scheduled-header">
                      <Calendar size={18} />
                      <span>Scheduled Transactions</span>
                    </div>
                    {scheduledTransactions.map((tx, idx) => (
                      <div key={`scheduled-${idx}`} className="transaction-item scheduled">
                        <div className="transaction-info">
                          <strong>{tx.description}</strong>
                          <span>{tx.category}</span>
                          <span className="scheduled-date">{new Date(tx.date).toLocaleDateString()}</span>
                          <span className="scheduled-badge">⏰ Scheduled</span>
                        </div>
                        <div className="transaction-amount scheduled-amount">
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <div className="transactions-summary">
            <div className="summary-card">
              <TrendingUp size={20} />
              <span>Total Income</span>
              <strong>
                {formatCurrency(
                  filteredTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </strong>
            </div>
            <div className="summary-card">
              <TrendingDown size={20} />
              <span>Total Expenses</span>
              <strong>
                {formatCurrency(
                  filteredTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </strong>
            </div>
          </div>
        </div>
      </main>

      {/* Invoice Scanner Modal */}
      <InvoiceScanner
        isOpen={invoiceScannerOpen}
        onClose={() => setInvoiceScannerOpen(false)}
        onSuccess={(transaction) => {
          loadTransactions();
          showSuccess(`✅ Transação adicionada: €${transaction.amount}`);
        }}
        balanceId={selectedBalance}
        userId={user?.uid}
      />
    </div>
  );
}

export default Transactions;