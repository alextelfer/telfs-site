import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: process.env.REACT_APP_REDIRECT_URL || `${window.location.origin}/piracy_is_cool`,
        }
      });

      if (error) {
        // Check for rate limit error
        if (error.message.includes('429') || 
            error.status === 429 || 
            error.message.includes('rate limit') ||
            error.code === 'over_email_send_rate_limit') {
          setMessage('⚠️ Email rate limit exceeded. Please wait 5-10 minutes before trying again.');
          setCooldown(300); // 5 minute cooldown
        } else {
          setMessage(error.message);
        }
      } else {
        setLinkSent(true);
        setCooldown(60); // 60 second cooldown after successful send
      }
    } catch (err) {
      if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        setMessage('❌ Network error. Please check your internet connection and try again.');
      } else {
        setMessage(`Error: ${err.message}`);
      }
    }

    setSending(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>piracy is cool again</h2>
      
      {!linkSent ? (
        <form onSubmit={handleRequestMagicLink}>
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
            disabled={sending || cooldown > 0}
            style={{ width: '100%', padding: '0.75rem', cursor: (sending || cooldown > 0) ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'gimme link'}
          </button>
        </form>
      ) : (
        <div style={{ 
          padding: '1.5rem', 
          background: '#d4edda', 
          color: '#155724',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginTop: 0 }}>✓ Check your email!</h3>
          <p>We've sent a magic link to <strong>{email}</strong></p>
          <p>Click the link in your email to sign in.</p>
          <button 
            onClick={() => { setLinkSent(false); setEmail(''); }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Try different email
          </button>
        </div>
      )}
      
      {message && !linkSent && (
        <p style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default SignIn;
