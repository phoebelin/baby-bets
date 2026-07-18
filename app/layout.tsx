import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Petals } from "@/components/petals";
import { PlayerProvider } from "@/lib/player-context";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baby Bets · Phoebe & David",
  description:
    "Place your bets, ace the trivia, and stick around for the big reveal",
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Petals />
        <PlayerProvider>
          <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
            {children}
          </div>
        </PlayerProvider>
      </body>
    </html>
  );
}
