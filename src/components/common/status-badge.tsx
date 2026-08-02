"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";

export function ActiveBadge({ active }: { active: boolean }) {
  const t = useT();
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn(
        "font-normal",
        active
          ? "border-transparent bg-primary/10 text-primary"
          : "text-muted-foreground",
      )}
    >
      {active ? t("badge.active") : t("badge.inactive")}
    </Badge>
  );
}

const STOCK_STATUS_STYLE: Record<string, string> = {
  OutOfStock: "border-destructive/30 bg-destructive/10 text-destructive",
  LowStock: "border-warning/40 bg-warning/10 text-warning",
  OverStock: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  Normal: "border-transparent bg-primary/10 text-primary",
};

const STOCK_STATUS_LABEL: Record<string, string> = {
  OutOfStock: "Out of stock",
  LowStock: "Low stock",
  OverStock: "Over stock",
  Normal: "In stock",
};

/**
 * Stock state always ships as a word, never as colour alone - the palette's
 * warning and critical steps sit below 3:1 on white, and a colour-blind or
 * printed view would otherwise lose the distinction entirely.
 */
export function StockStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap font-normal", STOCK_STATUS_STYLE[status] ?? "")}
    >
      {t(`badge.stock.${status.toLowerCase()}`, STOCK_STATUS_LABEL[status] ?? status)}
    </Badge>
  );
}

const DOCUMENT_STYLE: Record<string, string> = {
  Draft: "border-muted-foreground/30 text-muted-foreground",
  Posted: "border-transparent bg-primary/10 text-primary",
  Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Draft / Posted / Cancelled on any transaction document. */
export function DocumentStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("font-normal", DOCUMENT_STYLE[status] ?? "")}>
      {t(`badge.status.${status.toLowerCase()}`, status)}
    </Badge>
  );
}

const ORDER_STYLE: Record<string, string> = {
  Draft: "border-muted-foreground/30 text-muted-foreground",
  Open: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  Partial: "border-warning/40 bg-warning/10 text-warning",
  Received: "border-transparent bg-primary/10 text-primary",
  Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Purchase-order lifecycle: Draft / Open / Partial / Received / Cancelled. */
export function PurchaseOrderStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("font-normal", ORDER_STYLE[status] ?? "")}>
      {t(`badge.status.${status.toLowerCase()}`, status)}
    </Badge>
  );
}

const REQUISITION_STYLE: Record<string, string> = {
  Draft: "border-muted-foreground/30 text-muted-foreground",
  Open: "border-chart-1/40 bg-chart-1/10 text-chart-1",
  Partial: "border-warning/40 bg-warning/10 text-warning",
  Converted: "border-transparent bg-primary/10 text-primary",
  Cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Purchase-requisition lifecycle: Draft / Open / Partial / Converted / Cancelled. */
export function PurchaseRequisitionStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("font-normal", REQUISITION_STYLE[status] ?? "")}>
      {t(`badge.status.${status.toLowerCase()}`, status)}
    </Badge>
  );
}

const PAYMENT_STYLE: Record<string, string> = {
  Paid: "border-transparent bg-primary/10 text-primary",
  Partial: "border-warning/40 bg-warning/10 text-warning",
  Unpaid: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("font-normal", PAYMENT_STYLE[status] ?? "")}>
      {t(`badge.status.${status.toLowerCase()}`, status)}
    </Badge>
  );
}

const EXPIRY_STYLE: Record<string, string> = {
  Expired: "border-destructive/30 bg-destructive/10 text-destructive",
  Critical: "border-destructive/30 bg-destructive/10 text-destructive",
  Warning: "border-warning/40 bg-warning/10 text-warning",
  Safe: "border-transparent bg-primary/10 text-primary",
  NoExpiry: "text-muted-foreground",
};

export function ExpiryBadge({ status, days }: { status: string; days?: number | null }) {
  const t = useT();
  const label =
    status === "NoExpiry"
      ? t("badge.noExpiry")
      : status === "Expired"
        ? t("badge.expired")
        : days != null
          ? t("badge.daysLeft", "{n}d left").replace("{n}", String(days))
          : status;

  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-normal", EXPIRY_STYLE[status] ?? "")}>
      {label}
    </Badge>
  );
}
