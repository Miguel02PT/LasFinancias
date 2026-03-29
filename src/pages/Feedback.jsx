import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { addDoc, collection } from 'firebase/firestore';
import { 
  Menu, X, Wallet, LayoutDashboard, Receipt, BarChart3, Target, Settings, LogOut,
  Bug, Lightbulb, Send, CheckCircle, AlertCircle, RefreshCw, PieChart, PiggyBank, MessageSquare
} from 'lucide-react';
import { showSuccess, showError } from '../components/ToastWithUndo';
import './Feedback.css';

// O teu ID do Formspree
const FORMSPREE_ID = 'mbdpdovr';

function Feedback() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const user = auth.currentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setSending(true);
    
    try {
      // 1. Guardar no Firebase
      await addDoc(collection(db, 'users', user.uid, 'feedback'), {
        type,
        title,
        description,
        status: 'pending',
        createdAt: new Date(),
        userEmail: user?.email,
        userId: user?.uid
      });
      
      // 2. Enviar email via Formspree
      const formData = new FormData();
      formData.append('type', type === 'bug' ? '🐛 Bug Report' : '💡 Suggestion');
      formData.append('title', title);
      formData.append('description', description);
      formData.append('user_email', user?.email);
      formData.append('date', new Date().toLocaleString());
      formData.append('user_id', user?.uid);
      
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setTitle('');
          setDescription('');
        }, 3000);
        showSuccess('Feedback sent! Thank you!');
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      showError('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
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
            <Link to={item.path} key={item.path} className={`nav-item ${item.path === '/feedback' ? 'active' : ''}`}>
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
          <h1>Feedback & Suggestions</h1>
          <div className="header-user">
            <span>{user?.email}</span>
          </div>
        </header>

        <div className="feedback-content">
          {sent ? (
            <div className="feedback-success-card">
              <CheckCircle size={48} />
              <h2>Thank You!</h2>
              <p>Your feedback has been sent successfully.</p>
              <p className="small">We'll review it and get back to you if needed.</p>
            </div>
          ) : (
            <div className="feedback-card">
              <div className="feedback-header-card">
                <MessageSquare size={32} />
                <h2>Help Us Improve</h2>
                <p>Your feedback helps us make LasFinancias better for everyone.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="feedback-type-selector">
                  <button
                    type="button"
                    className={type === 'bug' ? 'active' : ''}
                    onClick={() => setType('bug')}
                  >
                    <Bug size={18} />
                    Report a Bug
                  </button>
                  <button
                    type="button"
                    className={type === 'suggestion' ? 'active' : ''}
                    onClick={() => setType('suggestion')}
                  >
                    <Lightbulb size={18} />
                    Suggest Improvement
                  </button>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder={type === 'bug' ? "What's not working?" : "What's your idea?"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder={type === 'bug' 
                      ? "1. What were you doing?\n2. What did you expect?\n3. What happened instead?" 
                      : "Describe your idea and how it would help..."}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={6}
                  />
                </div>

                <button type="submit" disabled={sending} className="submit-feedback-btn">
                  {sending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>

              <div className="feedback-note">
                <AlertCircle size={14} />
                <span>We take all feedback seriously and will review it within 48 hours.</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Feedback;