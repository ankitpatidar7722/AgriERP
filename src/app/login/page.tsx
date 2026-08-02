"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Globe, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShreeRamLogo } from "@/components/brand/shree-ram-logo";
import { useAuth } from "@/features/auth/auth-context";
import {
  clearRememberedLogin,
  readRememberedLogin,
  saveRememberedLogin,
} from "@/features/auth/remembered-login";
import { financialYearLabel } from "@/lib/format";

/** Time-of-day greeting as a dictionary key, so it translates with the app. */
function greetingKey(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "login.goodMorning";
  if (hour >= 12 && hour < 17) return "login.goodAfternoon";
  if (hour >= 17) return "login.goodEvening";
  return "login.goodNight";
}
import { ApiError } from "@/types/api";
import { useT } from "@/features/i18n/provider";

const loginSchema = z.object({
  userName: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Where the guard wanted to send this visitor before it intercepted them.
 *
 * Read from window.location rather than useSearchParams on purpose: that hook
 * forces the whole page into a Suspense boundary, which means the static shell
 * is a spinner and the sign-in form only appears after hydration. Reading the
 * value at submit time keeps the form in the pre-rendered HTML, so it is
 * visible instantly and still works with JavaScript disabled until submit.
 *
 * Only same-site paths are honoured - an absolute URL here would be an open
 * redirect straight off the login page.
 */
function readReturnPath(): string {
  if (typeof window === "undefined") return "/dashboard";
  const from = new URLSearchParams(window.location.search).get("from");
  return from && from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  /*
    Greeting and financial year both depend on the viewer's clock, which the
    server cannot know - rendering them during SSR guarantees a hydration
    mismatch and, worse, a stale word if the build is cached. They stay null
    until mount and the markup reserves their space so nothing jumps.
  */
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // Re-checked every minute so a screen left open across 5pm still updates.
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userName: "", password: "" },
  });

  const { reset } = form;

  useEffect(() => {
    const remembered = readRememberedLogin();
    if (remembered) {
      reset(remembered);
      setRememberMe(true);
    }
  }, [reset]);

  function onRememberChange(checked: boolean) {
    setRememberMe(checked);
    // Switching it off forgets immediately rather than at the next sign-in -
    // otherwise the password sits in storage until someone logs in again.
    if (!checked) clearRememberedLogin();
  }

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      const user = await login(values.userName, values.password);

      // Only stored once the server has accepted them, so a typo is never kept.
      if (rememberMe) {
        saveRememberedLogin(values);
      } else {
        clearRememberedLogin();
      }

      if (user.mustChangePassword) {
        toast.info(t("login.setNewPassword"));
        router.replace("/change-password");
        return;
      }

      toast.success(`${t("login.welcomeBack")}, ${user.fullName.split(" ")[0]}.`);
      router.replace(readReturnPath());
    } catch (error) {
      // Shown above the form, not against a field: the server deliberately
      // does not say WHICH of username or password was wrong, so pinning the
      // message to one input would be misleading.
      setFormError(
        error instanceof ApiError ? error.message : t("login.couldNotSignIn"),
      );
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------------------- brand panel ---------------------------- */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-12 lg:flex dark:from-[#132a1e] dark:via-[#0F111A] dark:to-[#132038]">
        {/* A soft wash behind the mark so it does not float on flat colour. */}
        <div
          className="pointer-events-none absolute -left-24 top-1/4 size-[420px] rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <ShreeRamLogo className="relative z-10 w-full max-w-[620px]" />
        <p className="absolute bottom-10 text-xs font-medium tracking-[0.25em] text-muted-foreground">
          AGRIERP V1.0
        </p>
      </div>

      {/* ----------------------------- form panel ---------------------------- */}
      <div className="flex items-center justify-center bg-muted/30 p-4 sm:p-8">
        <div className="elev-card w-full max-w-md rounded-2xl border bg-card p-6 sm:p-9">
          {/*
            A label, not a control: the app ships in English only. A dropdown
            that changed nothing would be worse than saying so.
          */}
          <div className="mb-5 flex justify-end">
            <span
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground"
              title={t("login.languageLabel")}
            >
              <Globe className="size-3.5" aria-hidden />
              {t("login.languageCode")}
            </span>
          </div>

          {/* On mobile the brand panel is hidden, so the mark comes inline. */}
          <ShreeRamLogo variant="mark" className="mx-auto mb-4 size-16 lg:hidden" />

          <div className="text-center">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-primary">
              {/* Non-breaking space holds the line height before mount. */}
              {now ? t(greetingKey(now)) :" "}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </div>
            )}

            {/*
              Read-only, and derived rather than chosen: the API signs a user
              into the year that contains today, so offering a picker here would
              imply a choice the server does not accept.
            */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("login.financialYear")}
              </Label>
              <div className="flex h-10 items-center rounded-lg border bg-muted/50 px-3 text-sm font-medium">
                {now ? financialYearLabel(now) : " "}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="userName"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t("login.username")}
              </Label>
              <Input
                id="userName"
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                autoFocus
                className="h-11"
                {...form.register("userName")}
                aria-invalid={!!form.formState.errors.userName}
              />
              {form.formState.errors.userName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.userName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t("login.password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.passwordPlaceholder")}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={onRememberChange}
              />
              <Label htmlFor="rememberMe" className="cursor-pointer text-sm font-normal">
                {t("login.rememberMe")}
              </Label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-[15px] font-semibold"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("login.loginButton")}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              {t("login.secureConnection")}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("login.forgotPassword")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
