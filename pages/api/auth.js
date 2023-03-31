// pages/api/auth.js
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';

const users = [
  {
    username: process.env.AUTH_USER,
    password: process.env.AUTH_PASSWORD,
  },
  // Add more users if necessary
];

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    const user = users.find((user) => user.username === username);

    if (user) {
      const isValid = await compare(password, user.password);

      // Debugging information
      console.log('Submitted username:', username);
      console.log('Submitted password:', password);
      console.log('Expected username:', user.username);
      console.log('Expected hashed password:', user.password);
      console.log('Password match:', isValid);

      if (isValid) {
        const token = sign({ sub: user.username }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });

        res.setHeader(
          'Set-Cookie',
          serialize('auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 3600,
            path: '/',
          })
        );

        return res.status(200).json({ message: 'Authenticated' });
      }
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
