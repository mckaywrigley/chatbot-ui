import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Analytics } from '@vercel/analytics/react';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { ModelContextProvider } from '@/hooks';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={inter.className}>
      <Toaster />
      <ModelContextProvider>
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
          <Analytics />
        </QueryClientProvider>
      </ModelContextProvider>
    </div>
  );
}

export default appWithTranslation(App);
