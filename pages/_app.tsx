import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import { getAuth } from '@/utils/app/extensions/auth';

import '@/styles/globals.css';
import { Auth } from 'chatbot-ui-core';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{ session: any }>) {
  const auth: Auth = getAuth();
  const queryClient = new QueryClient();

  return (
    <>
      <auth.AuthProvider session={pageProps.session}>
        <div className={inter.className}>
          <Toaster />
          <QueryClientProvider client={queryClient}>
            <Component {...pageProps} />
          </QueryClientProvider>
        </div>
      </auth.AuthProvider>
      <Analytics />
    </>
  );
}

export default appWithTranslation(App);
