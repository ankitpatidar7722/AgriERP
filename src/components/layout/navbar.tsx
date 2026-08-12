"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight, KeyRound, Languages, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-context";
import { useLang } from "@/features/i18n/provider";
import { LANGUAGES } from "@/features/i18n/config";
import { useSidebarModules } from "@/features/navigation/hooks";
import { useCurrentShop } from "@/features/masters/hooks";
import { brand } from "./nav-config";
import { SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

/**
 * Ghost controls sit on navy in BOTH themes, so they cannot use the default
 * ghost variant - that one tints towards the content accent and disappears here.
 */
const SHELL_BUTTON =
  "text-sidebar-foreground/80 hover:bg-sidebar-raised hover:text-white " +
  "focus-visible:ring-sidebar-ring focus-visible:ring-offset-0";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Same source as the sidebar, and already in the cache by the time this runs
  // - the label must never name a screen the menu beside it does not offer.
  const { data: sections = [] } = useSidebarModules();
  // The header identity comes from ShopMaster (the shop's own name), not a
  // build-time constant; it falls back to the brand while it loads or if unset.
  const { data: shop } = useCurrentShop();
  const shopName = shop?.shopName?.trim() || undefined;

  const initials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ?? "?";

  // Names the section the viewer is in, read from the nav they can see. Purely
  // a label - it does not decide routing and it never links anywhere. Longest
  // match wins, so /purchases/orders reads "Purchase Order", not the "/purchases"
  // GRN whose route is merely a prefix of it.
  const currentPage = sections
    .flatMap((section) => section.modules)
    .filter(
      (module) =>
        pathname === module.moduleName || pathname.startsWith(`${module.moduleName}/`),
    )
    .sort((a, b) => b.moduleName.length - a.moduleName.length)[0]?.moduleDisplayName;

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 bg-sidebar px-3 text-sidebar-foreground lg:px-6">
      {/* Drawer replaces the fixed rail below lg. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cnShell("lg:hidden")}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-r-0 bg-sidebar p-0">
          {/* Radix requires a title for screen readers even when it is not shown. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav variant="drawer" onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ---- left: brand, then where you are ---- */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground lg:hidden">
          <brand.icon className="size-5" aria-hidden />
        </span>

        <span className="truncate text-[15px] font-semibold text-white">
          <span className="hidden sm:inline">{shopName ?? brand.name}</span>
          <span className="sm:hidden">{shopName ?? brand.shortName}</span>
        </span>

        {currentPage && (
          <span className="hidden shrink-0 items-center gap-1 text-sm text-sidebar-foreground/55 md:flex">
            <ChevronRight className="size-4" aria-hidden />
            <span className="text-sidebar-foreground/90">{currentPage}</span>
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* ---- right: language, theme, profile ---- */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <LanguageMenu />

        <ThemeToggle className={SHELL_BUTTON} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cnShell("h-11 gap-2.5 rounded-xl px-1.5 sm:pl-1.5 sm:pr-3")}>
              <Avatar className="size-8">
                <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight sm:flex sm:flex-col">
                <span className="text-sm font-medium text-white">{user?.fullName}</span>
                <span className="text-xs text-sidebar-foreground/60">{user?.roleName}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{user?.fullName}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.userName}
              </span>
              <Badge variant="secondary" className="mt-1 w-fit">
                {user?.roleName}
              </Badge>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/change-password">
                <KeyRound className="mr-2 size-4" />
                {t("shell.changePassword")}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem disabled>
              <UserRound className="mr-2 size-4" />
              {t("shell.myAccount")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => void logout()} className="text-destructive">
              <LogOut className="mr-2 size-4" />
              {t("shell.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function cnShell(extra: string) {
  return `${SHELL_BUTTON} ${extra}`;
}

/** The header language switcher: English / हिंदी / Hinglish, remembered across sessions. */
function LanguageMenu() {
  const { lang, setLang, t } = useLang();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cnShell("hidden h-11 items-center gap-1.5 rounded-xl px-2 sm:flex")}
          title={t("shell.language")}
        >
          <Languages className="size-[18px]" aria-hidden />
          <span className="text-xs font-semibold tracking-wide">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("shell.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="gap-2">
            <Check className={`size-4 ${l.code === lang ? "opacity-100" : "opacity-0"}`} />
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
