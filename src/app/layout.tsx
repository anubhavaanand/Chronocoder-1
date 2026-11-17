import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Mona Sans is GitHub's open-source variable font loaded via CDN with
 * React 19 stylesheet resource hoisting, falling back to system display
 * fonts (Hubot Sans, ui-sans-serif, system-ui) in the CSS variable stack.
 *
 * JetBrains Mono is loaded via next/font/google with swap display.
 */

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://chronocoder-1.onrender.com"
  ),
  title: "ChronoCoder — Learn Python from Legends of Computing",
  description:
    "Get code reviews from legendary programmers including Ada Lovelace, Linus Torvalds, Grace Hopper, Alan Turing, and more. AI-powered Python learning platform.",
  keywords: [
    "Python learning",
    "code review",
    "AI mentor",
    "programming education",
    "Ada Lovelace",
    "Linus Torvalds",
    "Grace Hopper",
    "Alan Turing",
  ].join(", "),
  authors: [{ name: "Anubhav" }],
  openGraph: {
    title: "ChronoCoder — AI Mentor Platform",
    description: "Learn Python from the legends themselves",
    type: "website",
    locale: "en_US",
    siteName: "ChronoCoder",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ChronoCoder — Learn Python from the legends of computing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChronoCoder — AI-Powered Code Review",
    description: "Learn Python from legendary programmers",
    images: ["/og.png"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <head>
        {/*
          Mona Sans — GitHub's open-source display font.
          Self-hosted via CDN since it's not on Google Fonts.
          Provides the "Linear / GitHub" wordmark aesthetic.
        */}
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/mona-sans"
          precedence="default"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
