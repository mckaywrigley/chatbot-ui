import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from 'nextjs-google-analytics';
import Script from 'next/script';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={inter.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        <GoogleAnalytics trackPageViews />
      {
        process.env.GOOGLE_ADSENSE_CLIENT && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.GOOGLE_ADSENSE_CLIENT}`}
            async
          />
        )
      }
      </QueryClientProvider>
    </div>
  );
}

export default appWithTranslation(App);
