import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '24px' },
  card: { width: '100%', maxWidth: '360px', background: '#fff', borderRadius: '16px', padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  title: { margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#111' },
  subtitle: { margin: '0 0 20px', fontSize: '14px', color: '#666' },
  label: { display: 'block', fontSize: '13px', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box', marginBottom: '16px' },
  button: { width: '100%', padding: '14px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  buttonDisabled: { background: '#a9cdfb', cursor: 'not-allowed' },
  success: { textAlign: 'center' },
  successIcon: { fontSize: '32px', marginBottom: '8px' },
  link: { marginTop: '16px', background: 'none', border: 'none', color: '#007aff', fontSize: '14px', cursor: 'pointer', padding: 0 },
  error: { marginTop: '14px', padding: '10px 12px', background: '#fdecea', color: '#a11', borderRadius: '10px', fontSize: '13px' },
};

const BackupSignIn = () => {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (session) {
    return <Navigate to="/backup" replace />;
  }

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/backup`,
        },
      });

      if (error) {
        if (error.message.includes('429') || error.status === 429 || error.message.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          setMessage('Email rate limit exceeded. Please wait 5-10 minutes before trying again.');
          setCooldown(300);
        } else {
          setMessage(error.message);
        }
      } else {
        setLinkSent(true);
        setCooldown(60);
      }
    } catch (err) {
      if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        setMessage('Network error. Please check your internet connection and try again.');
      } else {
        setMessage(`Error: ${err.message}`);
      }
    }

    setSending(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {!linkSent ? (
          <>
            <h1 style={styles.title}>Backup</h1>
            <p style={styles.subtitle}>Sign in to back up your photos and files.</p>
            <form onSubmit={handleRequestMagicLink}>
              <label style={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={sending || cooldown > 0}
                style={{ ...styles.button, ...((sending || cooldown > 0) ? styles.buttonDisabled : {}) }}
              >
                {sending ? 'Sending...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send magic link'}
              </button>
            </form>
            {message && <div style={styles.error}>{message}</div>}
          </>
        ) : (
          <div style={styles.success}>
            <div style={styles.successIcon}>✓</div>
            <h1 style={styles.title}>Check your email</h1>
            <p style={styles.subtitle}>We sent a sign-in link to <strong>{email}</strong>.</p>
            <button style={styles.link} onClick={() => { setLinkSent(false); setEmail(''); }}>
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupSignIn;
