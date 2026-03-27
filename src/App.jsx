import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase/config';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Goals from './pages/Goals';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import Recurring from './pages/Recurring';
import { PageTransition } from './components/PageTransition';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Router>
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
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;