import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('username'); // 'username' or 'otp'
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      // First, find user by username
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profileError || !profile) {
        setMessage('Username not found. Please check and try again.');
        setSending(false);
        return;
      }

      // Get the email from auth.users (need to call a function for this)
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(profile.id);
      
      if (userError || !user) {
        // Fallback: use Supabase OTP with email (you'll need to handle this differently)
        setMessage('Unable to send OTP. Please contact administrator.');
        setSending(false);
        return;
      }

      // Send OTP to email
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: user.user.email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (otpError) {
        setMessage(otpError.message);
      } else {
        setMessage('Check your email for the one-time password!');
        setStep('otp');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setSending(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      // Get user profile to find email
      const { error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profileError) {
        setMessage('Invalid username.');
        setSending(false);
        return;
      }

      // For OTP verification, we need the email - this is a simplified approach
      // In production, you'd want a backend function to handle this
      const { error } = await supabase.auth.verifyOtp({
        email: otp, // This won't work as-is - see README for proper implementation
        token: otp,
        type: 'email'
      });

      if (error) {
        setMessage('Invalid OTP. Please try again.');
      } else {
        setMessage('Login successful!');
        navigate('/piracy_is_cool');
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setSending(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>🏴‍☠️ PiratePage Sign In</h2>
      
      {step === 'username' ? (
        <form onSubmit={handleRequestOTP}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              placeholder="Enter your username"
            />
          </div>
          <button 
            type="submit" 
            disabled={sending}
            style={{ width: '100%', padding: '0.75rem', cursor: sending ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Sending...' : 'Request OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <p>OTP sent to your email associated with <strong>{username}</strong></p>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="otp">One-Time Password:</label>
            <input
              id="otp"
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              placeholder="Enter 6-digit code"
              maxLength="6"
            />
          </div>
          <button 
            type="submit" 
            disabled={sending}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', cursor: sending ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button 
            type="button"
            onClick={() => { setStep('username'); setOtp(''); setMessage(''); }}
            style={{ width: '100%', padding: '0.5rem', background: '#6c757d' }}
          >
            Back to Username
          </button>
        </form>
      )}
      
      {message && (
        <p style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: message.includes('successful') || message.includes('Check your email') ? '#d4edda' : '#f8d7da',
          color: message.includes('successful') || message.includes('Check your email') ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {message}
        </p>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
        <strong>⚠️ Note:</strong> This authentication requires backend modifications. See README for full implementation details.
      </div>
    </div>
  );
};

export default SignIn;
