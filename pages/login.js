// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      setError(null);
      router.push('/');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="p-10">
    <h1 className="text-3xl font-medium mb-5 text-gray-400">8o.vc</h1>
    <form onSubmit={handleSubmit}>
      <label className="block mb-2">
        <input
          className="w-full border-2 border-gray-400 p-2 rounded-md focus:outline-none focus:border-blue-500"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="block mb-2">
        <input
          className="w-full border-2 border-gray-400 p-2 rounded-md focus:outline-none focus:border-blue-500"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-bold text-white rounded-md shadow-2xl group">
        <span className="absolute inset-0 w-full h-full transition duration-300 ease-out opacity-0 bg-gradient-to-br from-pink-600 via-purple-700 to-blue-400 group-hover:opacity-100"></span>
        {/* Top glass gradient */}
        <span className="absolute top-0 left-0 w-full bg-gradient-to-b from-white to-transparent opacity-5 h-1/3"></span>
        {/* Bottom gradient */}
        <span className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-white to-transparent opacity-5"></span>
        {/* Left gradient */}
        <span className="absolute bottom-0 left-0 w-4 h-full bg-gradient-to-r from-white to-transparent opacity-5"></span>
        {/* Right gradient */}
        <span className="absolute bottom-0 right-0 w-4 h-full bg-gradient-to-l from-white to-transparent opacity-5"></span>
        <span className="absolute inset-0 w-full h-full border border-white rounded-md opacity-10"></span>
        <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-5"></span>
        <span className="relative">Login</span>
      </button>
    </form>
    {error && <p className="text-red-400 mt-3">{error}</p>}
  </div>
  );
}
