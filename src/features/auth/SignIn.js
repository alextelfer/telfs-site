import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
// import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
//   const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
    }

    setSending(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Sign In</h2>
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default SignIn;
