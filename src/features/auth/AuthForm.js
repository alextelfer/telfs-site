import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const AuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg('Incorrect email or password.');
    } else {
      window.location.href = '/photos'; // Redirect after successful login
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <h2>Sign In</h2>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign In</button>
    </form>
  );
};

export default AuthForm;
