import { Session, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { GoogleAnalytics } from 'nextjs-google-analytics';

import '@/styles/globals.css';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const queryClient = new QueryClient();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={pageProps.initialSession}
    >
      <div className={inter.className}>
        <Toaster />
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
          <GoogleAnalytics trackPageViews />
          {process.env.GOOGLE_ADSENSE_CLIENT && (
            <Script
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.GOOGLE_ADSENSE_CLIENT}`}
              async
            />
          )}
        </QueryClientProvider>
      </div>
    </SessionContextProvider>
  );
}

export default appWithTranslation(App);
