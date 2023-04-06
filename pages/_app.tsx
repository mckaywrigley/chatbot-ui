import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import LoginForm from '../components/Settings/LoginForm';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });
const isBrowser = typeof window !== "undefined";

function App({ Component, pageProps }: AppProps<{}>) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isBrowser) {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }
  }, []);

  const authKey = process.env.NEXT_PUBLIC_AUTH_KEY;

  if (!isLoggedIn && authKey !== 'my-secret-auth-key') {
    // If the user is not logged in and the auth key doesn't match, show the login form
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <div className={inter.className}>
      <Toaster />
      <Component {...pageProps} />
    </div>
  );
}

export default appWithTranslation(App);
