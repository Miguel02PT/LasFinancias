import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Recurring from './pages/Recurring';
import Admin from './pages/Admin';
import { PageTransition } from './components/PageTransition';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';
import SavingsRules from './pages/SavingsRules';
import Feedback from './pages/Feedback';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', authUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          } else {
            setUserRole('user');
          }
        } catch (err) {
          console.error('Error loading user role:', err);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Router>
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <PageTransition>
                <Home user={user} />
              </PageTransition>
            } />
            <Route path="/login" element={
              !user ? (
                <PageTransition>
                  <Login />
                </PageTransition>
              ) : (
                <Navigate to="/dashboard" />
              )
            } />
            <Route path="/feedback" element={
              user ? (
                <PageTransition>
                  <Feedback />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } />
            <Route path="/dashboard" element={
              user ? (
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } />
            <Route path="/transactions" element={
              user ? (
                <PageTransition>
                  <Transactions />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } />
            <Route path="/reports" element={
              user ? (
                <PageTransition>
                  <Reports />
                </PageTransition>
              ) : (
                <Navigate to="/login" />
              )
            } />
          <Route path="/goals" element={
            user ? (
              <PageTransition>
                <Goals />
              </PageTransition>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/recurring" element={
            user ? (
              <PageTransition>
                <Recurring />
              </PageTransition>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/budgets" element={
            user ? (
              <PageTransition>
                <Budgets />
              </PageTransition>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/settings" element={
            user ? (
              <PageTransition>
                <Settings />
              </PageTransition>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/pricing" element={
            user ? (
              <PageTransition>
                <Pricing />
              </PageTransition>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/admin" element={
            user && userRole === 'admin' ? (
              <PageTransition>
                <Admin />
              </PageTransition>
            ) : (
              <Navigate to="/dashboard" />
            )
          } />
          <Route path="/savings-rules" element={user ? <SavingsRules /> : <Navigate to="/login" />} />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
    </Router>
  );
}

export default App;