import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useEffect, useState } from 'react';

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Session, createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createClient } from '@supabase/supabase-js'

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const queryClient = new QueryClient();
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const [session, setSession] = useState(null);

  let loading: boolean = true;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
    });

    return () => subscription.unsubscribe();
  }, [loading])

  if (session) return (
    <div className={inter.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
        <Component {...pageProps} />
        </SessionContextProvider>
      </QueryClientProvider>
    </div>
  );

  return (
    <Auth
      appearance={{ theme: ThemeSupa, style: { container: { backgroundColor: "whitesmoke" } } }}
      magicLink={true}
      redirectTo={process.env.NEXT_PUBLIC_SUPABASE_REDIRECT!}
      showLinks={false}
      supabaseClient={supabaseClient}
      view='magic_link'
    />
  );
}

export default appWithTranslation(App);
