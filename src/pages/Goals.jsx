import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut, PlusCircle, Trash2, TrendingUp, Calculator, Calendar, ArrowRight, MessageSquare, PiggyBank, Plus } from 'lucide-react';
import './Goals.css';
import { RefreshCw, PieChart } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '../components/ToastWithUndo';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [addFromBalance, setAddFromBalance] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Calculadora de poupança
  const [monthlySavings, setMonthlySavings] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [selectedBalanceForGoal, setSelectedBalanceForGoal] = useState('');
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [calculatedResult, setCalculatedResult] = useState(null);
  
  const user = auth.currentUser;
  const { isAdmin } = useUserRole(user?.uid);
  const { formatCurrency } = useCurrency();
  const { balances, loadBalances } = useBalances();

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'goals'));
    const goalsData = [];
    querySnapshot.forEach((doc) => {
      goalsData.push({ id: doc.id, ...doc.data() });
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
    showSuccess('Goal created!');
  };

  const deleteGoal = async (id) => {
    if (window.confirm('Delete this goal?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
      loadGoals();
      showSuccess('Goal deleted');
    }
  };

  const addFundsToGoal = async (goalId, amount, fromBalanceId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const addAmountValue = parseFloat(amount);
    if (isNaN(addAmountValue) || addAmountValue <= 0) {
      showError('Please enter a valid amount');
      return;
    }
    
    const newSavedAmount = goal.savedAmount + addAmountValue;
    if (newSavedAmount > goal.targetAmount) {
      showError(`Cannot exceed goal target of ${formatCurrency(goal.targetAmount)}`);
      return;
    }
    
    try {
      // 1. Atualizar a meta
      const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
      await updateDoc(goalRef, { savedAmount: newSavedAmount });
      
      // 2. Se veio de um balance, atualizar o balance (retirar o dinheiro)
      if (fromBalanceId) {
        const balance = balances.find(b => b.id === fromBalanceId);
        if (balance) {
          const newBalance = balance.amount - addAmountValue;
          const balanceRef = doc(db, 'users', user.uid, 'balances', fromBalanceId);
          await updateDoc(balanceRef, { amount: newBalance });
          
          // Recarregar balances
          if (loadBalances) await loadBalances();
        }
      }
      
      // 3. Criar transação de registro
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        amount: addAmountValue,
        description: `Contribution to goal: ${goal.name}${fromBalanceId ? ` (from ${balances.find(b => b.id === fromBalanceId)?.name})` : ''}`,
        category: 'Savings',
        type: 'transfer',
        date: new Date(),
        userId: user.uid,
        goalId: goalId,
        fromBalanceId: fromBalanceId || null
      });
      
      showSuccess(`${formatCurrency(addAmountValue)} added to "${goal.name}"!`);
      setAddAmount('');
      setAddFromBalance('');
      setShowAddFunds(null);
      loadGoals();
    } catch (error) {
      console.error('Error adding funds:', error);
      showError('Failed to add funds');
    }
  };

  const calculateProjection = () => {
    const monthly = parseFloat(monthlySavings);
    const goal = parseFloat(savingsGoal);
    const selectedBalance = balances.find(b => b.id === selectedBalanceForGoal);
    const currentBalance = selectedBalance?.amount || 0;
    
    if (isNaN(monthly) || monthly <= 0) {
      setCalculatedResult({ error: 'Please enter a valid monthly amount' });
      return;
    }
    
    const projections = [];
    let savedSoFar = 0;
    
    for (let i = 1; i <= projectionMonths; i++) {
      savedSoFar += monthly;
      projections.push({
        month: i,
        saved: savedSoFar,
        totalWithBalance: currentBalance + savedSoFar
      });
    }
    
    let monthsToGoal = null;
    if (goal && goal > 0) {
      let saved = 0;
      let months = 0;
      while (saved < goal && months < 120) {
        saved += monthly;
        months++;
      }
      monthsToGoal = saved >= goal ? months : null;
    }
    
    const finalSaved = projections[projections.length - 1]?.saved || 0;
    
    setCalculatedResult({
      projections,
      monthsToGoal,
      finalSaved: finalSaved,
      finalBalanceWithCurrent: currentBalance + finalSaved,
      startBalance: currentBalance,
      monthlyAmount: monthly,
      goal: goal > 0 ? goal : null,
      currentBalance
    });
  };

  const createGoalFromCalculator = async () => {
    if (!savingsGoal) {
      alert('Please enter a goal amount');
      return;
    }
    
    const goalName = savingsGoal ? `Save ${formatCurrency(parseFloat(savingsGoal))}` : 'Savings Goal';
    
    await addDoc(collection(db, 'users', user.uid, 'goals'), {
      name: goalName,
      targetAmount: parseFloat(savingsGoal),
      savedAmount: 0,
      createdAt: new Date(),
      monthlyTarget: parseFloat(monthlySavings) || 0
    });
    
    alert('Goal created from your savings plan!');
    setShowCalculator(false);
    loadGoals();
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
            <button className="calculator-btn" onClick={() => setShowCalculator(!showCalculator)}>
              <Calculator size={18} /> Savings Planner
            </button>
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="goals-content">
          {/* Savings Calculator Modal */}
          <AnimatePresence>
            {showCalculator && (
              <motion.div 
                className="calculator-modal"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="calculator-card">
                  <h3>📊 Savings Projection Calculator</h3>
                  <p className="calculator-desc">See how your money grows with monthly savings!</p>
                  
                  <div className="calculator-form">
                    <div className="calc-field">
                      <label>Monthly Savings Amount</label>
                      <input
                        type="number"
                        placeholder="e.g., 200"
                        value={monthlySavings}
                        onChange={(e) => setMonthlySavings(e.target.value)}
                      />
                    </div>
                    
                    <div className="calc-field">
                      <label>Goal Amount</label>
                      <input
                        type="number"
                        placeholder="e.g., 5000"
                        value={savingsGoal}
                        onChange={(e) => setSavingsGoal(e.target.value)}
                      />
                    </div>
                    
                    <div className="calc-field">
                      <label>Projection Period (months)</label>
                      <select value={projectionMonths} onChange={(e) => setProjectionMonths(parseInt(e.target.value))}>
                        <option value={6}>6 months</option>
                        <option value={12}>1 year (12 months)</option>
                        <option value={24}>2 years (24 months)</option>
                        <option value={36}>3 years (36 months)</option>
                        <option value={48}>4 years (48 months)</option>
                        <option value={60}>5 years (60 months)</option>
                      </select>
                    </div>
                    
                    <button className="calc-btn" onClick={calculateProjection}>
                      <TrendingUp size={16} /> Calculate Projection
                    </button>
                  </div>
                  
                  {calculatedResult && !calculatedResult.error && (
                    <div className="calculator-results">
                      <h4>📈 Savings Projection</h4>
                      <div className="result-stats">
                        <div className="result-stat">
                          <span>📅 Monthly Savings:</span>
                          <strong>{formatCurrency(calculatedResult.monthlyAmount)}</strong>
                        </div>
                        <div className="result-stat highlight">
                          <span>💵 Total Saved after {projectionMonths} months:</span>
                          <strong>{formatCurrency(calculatedResult.finalSaved)}</strong>
                        </div>
                        
                        {calculatedResult.goal && (
                          <div className={`result-stat ${calculatedResult.monthsToGoal ? 'success' : 'warning'}`}>
                            <span>🎯 Goal: {formatCurrency(calculatedResult.goal)}</span>
                            <strong>
                              {calculatedResult.monthsToGoal 
                                ? `Reached in ${calculatedResult.monthsToGoal} months! 🎉` 
                                : `Not reached in ${projectionMonths} months (need ${formatCurrency(calculatedResult.goal - calculatedResult.finalSaved)} more)`}
                            </strong>
                          </div>
                        )}
                      </div>
                      
                      <div className="calculator-actions">
                        <button className="create-goal-btn" onClick={createGoalFromCalculator}>
                          <Target size={16} /> Create Goal from This Plan
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <button className="close-calc-btn" onClick={() => setShowCalculator(false)}>
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Add Goal Form */}
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

          {/* Goals List */}
          <div className="goals-list">
            <h3>Your Goals</h3>
            {goals.length === 0 ? (
              <div className="empty-state">
                <Target size={48} />
                <p>No goals yet. Start saving today!</p>
                <p className="empty-hint">Use the Savings Planner to create a goal or add one manually.</p>
              </div>
            ) : (
              goals.map((goal) => {
                const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                const remaining = goal.targetAmount - goal.savedAmount;
                return (
                  <div key={goal.id} className="goal-card">
                    <div className="goal-info">
                      <h3>{goal.name}</h3>
                      <p>Target: {formatCurrency(goal.targetAmount)}</p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {progress.toFixed(0)}% achieved ({formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)})
                      </span>
                      {remaining > 0 && (
                        <span className="remaining-text">
                          {formatCurrency(remaining)} left to reach goal
                        </span>
                      )}
                      {goal.monthlyTarget > 0 && (
                        <span className="monthly-target-badge">
                          📅 Suggested monthly: {formatCurrency(goal.monthlyTarget)}
                        </span>
                      )}
                    </div>
                    <div className="goal-actions">
                      <button 
                        onClick={() => setShowAddFunds(goal.id)} 
                        className="add-funds-btn"
                      >
                        <Plus size={16} /> Add Funds
                      </button>
                      <button onClick={() => deleteGoal(goal.id)} className="delete-goal">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Add Funds Modal for this goal */}
                    {showAddFunds === goal.id && (
                      <div className="add-funds-modal">
                        <div className="add-funds-content">
                          <h4>Add funds to "{goal.name}"</h4>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={addAmount}
                            onChange={(e) => setAddAmount(e.target.value)}
                          />
                          <select 
                            value={addFromBalance} 
                            onChange={(e) => setAddFromBalance(e.target.value)}
                          >
                            <option value="">From where?</option>
                            {balances.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({formatCurrency(b.amount)})
                              </option>
                            ))}
                          </select>
                          <div className="modal-buttons">
                            <button onClick={() => addFundsToGoal(goal.id, addAmount, addFromBalance)}>
                              Add
                            </button>
                            <button onClick={() => {
                              setShowAddFunds(null);
                              setAddAmount('');
                              setAddFromBalance('');
                            }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Goals;