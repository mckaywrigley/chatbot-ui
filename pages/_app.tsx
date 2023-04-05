import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { ConversationProvider } from '@/utils/contexts/conversaionContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  return (
    <main className={inter.className}>
      <Toaster />
      <ConversationProvider>
        <Component {...pageProps} />
      </ConversationProvider>
    </main>
  );
}

export default appWithTranslation(App);
