"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { apiPost } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/types/api";
import { useT } from "@/features/i18n/provider";

// Mirrors ChangePasswordRequestValidator on the server. Client-side rules are
// for fast feedback; the server rejects the same things regardless.
const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one digit."),
    confirmPassword: z.string().min(1, "Confirm the new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "The new password must differ from the current one.",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useT();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apiPost("/auth/change-password", values);
      // The server rotates the security stamp and revokes every refresh token,
      // so the current session is already dead - signing out is the honest
      // response rather than letting the next request fail mysteriously.
      toast.success(t("pwd.changedSuccess"));
      await logout();
      router.replace("/login");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        for (const [field, messages] of Object.entries(error.errors)) {
          const key = (field.charAt(0).toLowerCase() + field.slice(1)) as keyof FormValues;
          form.setError(key, { message: messages[0] });
        }
        return;
      }
      toast.error(error instanceof ApiError ? error.message : t("pwd.couldNotChange"));
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={t("shell.changePassword")}
        description={t("pwd.desc")}
      />

      {user?.mustChangePassword && (
        <div className="mb-4 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>
            {t("pwd.defaultPasswordWarning")}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pwd.newPassword")}</CardTitle>
          <CardDescription>
            {t("pwd.hint")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t("pwd.currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t("pwd.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("pwd.confirmNewPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("shell.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
