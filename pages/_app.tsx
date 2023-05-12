import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import '@/styles/globals.css';
import { AuthProvider } from 'chatbot-ui-authjs';
import { Session } from 'chatbot-ui-authjs';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{ session: Session }>) {
  const queryClient = new QueryClient();

  return (
    <AuthProvider session={pageProps.session}>
      <div className={inter.className}>
        <Toaster />
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </div>
    </AuthProvider>
  );
}

export default appWithTranslation(App);
