import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (no runtime/CDN dependency). One family for the
// whole app (DESIGN.md v2 §3): Inter — body, labels, buttons, headings and
// display, tight-tracked at display sizes. The --font-sans / --font-display
// tokens in globals.css both resolve to --font-inter and fall back to the
// system stack if this is ever removed.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cyrano — reply copilot",
  description:
    "Natural, dry-witted reply suggestions for your conversations — with a memory for the little details.",
};

export const viewport: Viewport = {
  themeColor: "#0B0D16",
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
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
