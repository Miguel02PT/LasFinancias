import { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '../components/Toast';
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
  RefreshCw
} from 'lucide-react';
import './Transactions.css';
import { useAccounts } from '../context/AccountsContext';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Other'];

  const { accounts, selectedAccount, updateAccountBalance } = useAccounts();
  const [transactionAccount, setTransactionAccount] = useState(selectedAccount?.id);

  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (user) loadTransactions();
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

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !description || !category || !transactionAccount) return;

    const newTransaction = {
      amount: parseFloat(amount),
      description,
      category,
      type,
      date: new Date(),
      userId: user.uid,
      accountId: transactionAccount
    };

    await addDoc(collection(db, 'users', user.uid, 'transactions'), newTransaction);
    await updateAccountBalance(transactionAccount, parseFloat(amount), type);
    
    showSuccess('Transaction added!');
    setAmount('');
    setDescription('');
    setCategory('');
    setTransactionAccount(selectedAccount?.id);
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
    loadTransactions();
  };

  const deleteTransaction = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      showSuccess('Transaction deleted');
      loadTransactions();
    }
  };

  const startEdit = (transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setCategory(transaction.category);
    setType(transaction.type);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingTransaction(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setType('expense');
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
          {!showForm ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="add-transaction-btn" 
              onClick={() => setShowForm(true)}
            >
              <PlusCircle size={20} /> Add Transaction
            </motion.button>
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
              />
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select 
                value={transactionAccount || ''} 
                onChange={(e) => setTransactionAccount(e.target.value)} 
                required
              >
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
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
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <Receipt size={48} />
                <p>No transactions found.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  Add your first transaction
                </button>
              </div>
            ) : (
              <AnimatePresence>
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
                      <button onClick={() => startEdit(transaction)} className="edit-btn">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteTransaction(transaction.id)} className="delete-btn">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
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
    </div>
  );
}

export default Transactions;