import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from "nextjs-google-analytics";
const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
      <Analytics />
      <GoogleAnalytics trackPageViews />
    </main>
  );
}

export default appWithTranslation(App);
