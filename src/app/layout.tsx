import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Fonts are self-hosted (no third-party CDN) so builds are hermetic and
 * there is no render-blocking external stylesheet (#201, #309).
 *
 * - JetBrains Mono: variable `--font-jetbrains`, weights 400/500/600.
 * - Mona Sans is not bundled (licensing/size); the CSS `--font-display`
 *   stack falls back to Hubot Sans / system display fonts.
 */

const jetbrainsMono = localFont({
  src: [
    { path: "../../public/fonts/JetBrainsMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/JetBrainsMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/JetBrainsMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
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
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
