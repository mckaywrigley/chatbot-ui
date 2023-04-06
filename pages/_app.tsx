import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { FontProvider } from '../components/Settings/FontContext';

function App({ Component, pageProps }: AppProps<{}>) {
  return (
    <FontProvider>
      <Toaster />
      <Component {...pageProps} />
    </FontProvider>
  );
}

export default appWithTranslation(App);
