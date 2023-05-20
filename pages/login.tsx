// pages/login.tsx

import React, { useState } from 'react';
import { useRouter } from 'next/router';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Use Next.js's useRouter hook
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === '123' && password === '123') {
      // set a flag in LocalStorage
      localStorage.setItem('isLoggedIn', 'true');
      // Redirect to the home page using Next.js's router
      router.push('/');
    } else {
      alert('Incorrect credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Log in</button>
    </form>
  );
};

export default LoginPage;