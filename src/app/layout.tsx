import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "一個給自己的長期覺察空間。所有紀錄只存在你自己的 Google 帳號裡。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "導航日",
  title: { default: "導航日 Navigation Day", template: "%s · 導航日" },
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "導航日", statusBarStyle: "default" },
  openGraph: {
    title: "導航日 Navigation Day",
    description: DESCRIPTION,
    type: "website",
    locale: "zh_TW",
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#16130f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning className="h-full">
      <head>
        {/* CJK-aware font loading: Google Fonts serves unicode-range subsets,
            which is far lighter for Traditional Chinese than next/font. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
