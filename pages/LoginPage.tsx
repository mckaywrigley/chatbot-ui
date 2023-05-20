import { useState } from 'react';
import { useRouter } from 'next/router';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check if the entered credentials are correct
    if (username === '123' && password === '123') {
      // Redirect to the home page
      router.push('/');
    } else {
      // Handle incorrect credentials
      console.log('Invalid credentials');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">Log In</button> {/* Button element for login */}
      </form>
    </div>
  );
}

export default LoginPage;
