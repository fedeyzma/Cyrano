import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (no runtime/CDN dependency). The --font-sans token
// falls back to the system stack if this is ever removed. Instrument Sans is
// the machinery: body, labels, buttons, meta.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

// Display/brand face — the voice of Cyrano. Variable axes: SOFT/WONK/opsz
// (set per-context via .font-display / .font-wonk in globals.css; SOFT 0 for
// the sharp letterpress read, WONK 1 on the wordmark only).
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
  themeColor: "#100E0A",
  // Edge-to-edge on notched phones; safe-area insets are applied per-surface.
  viewportFit: "cover",
  // Soft keyboard shrinks the layout viewport so the composer dock stays visible.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${instrument.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
