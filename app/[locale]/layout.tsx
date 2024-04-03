import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import { GlobalAlertDialog } from "./global-alert-dialog"
import { PluginProvider } from "@/components/chat/chat-hooks/PluginProvider"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "HackerGPT"
const APP_DEFAULT_TITLE = "HackerGPT | #1 Trusted Ethical Hacking AI"
const APP_TITLE_TEMPLATE = "%s - HackerGPT"
const APP_DESCRIPTION =
  "Unlock the power of HackerGPT, your AI ethical hacking assistant, trained extensively on hacking knowledge. Swiftly identify, exploit, and mitigate vulnerabilities using cutting-edge AI expertise in hacking."

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  metadataBase: new URL("https://chat.hackerai.co"),
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "https://chat.hackerai.co/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "HackerGPT"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "https://chat.hackerai.co/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "HackerGPT"
      }
    ]
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}

const i18nNamespaces = ["translation"]

export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={inter.className + " h-full"}>
        <Providers attribute="class" defaultTheme="dark">
          <TranslationsProvider
            namespaces={i18nNamespaces}
            locale={locale}
            resources={resources}
          >
            <PluginProvider>
              <Toaster richColors position="top-center" duration={3000} />
              <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
                {session ? <GlobalState>{children}</GlobalState> : children}
              </div>
              <GlobalAlertDialog />
            </PluginProvider>
          </TranslationsProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
