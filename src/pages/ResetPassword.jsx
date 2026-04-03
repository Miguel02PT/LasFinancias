// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase/config';
import { confirmPasswordReset } from 'firebase/auth';
import './Login.css';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
    } else {
      setError('Invalid or missing reset code. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (!oobCode) {
      setError('Invalid reset code. Please request a new password reset.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.code === 'auth/expired-action-code') {
        setError('Reset link has expired. Please request a new one.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('Invalid reset link. Please request a new one.');
      } else {
        setError(err.message);
      }
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
        
        {success ? (
          <>
            <h2>Password Reset Successful!</h2>
            <p className="reset-info">Your password has been changed successfully.</p>
            <p className="reset-info">Redirecting you to login page...</p>
            <Link to="/login" className="back-to-login-btn">
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <h2>Reset Your Password</h2>
            <p className="reset-info">Enter your new password below.</p>
            
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleResetPassword}>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading || !oobCode}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || !oobCode}
              />
              <button type="submit" disabled={loading || !oobCode}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            
            <Link to="/login" className="back-to-login-btn">
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;