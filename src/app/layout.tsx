import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "AgriERP",
    template: "%s · AgriERP",
  },
  description: "Agriculture shop management - stock, billing, purchase and reports.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The counter PC and a phone in the godown both render this.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required by next-themes: it stamps the theme
    // class onto <html> before React hydrates, which is by definition a
    // server/client mismatch. Without it every load logs a hydration error.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
