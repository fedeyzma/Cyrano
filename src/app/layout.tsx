import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (no runtime/CDN dependency). The --font-sans token
// falls back to the system stack if this is ever removed.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// Display/brand face — the voice of Cyrano. Variable axes: SOFT/WONK/opsz
// (set per-context via .font-display / .font-wonk in globals.css).
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Cyrano — reply copilot",
  description:
    "Natural, dry-witted reply suggestions for your conversations — with a memory for the little details.",
};

export const viewport: Viewport = {
  themeColor: "#0b0a0e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
