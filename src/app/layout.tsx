import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Mona Sans is not on Google Fonts — it's GitHub's open-source font.
 * We load it via next/font/local from the /public/fonts directory,
 * falling back to system display fonts in the CSS variable stack.
 *
 * JetBrains Mono is loaded via next/font/google as before.
 */

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title: "ChronoCoder — AI-Powered Code Review",
    description: "Learn Python from legendary programmers",
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
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link
          href="https://fonts.cdnfonts.com/css/mona-sans"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
