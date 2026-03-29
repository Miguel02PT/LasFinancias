import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Maximize2, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCurrency } from '../context/CurrencyContext';
import { useBalances } from '../context/BalancesContext';
import { db } from '../firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';
import { groqChatCompletion } from '../services/groqClient';
import { getAiChatQuota, incrementAiChatMessageCount } from '../services/subscriptionService';
import { showError } from './Toast';
import './AIChat.css';

function AIChat({ transactions, user, isOpen: externalIsOpen, setIsOpen: externalSetIsOpen }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(null);
  const messagesEndRef = useRef(null);
  const { formatCurrency } = useCurrency();
  const { balances } = useBalances();

  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [initialBalanceName, setInitialBalanceName] = useState('Starting Balance');

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;

  useEffect(() => {
    if (user?.uid) {
      const savedBalance = localStorage.getItem(`initialBalance_${user.uid}`);
      if (savedBalance) setInitialBalance(parseFloat(savedBalance));
      const savedName = localStorage.getItem(`initialBalanceName_${user.uid}`);
      if (savedName) setInitialBalanceName(savedName);

      const loadGoals = async () => {
        const q = query(collection(db, 'users', user.uid, 'goals'));
        const snapshot = await getDocs(q);
        const goalsData = [];
        snapshot.forEach((d) => goalsData.push({ id: d.id, ...d.data() }));
        setGoals(goalsData);
      };

      const loadBudgets = async () => {
        const q = query(collection(db, 'users', user.uid, 'budgets'));
        const snapshot = await getDocs(q);
        const budgetsData = [];
        snapshot.forEach((d) => budgetsData.push({ id: d.id, ...d.data() }));
        setBudgets(budgetsData);
      };

      const loadRecurring = async () => {
        const q = query(collection(db, 'users', user.uid, 'recurring'));
        const snapshot = await getDocs(q);
        const recurringData = [];
        snapshot.forEach((d) => recurringData.push({ id: d.id, ...d.data() }));
        setRecurring(recurringData);
      };

      loadGoals();
      loadBudgets();
      loadRecurring();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    getAiChatQuota(user.uid).then(setQuota);
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !isOpen) return;
    // Refresh quota whenever chat opens
    getAiChatQuota(user.uid).then(setQuota);
  }, [isOpen, user?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (user?.uid) {
      const saved = localStorage.getItem(`chat_history_${user.uid}`);
      if (saved) {
        try {
          const history = JSON.parse(saved);
          setMessages(history);
        } catch (e) {}
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid && messages.length > 0) {
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const getFinancialContext = () => {
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const categories = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const balancesData = balances.map((b) => ({ name: b.name, amount: b.amount, includeInTotal: b.includeInTotal }));
    const totalBalances = balances.filter((b) => b.includeInTotal).reduce((sum, b) => sum + b.amount, 0);
    const netWorth = totalBalances + initialBalance;

    const monthlyIncome = recurring.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const monthlyExpense = recurring.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySpending = transactions
      .filter((t) => {
        const date = t.date?.toDate();
        return t.type === 'expense' && date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      netWorth: formatCurrency(netWorth),
      initialBalance: { name: initialBalanceName, amount: formatCurrency(initialBalance) },
      balances: balancesData.map((b) => ({ name: b.name, amount: formatCurrency(b.amount) })),
      recurring: recurring.map((r) => ({
        description: r.description,
        amount: formatCurrency(r.amount),
        type: r.type,
        frequency: r.frequency
      })),
      monthlyIncome: formatCurrency(monthlyIncome),
      monthlyExpense: formatCurrency(monthlyExpense),
      monthlyCashFlow: formatCurrency(monthlyIncome - monthlyExpense),
      monthlySpending: formatCurrency(monthlySpending),
      goals: goals.map((g) => ({
        name: g.name,
        target: formatCurrency(g.targetAmount),
        saved: formatCurrency(g.savedAmount || 0)
      })),
      budgets: budgets.map((b) => ({ category: b.category, limit: formatCurrency(b.limit) })),
      totalIncome: formatCurrency(totalIncome),
      totalExpense: formatCurrency(totalExpense),
      savingsRate: totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0,
      topCategory: Object.keys(categories).reduce((a, b) => (categories[a] > categories[b] ? a : b), 'none'),
      recentTransactions: transactions.slice(0, 5).map((t) => ({
        description: t.description,
        amount: formatCurrency(t.amount),
        type: t.type,
        category: t.category
      }))
    };
  };

  const clearChat = () => {
    setMessages([]);
    if (user?.uid) {
      localStorage.removeItem(`chat_history_${user.uid}`);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !user?.uid) return;

    const q = await getAiChatQuota(user.uid);
    if (!q.allowed) {
      showError(q.message || 'AI chat is not available on your plan.');
      return;
    }

    const userMessage = { id: Date.now(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const ctx = getFinancialContext();

      const prompt = `Here is the user's financial data from LasFinancias. Answer naturally, like you normally would. No extra rules.

${JSON.stringify(ctx, null, 2)}

User question: "${trimmed}"`;

      const { content: textRaw } = await groqChatCompletion({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000
      });

      const reply = textRaw || "Sorry, I couldn't process that.";

      if (q.plan === 'free' || q.plan === 'pro') {
        await incrementAiChatMessageCount(user.uid);
        // Refresh quota after incrementing
        const updatedQuota = await getAiChatQuota(user.uid);
        setQuota(updatedQuota);
      }

      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      const details = error?.details ? ` (${error.details})` : '';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `❌ Error: ${errorMsg}${details}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const chatLocked = quota && !quota.allowed;
  const inputDisabled = loading || (quota && !quota.allowed);

  return (
    <>
      <button type="button" className={`chat-button ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        <Sparkles size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`chat-window ${isMinimized ? 'minimized' : ''}`}
          >
            <div className="chat-header">
              <div className="chat-header-left">
                <Sparkles size={20} />
                <span>AI Assistant</span>
              </div>
              <div className="chat-header-actions">
                <button type="button" onClick={clearChat} title="Clear chat">
                  <Trash2 size={16} />
                </button>
                <button type="button" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                </button>
                <button type="button" onClick={() => setIsOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {quota?.plan === 'free' && quota.limit > 0 && (
              <div className="chat-quota">
                Free: {quota.remaining} / {quota.limit} AI messages left
              </div>
            )}
            {quota?.plan === 'pro' && quota.limit > 0 && (
              <div className="chat-quota">
                Pro: {quota.remaining} / {quota.limit} AI messages left today
              </div>
            )}
            {quota?.plan === 'premium' && (
              <div className="chat-quota chat-quota--muted">Premium: unlimited AI chat</div>
            )}

            {!isMinimized && (
              <>
                <div className="chat-messages">
                  {!quota && (
                    <div className="welcome-message">
                      <p>Loading…</p>
                    </div>
                  )}
                  {quota?.plan === 'free' && quota.remaining === 0 && (
                    <div className="welcome-message">
                      <p>
                        You've used all 5 free AI messages. <strong>Upgrade to Pro</strong> for 5 messages/day or
                        <strong> Premium</strong> for unlimited.
                      </p>
                      <p>
                        <Link to="/pricing">View plans</Link>
                      </p>
                    </div>
                  )}
                  {quota?.plan === 'free' && quota.remaining > 0 && messages.length === 0 && (
                    <div className="welcome-message">
                      <p>Ask anything about your finances. I can use your LasFinancias data in this session.</p>
                      <p style={{ fontSize: '0.85em', opacity: 0.7 }}>({quota.remaining} free messages left)</p>
                    </div>
                  )}
                  {quota && quota.plan !== 'free' && messages.length === 0 && (
                    <div className="welcome-message">
                      <p>Ask anything about your finances. I can use your LasFinancias data in this session.</p>
                    </div>
                  )}
                  {quota &&
                    messages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="message-content">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  {loading && (
                    <div className="message assistant typing">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={!quota ? 'Loading...' : (chatLocked ? 'Upgrade to use AI chat' : 'Ask anything...')}
                    rows={1}
                    disabled={inputDisabled}
                  />
                  <button type="button" onClick={sendMessage} disabled={inputDisabled || !input.trim()}>
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIChat;
