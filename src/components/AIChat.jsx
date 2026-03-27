import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Maximize2, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCurrency } from '../context/CurrencyContext';
import './AIChat.css';

const GROQ_API_KEY = "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";

function AIChat({ transactions, user, isOpen: externalIsOpen, setIsOpen: externalSetIsOpen }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { formatCurrency } = useCurrency();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history from localStorage
  useEffect(() => {
    if (user?.uid) {
      const saved = localStorage.getItem(`chat_history_${user.uid}`);
      if (saved) {
        try {
          const history = JSON.parse(saved);
          setMessages(history);
        } catch (e) {}
      } else {
        // Welcome message
        setMessages([
          {
            id: Date.now(),
            role: 'assistant',
            content: `👋 Hi! I'm your AI financial assistant. I can help you with:\n\n📊 **Analyze your spending**\n💰 **Suggest savings tips**\n🎯 **Answer questions about your finances**\n\nAsk me anything about your money!`
          }
        ]);
      }
    }
  }, [user]);

  // Save chat history
  useEffect(() => {
    if (user?.uid && messages.length > 0) {
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const getFinancialContext = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categories = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
    
    const topCategory = Object.keys(categories).reduce((a, b) => 
      categories[a] > categories[b] ? a : b, 'none');
    
    const recentTransactions = transactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category
    }));
    
    return {
      totalIncome,
      totalExpense,
      savings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
      topCategory,
      categories,
      transactionCount: transactions.length,
      recentTransactions
    };
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: `👋 Hi! I'm your AI financial assistant. I can help you with:\n\n📊 **Analyze your spending**\n💰 **Suggest savings tips**\n🎯 **Answer questions about your finances**\n\nAsk me anything about your money!`
      }
    ]);
    if (user?.uid) {
      localStorage.removeItem(`chat_history_${user.uid}`);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const financialContext = getFinancialContext();
      
      const prompt = `You are a friendly financial assistant for LasFinancias app. The user is asking about their finances.

USER DATA:
- Total Income: ${formatCurrency(financialContext.totalIncome)}
- Total Expenses: ${formatCurrency(financialContext.totalExpense)}
- Savings: ${formatCurrency(financialContext.savings)}
- Savings Rate: ${financialContext.savingsRate}%
- Top Spending Category: ${financialContext.topCategory}
- Categories: ${JSON.stringify(financialContext.categories)}
- Number of transactions: ${financialContext.transactionCount}
- Recent transactions: ${JSON.stringify(financialContext.recentTransactions)}

USER QUESTION: "${input}"

Respond in a friendly, helpful way. Use markdown for formatting (bold, lists, etc.). Be concise but informative. Give specific advice based on their actual data. If they ask about something not in their data, explain that and suggest adding transactions.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || "Sorry, I couldn't process that request.";
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: text
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button 
        className={`chat-button ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`chat-window ${isMinimized ? 'minimized' : ''}`}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <Sparkles size={20} />
                <span>AI Financial Assistant</span>
              </div>
              <div className="chat-header-actions">
                <button onClick={clearChat} title="Clear chat">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="chat-messages">
                  {messages.map(msg => (
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

                {/* Input */}
                <div className="chat-input">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your finances..."
                    rows={1}
                  />
                  <button onClick={sendMessage} disabled={loading || !input.trim()}>
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