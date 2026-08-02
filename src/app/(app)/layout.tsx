"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { Navbar } from "@/components/layout/navbar";
import { IndasProvider } from "@/components/indas/indas-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mustChangePassword = user?.mustChangePassword ?? false;
  const onChangePasswordPage = pathname === "/change-password";

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const from = encodeURIComponent(pathname);
      router.replace(`/login?from=${from}`);
      return;
    }

    // The seeded administrator starts with a documented default password. Until
    // it is changed the rest of the app stays out of reach - otherwise that
    // default quietly survives into day-to-day use.
    if (mustChangePassword && !onChangePasswordPage) {
      router.replace("/change-password");
    }
  }, [isLoading, isAuthenticated, mustChangePassword, onChangePasswordPage, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    // IndasProvider supplies the contexts the indas-ui DataGrid reads (device,
    // search preferences, alerts, language, currency). Placed once here rather
    // than per-table, so every list screen's grid has them without each screen
    // wrapping its own.
    <IndasProvider>
      <div className="flex min-h-screen bg-background">
        {/* Collapsible sidebar from lg up; the drawer in Navbar covers smaller screens. */}
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-5 lg:p-7">{children}</main>
        </div>
      </div>
    </IndasProvider>
  );
}
