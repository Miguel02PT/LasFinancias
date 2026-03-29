import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { createSubscription } from '../services/subscriptionService';
import { FcGoogle } from 'react-icons/fc';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Criar documento de user com subscription FREE
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: userCred.user.email,
          subscription: 'free',
          role: 'user',
          createdAt: Timestamp.now(),
          invoiceScans: 0,
          aiChatTotal: 0
        });

        // Criar subscription FREE
        await createSubscription(userCred.user.uid, 'free');
        
        console.log('✅ Novo user criado com FREE subscription');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verificar se é novo user
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Novo user via Google - criar com FREE subscription
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          subscription: 'free',
          role: 'user',
          createdAt: Timestamp.now(),
          invoiceScans: 0,
          aiChatTotal: 0
        });

        // Criar subscription FREE
        await createSubscription(user.uid, 'free');
        
        console.log('✅ Novo user Google criado com FREE subscription');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ cursor: 'pointer' }}>LasFinancias</h1>
        </Link>
        <h2>{isRegister ? 'Create Account' : 'Sign In'}</h2>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <button 
          className="google-btn" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <FcGoogle size={20} />
          Continue with Google
        </button>
        
        <button className="toggle-btn" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account?' : 'Create new account'}
        </button>
      </div>
    </div>
  );
}

export default Login;