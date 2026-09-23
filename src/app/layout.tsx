import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChronoCoder - Learn Python from Legends of Computing",
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
    title: "ChronoCoder - AI Mentor Platform",
    description: "Learn Python from the legends themselves",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChronoCoder - AI-Powered Code Review",
    description: "Learn Python from legendary programmers",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-retro-darker text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
