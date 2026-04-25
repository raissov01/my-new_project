import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getServerLocale } from "@/server/i18n";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";
const SITE_TITLE = "StudyWithRaissov — Premium IELTS Preparation Platform";
const SITE_DESCRIPTION =
  "StudyWithRaissov — студенттер мен оқытушыларға арналған жан-жақты оқу экожүйесі. Флешкарталар, тесттер, челленджтер және тағы басқа.";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";
  const canonical = pathname === "/" ? APP_URL : `${APP_URL}${pathname}`;

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: SITE_TITLE,
      template: "%s | StudyWithRaissov",
    },
    description: SITE_DESCRIPTION,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "StudyWithRaissov",
    },
    icons: {
      icon: [
        { url: "/brand-mark.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/brand-mark.svg",
      apple: "/icon-192.png",
    },
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      type: "website",
      siteName: "StudyWithRaissov",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: canonical,
      locale: "kk_KZ",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getServerLocale();

  return (
    <html
      lang={initialLocale}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${APP_URL}/#organization`,
                  name: "StudyWithRaissov",
                  url: APP_URL,
                  logo: {
                    "@type": "ImageObject",
                    url: `${APP_URL}/icon-512.png`,
                    width: 512,
                    height: 512,
                  },
                  description: SITE_DESCRIPTION,
                  inLanguage: "kk",
                },
                {
                  "@type": "WebSite",
                  "@id": `${APP_URL}/#website`,
                  url: APP_URL,
                  name: "StudyWithRaissov",
                  description: SITE_DESCRIPTION,
                  publisher: { "@id": `${APP_URL}/#organization` },
                  inLanguage: "kk",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/quizzes?q={search_term_string}` },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Негізгі мазмұнға өту
        </a>
        <LocaleProvider initialLocale={initialLocale}>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
