import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      // Send OTP directly with Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/piracy_is_cool`,
        }
      });

      if (error) {
        if (error.message.includes('429') || error.status === 429) {
          setMessage('Too many requests. Please wait a few minutes before trying again.');
        } else {
          setMessage(error.message);
        }
      } else {
        setMessage('Check your email for the magic link! Click the link to sign in, or enter the 6-digit code if provided.');
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
      // Verify the OTP token
      const {  error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email'
      });

      if (error) {
        setMessage('Invalid OTP. Please try again.');
      } else {
        setMessage('Login successful!');
        setTimeout(() => navigate('/piracy_is_cool'), 1000);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }

    setSending(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>piracy is cool again</h2>
      
      {step === 'email' ? (
        <form onSubmit={handleRequestOTP}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email">email:</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              placeholder="Enter your email"
            />
          </div>
          <button 
            type="submit" 
            disabled={sending}
            style={{ width: '100%', padding: '0.75rem', cursor: sending ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Sending...' : 'gimme link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <p>OTP sent to <strong>{email}</strong></p>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="otp">One-Time Password (optional):</label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              placeholder="Enter 6-digit code (or use magic link)"
              maxLength="6"
            />
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
              You can click the magic link in your email, or enter the code if provided.
            </small>
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
            onClick={() => { setStep('email'); setOtp(''); setMessage(''); }}
            style={{ width: '100%', padding: '0.5rem', background: '#6c757d' }}
          >
            Back to Email
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
    </div>
  );
};

export default SignIn;
