import { Analytics } from "@vercel/analytics/react"
import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import "./globals.css"

// Fonts bundled locally (under `app/fonts/`) instead of being fetched
// from Google Fonts at render time. The Google path was looping through
// proxy redirects on some dev networks and exhausting undici's 20-hop
// redirect cap (`redirect count exceeded`), which crashed every RSC
// render. Local files = offline-resilient + no external network call.
// woff2 sourced from @fontsource(-variable) packages (OFL licensed).
const interTight = localFont({
  src: "../fonts/inter-tight-variable.woff2",
  // Variable font spanning weights 100-900 - we only use 400/500/600.
  weight: "100 900",
  display: "swap",
  variable: "--font-inter-tight"
})
const ibmPlexSans = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-sans-400.woff2",
      weight: "400",
      style: "normal"
    },
    {
      path: "../fonts/ibm-plex-sans-500.woff2",
      weight: "500",
      style: "normal"
    },
    { path: "../fonts/ibm-plex-sans-600.woff2", weight: "600", style: "normal" }
  ],
  display: "swap",
  variable: "--font-ibm-plex-sans"
})
const ibmPlexMono = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-mono-400.woff2",
      weight: "400",
      style: "normal"
    },
    { path: "../fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" }
  ],
  display: "swap",
  variable: "--font-ibm-plex-mono"
})
const APP_NAME = "Shadow AI"
const APP_DEFAULT_TITLE =
  "Shadow AI - AI Experiment Design for Life Sciences Researchers"
const APP_TITLE_TEMPLATE = "%s | Shadow AI"
const APP_DESCRIPTION =
  "Shadow AI turns any research question into a structured, run-ready experiment plan in minutes. AI-powered experiment design, hypothesis generation, and scientific protocol creation for PhD researchers, postdocs, and lab scientists."
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.shadowai.work"

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  keywords: [
    "AI experiment design",
    "experiment design software",
    "AI research tool for scientists",
    "scientific protocol generator",
    "AI hypothesis generation",
    "drug discovery experiment planning",
    "lab experiment AI",
    "AI co-scientist",
    "AI for PhD researchers",
    "life sciences AI tools",
    "research protocol AI",
    "experiment planning software",
    "scientific research AI",
    "AI for postdocs",
    "AI laboratory assistant"
  ],
  authors: [{ name: "Shadow AI", url: SITE_URL }],
  creator: "Shadow AI",
  publisher: "Shadow AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo.png", sizes: "500x500", type: "image/png" }],
    shortcut: [{ url: "/logo.png" }],
    apple: [{ url: "/logo.png", sizes: "500x500", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_NAME
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
        url: "/logo-full.png",
        width: 1200,
        height: 630,
        alt: "Shadow AI - AI Experiment Design for Life Sciences"
      }
    ],
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: ["/logo-full.png"],
    creator: "@shadowaitoday"
  },
  alternates: {
    canonical: "/"
  }
}

export const viewport: Viewport = {
  // Logo navy - matches the helix logo background so the address bar /
  // PWA chrome read as part of the brand mark.
  themeColor: "#0E0B40"
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
  // If Supabase is unreachable (e.g. local stack not running), don't crash the whole app.
  let session: Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"] = null
  try {
    session = (await supabase.auth.getSession()).data.session
  } catch (e) {
    session = null
  }

  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Shadow AI",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 500,
          height: 500
        },
        sameAs: []
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Shadow AI",
        applicationCategory: "ScientificApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "AI-powered experiment design platform for life sciences researchers. Turn research questions into structured, run-ready experiment plans with AI hypothesis generation and protocol creation.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier available"
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        featureList: [
          "AI experiment design",
          "Hypothesis generation from literature",
          "Scientific protocol creation",
          "Research paper analysis",
          "Lab report generation",
          "Experiment planning for drug discovery",
          "AI co-scientist for PhD researchers"
        ],
        audience: {
          "@type": "Audience",
          audienceType:
            "Life sciences researchers, PhD scholars, postdocs, principal investigators, research scientists"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Shadow AI?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Shadow AI is an AI-powered experiment design platform for life sciences researchers. It turns any research question into a structured, validated experiment plan - including literature review, hypothesis generation, and a full experimental protocol - in minutes."
            }
          },
          {
            "@type": "Question",
            name: "Who is Shadow AI for?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Shadow AI is built for life sciences researchers: PhD scholars, postdoctoral researchers, research scientists, principal investigators, and lab heads working in fields like drug discovery, molecular biology, biochemistry, pharmacology, immunology, neuroscience, and bioprocessing."
            }
          },
          {
            "@type": "Question",
            name: "What does Shadow AI do?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Shadow AI helps researchers design experiments faster using AI. You describe your research question, and Shadow AI scouts relevant literature, generates testable hypotheses, and builds a complete experimental design - including materials, methods, controls, replicates, and a step-by-step protocol - ready for the bench."
            }
          },
          {
            "@type": "Question",
            name: "Is Shadow AI free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Shadow AI offers a free tier that lets you run your first experiments at no cost. Pro and Max plans unlock higher usage limits and additional features."
            }
          }
        ]
      }
    ]
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${interTight.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        <Providers attribute="class" defaultTheme="dark">
          <TranslationsProvider
            namespaces={i18nNamespaces}
            locale={locale}
            resources={resources}
          >
            <Toaster richColors position="top-center" duration={3000} />
            <div className="bg-background text-foreground flex h-dvh w-full flex-col overflow-x-auto">
              {session ? <GlobalState>{children}</GlobalState> : children}
            </div>
          </TranslationsProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
