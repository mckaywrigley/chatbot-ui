import { Session, SessionContextProvider } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from 'nextjs-google-analytics';
import ua from 'universal-analytics';

import '@/styles/globals.css';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const queryClient = new QueryClient();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  
  if(process.env.NEXT_PUBLIC_ENV === 'production'){
    const visitor = ua('UA-215785877-2'); // To be removed once ads audit has passed or switch to other analytics
    visitor.pageview("/");
  }

  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={pageProps.initialSession}
    >
      <div className={inter.className}>
        <Toaster />
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
          <GoogleAnalytics trackPageViews strategy="lazyOnload"/>
        </QueryClientProvider>
      </div>
    </SessionContextProvider>
  );
}

export default appWithTranslation(App);
