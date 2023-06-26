import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import { Amplify } from 'aws-amplify';
import awsExports from '../src/aws-exports';

import '@/styles/globals.css';
import { UserProvider, useUser } from '@/services/authService';

Amplify.configure({ ...awsExports, ssr: true });

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={inter.className}>
      <UserProvider>
        <Toaster />
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </UserProvider>
    </div>
  );
}

export default appWithTranslation(App);
