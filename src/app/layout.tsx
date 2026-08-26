import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { BackendKeepAlive } from "@/components/common/backend-keep-alive";
import { PwaRegister } from "@/components/common/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "AgriERP",
    template: "%s · AgriERP",
  },
  description: "Agriculture shop management - stock, billing, purchase and reports.",
  applicationName: "AgriERP",
  // Makes the app installable (PWA) and gives it an app-like shell on install.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AgriERP",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The counter PC and a phone in the godown both render this.
  maximumScale: 5,
  // Colours the mobile browser/status bar to the shell navy on install.
  themeColor: "#13294B",
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
        {/* Invisible: pings the backend /health every 5 min so a free-tier
            Render instance stays warm while the app is open. */}
        <BackendKeepAlive />
        {/* Invisible: registers the service worker in production so the app is
            installable. No effect in dev. */}
        <PwaRegister />
      </body>
    </html>
  );
}
