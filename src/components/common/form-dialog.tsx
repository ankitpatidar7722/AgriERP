"use client";

import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isPending?: boolean;
  submitLabel?: string;
  /** Widen for forms with several columns; the default suits a single column. */
  size?: "default" | "lg" | "xl" | "2xl" | "3xl" | "full";
  children: React.ReactNode;
}

const SIZE_CLASS = {
  default: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  // Four columns of fields, for a master that would otherwise need tabs.
  "2xl": "sm:max-w-6xl",
  // A wide, dense master form - four columns with room to breathe.
  "3xl": "sm:max-w-[1280px]",
  // Near full-screen, for a document entry screen with a line-items grid.
  full: "sm:max-w-[96vw]",
} as const;

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  isPending = false,
  submitLabel,
  size = "default",
  children,
}: FormDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Header and footer stay put; only the field area between them scrolls.
        className={cn("flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0", SIZE_CLASS[size])}
        // Clicking outside a half-filled form should not throw the work away.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-1 border-b bg-muted/40 px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>

          <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="size-4" />
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {submitLabel ?? t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + error, so every form field is laid out the same way. */
export function Field({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Grid wrapper: one column on mobile, widening with the viewport. */
export function FieldGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-3.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

/**
 * A labelled rule between groups of fields.
 *
 * A long single-panel form needs signposting or it reads as one undifferentiated
 * wall of inputs - but unlike tabs, nothing here is hidden, so a required field
 * can never be missed because it sits on a panel that was never opened.
 */
export function FormSection({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pt-3 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-foreground/75">
          {title}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

/**
 * A finished on/off row with its own explanation, for the status toggle that
 * usually closes a master form. Reads as a deliberate control rather than a
 * stray checkbox at the bottom of the page.
 */
export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

/**
 * Numeric input that reports a number, not a string.
 *
 * A bare <Input type="number"> registered with react-hook-form yields "" for an
 * empty box, which Zod then rejects as "expected number, received string" -
 * a confusing error for a field the user simply left blank.
 */
export function NumberInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === "" ? 0 : Number(raw));
      }}
      className="tabular"
      {...props}
    />
  );
}
