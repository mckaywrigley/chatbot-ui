import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from 'nextjs-google-analytics';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  return (
    <div className={inter.className}>
      <Toaster />
      <Component {...pageProps} />
      <GoogleAnalytics trackPageViews />
      <Script
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.GOOGLE_ADSENSE_CLIENT}`}
        async
        onError={ (e) => { console.error('GA failed to load') }}
      />
    </div>
  );
}

export default appWithTranslation(App);
