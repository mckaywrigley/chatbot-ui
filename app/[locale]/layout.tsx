// app > locale > layout.tsx
import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
})
const APP_NAME = "Rooftops AI"
const APP_DEFAULT_TITLE =
  "Rooftops AI | Instant Roofing Reports & AI Tools for Contractors"
const APP_TITLE_TEMPLATE = "%s | Rooftops AI"
const APP_DESCRIPTION =
  "AI-powered roofing reports and tools for contractors. Get instant roof measurements, AI chatbots, and marketing automation. Start with 3 free reports."

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rooftops AI - AI-powered tools for roofing contractors"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: ["/og-image.png"]
  }
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
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

  console.log("Layout rendering with session:", !!session)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.className}>
        <Providers attribute="class" defaultTheme="light">
          <TranslationsProvider
            namespaces={i18nNamespaces}
            locale={locale}
            resources={resources}
          >
            <Toaster
              richColors
              position="top-center"
              duration={3500}
              closeButton
              expand={false}
              visibleToasts={3}
            />
            <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
              {session ? <GlobalState>{children}</GlobalState> : children}
            </div>
          </TranslationsProvider>
        </Providers>
      </body>
    </html>
  )
}
