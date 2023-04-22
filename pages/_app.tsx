import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

// <<<<<<< HEAD
import { ConversationProvider } from '@/utils/contexts/conversaionContext';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <main className={inter.className}>
      <Toaster />

      <QueryClientProvider client={queryClient}>
        {/* <ConversationProvider> */}
        <Component {...pageProps} />
        {/* </ConversationProvider> */}
      </QueryClientProvider>
    </main>
  );
}

export default appWithTranslation(App);
