import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { useSavingsRules } from '../context/SavingsRulesContext';
import { 
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  PlusCircle, Trash2, Edit2, Save, XCircle, PiggyBank, RefreshCw, PieChart, Calendar, Plus, MessageSquare
} from 'lucide-react';
import './SavingsRules.css';
import { showError } from '../components/ToastWithUndo';

function SavingsRules() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [amountType, setAmountType] = useState('percentage');
  const [amountValue, setAmountValue] = useState('');
  const [targetType, setTargetType] = useState('goal');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceBalanceId, setSourceBalanceId] = useState(''); // NOVO: de onde vem o dinheiro
  const [goalAllocations, setGoalAllocations] = useState([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState('');
  
  const user = auth.currentUser;
  const { formatCurrency } = useCurrency();
  const { balances } = useBalances();
  const { rules, addRule, updateRule, deleteRule } = useSavingsRules();
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const loadGoals = async () => {
    const q = query(collection(db, 'users', user.uid, 'goals'));
    const snapshot = await getDocs(q);
    const goalsData = [];
    snapshot.forEach(doc => goalsData.push({ id: doc.id, ...doc.data() }));
    setGoals(goalsData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !amountValue || !sourceBalanceId) {
      showError('Please fill all required fields');
      return;
    }
    
    if (editing) {
      await updateRule(editing.id, { 
        name, 
        amountType, 
        amountValue: parseFloat(amountValue),
        targetType, 
        targetId, 
        targetName,
        startDate: new Date(startDate),
        sourceBalanceId,
        goalAllocations
      });
    } else {
      await addRule(name, amountType, amountValue, targetType, targetId, targetName, new Date(startDate), sourceBalanceId, goalAllocations);
    }
    resetForm();
  };

  const startEdit = (rule) => {
    setEditing(rule);
    setName(rule.name);
    setAmountType(rule.amountType);
    setAmountValue(rule.amountValue.toString());
    setTargetType(rule.targetType);
    setTargetId(rule.targetId);
    setTargetName(rule.targetName);
    setStartDate(rule.startDate?.toDate ? rule.startDate.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setSourceBalanceId(rule.sourceBalanceId || '');
    setGoalAllocations(rule.goalAllocations || []);
    setShowForm(true);
  };

  const toggleActive = async (rule) => {
    await updateRule(rule.id, { isActive: !rule.isActive });
  };

  const resetForm = () => {
    setName('');
    setAmountType('percentage');
    setAmountValue('');
    setTargetType('goal');
    setTargetId('');
    setTargetName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setSourceBalanceId('');
    setGoalAllocations([]);
    setEditing(null);
    setShowForm(false);
  };

  const addAllocation = () => {
    if (!selectedGoal || !allocationPercentage) return;
    
    const percentage = parseFloat(allocationPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      alert('Please enter a valid percentage (greater than 0)');
      return;
    }
    
    const goal = goals.find(g => g.id === selectedGoal);
    if (!goal) return;
    
    // Verificar se este goal já está alocado
    if (goalAllocations.some(a => a.goalId === selectedGoal)) {
      alert('This goal already has an allocation. Please edit the existing one.');
      return;
    }
    
    const totalPercentage = goalAllocations.reduce((sum, a) => sum + a.percentage, 0) + percentage;
    if (totalPercentage > 100) {
      alert(`Total allocation percentage cannot exceed 100%. Current total: ${totalPercentage - percentage}%, adding ${percentage}% would make ${totalPercentage}%.`);
      return;
    }
    
    setGoalAllocations([
      ...goalAllocations,
      {
        goalId: selectedGoal,
        goalName: goal.name,
        percentage: percentage
      }
    ]);
    setSelectedGoal('');
    setAllocationPercentage('');
    setShowAllocationModal(false);
  };

  const removeAllocation = (index) => {
    setGoalAllocations(goalAllocations.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

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
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  const formatAmountDisplay = (rule) => {
    if (rule.amountType === 'percentage') {
      return `${rule.amountValue}%`;
    }
    return formatCurrency(rule.amountValue);
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/savings-rules' ? 'active' : ''}`}>
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
          <h1>Auto-Save Rules</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="savings-rules-content">
          <div className="info-card">
            <PiggyBank size={32} />
            <h3>Automatic Savings</h3>
            <p>When you add a salary transaction, a fixed amount or percentage will be automatically saved from your chosen balance to your selected goal or balance.</p>
            <p className="info-note">💡 You can also allocate percentages of this rule to specific goals!</p>
          </div>

          {!showForm ? (
            <button className="add-rule-btn" onClick={() => setShowForm(true)}>
              <PlusCircle size={20} /> Create Auto-Save Rule
            </button>
          ) : (
            <form className="rule-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Rule name (e.g., 10% to Vacation)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              
              <div className="amount-type-selector">
                <select value={amountType} onChange={(e) => setAmountType(e.target.value)}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (€)</option>
                </select>
              </div>
              
              <div className="amount-input">
                <input
                  type="number"
                  placeholder={amountType === 'percentage' ? 'Percentage' : 'Amount'}
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  required
                />
                <span className="amount-symbol">{amountType === 'percentage' ? '%' : '€'}</span>
              </div>
              
              {/* NOVO: From where - de onde vem o dinheiro */}
              <select 
                value={sourceBalanceId} 
                onChange={(e) => setSourceBalanceId(e.target.value)}
                required
              >
                <option value="">From which balance?</option>
                {balances.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatCurrency(b.amount)})
                  </option>
                ))}
              </select>
              
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                <option value="goal">Save to a Goal</option>
                <option value="balance">Save to a Balance</option>
              </select>
              
              <select 
                value={targetId} 
                onChange={(e) => {
                  setTargetId(e.target.value);
                  if (targetType === 'goal') {
                    const goal = goals.find(g => g.id === e.target.value);
                    setTargetName(goal?.name || '');
                  } else {
                    const balance = balances.find(b => b.id === e.target.value);
                    setTargetName(balance?.name || '');
                  }
                }}
                required
              >
                <option value="">Select {targetType === 'goal' ? 'Goal' : 'Balance'}</option>
                {targetType === 'goal' 
                  ? goals.map(g => <option key={g.id} value={g.id}>{g.name} (Target: {formatCurrency(g.targetAmount)})</option>)
                  : balances.map(b => <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.amount)})</option>)
                }
              </select>
              
              <div className="date-picker-wrapper">
                <Calendar size={18} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
                <span className="date-hint">Start applying from this date</span>
              </div>

              {/* Goal Allocations Section */}
              <div className="allocations-section">
                <h4>🎯 Goal Allocations</h4>
                <p className="allocation-hint">Distribute a percentage of this rule's savings to your goals</p>
                
                {goalAllocations.map((alloc, idx) => (
                  <div key={idx} className="allocation-item">
                    <span>{alloc.goalName}</span>
                    <span>{alloc.percentage}%</span>
                    <button type="button" onClick={() => removeAllocation(idx)} className="remove-allocation">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <button type="button" onClick={() => setShowAllocationModal(true)} className="add-allocation-btn">
                  <PlusCircle size={16} /> Add Goal Allocation
                </button>
              </div>
              
              <button type="submit"><Save size={16} /> {editing ? 'Update' : 'Save'}</button>
              <button type="button" onClick={resetForm}><XCircle size={16} /> Cancel</button>
            </form>
          )}

          {/* Allocation Modal */}
          {showAllocationModal && (
            <div className="modal-overlay" onClick={() => setShowAllocationModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Allocate to Goal</h3>
                <select value={selectedGoal} onChange={(e) => setSelectedGoal(e.target.value)}>
                  <option value="">Select Goal</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name} (Target: {formatCurrency(g.targetAmount)})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Percentage (%)"
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(e.target.value)}
                />
                <div className="modal-buttons">
                  <button onClick={addAllocation}>Add</button>
                  <button onClick={() => setShowAllocationModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="rules-list">
            <h3>Your Auto-Save Rules</h3>
            {rules.length === 0 ? (
              <div className="empty-state">
                <PiggyBank size={48} />
                <p>No auto-save rules yet. Create one to start saving automatically!</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className={`rule-card ${!rule.isActive ? 'inactive' : ''}`}>
                  <div className="rule-info">
                    <strong>{rule.name}</strong>
                    <span className="amount-badge">{formatAmountDisplay(rule)}</span>
                    <span className="target-badge">
                      From: {balances.find(b => b.id === rule.sourceBalanceId)?.name || 'Unknown'}
                    </span>
                    <span className="target-badge">
                      {rule.targetType === 'goal' ? '🎯 Goal' : '💰 Balance'}: {rule.targetName}
                    </span>
                    <span className="date-badge">
                      📅 Starts: {rule.startDate?.toDate ? rule.startDate.toDate().toLocaleDateString() : new Date(rule.startDate).toLocaleDateString()}
                    </span>
                    <span className={`status-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {rule.goalAllocations && rule.goalAllocations.length > 0 && (
                      <div className="allocations-badge">
                        🎯 Allocations: {rule.goalAllocations.map(a => `${a.percentage}% to ${a.goalName}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="rule-actions">
                    <button onClick={() => toggleActive(rule)} className="toggle-rule-btn">
                      {rule.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => startEdit(rule)} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={() => deleteRule(rule.id)} className="delete-btn"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default SavingsRules;