import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import React, { useEffect } from "react";
import { useUserStore } from "@/store";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={inter.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sessionToken, validateSessionToken] = useUserStore((state) => [
    state.sessionToken,
    state.validateSessionToken,
  ]);

  useEffect(() => {
    // return router.replace("/");
    if (!sessionToken || !validateSessionToken()) {
      if (!["/login"].includes(pathname)) {
        return router.push("/login");
      }
    } else if (["/login"].includes(pathname)) {
      return router.replace("/");
    }
  }, [router, pathname, sessionToken, validateSessionToken]);

  return <>{children}</>;
}

export default appWithTranslation(App);
