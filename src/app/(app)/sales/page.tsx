"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DocumentStatusBadge, PaymentStatusBadge } from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { useCancelSale, useSales } from "@/features/transactions/hooks";
import type { DocumentStatus, SaleListDto, SaleQuery } from "@/features/transactions/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const ALL = "all";

export default function SalesPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = useState<SaleQuery>({ page: 1, pageSize: 25 });
  const [cancelling, setCancelling] = useState<SaleListDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const list = useSales(query);
  const cancel = useCancelSale();

  const columns: DataColumn<SaleListDto>[] = [
    {
      key: "number",
      header: t("sale.invoice"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.invoiceNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.invoiceDate)}</div>
        </div>
      ),
      exportValue: (row) => row.invoiceNumber,
    },
    {
      key: "customer",
      header: t("custLedger.customer"),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0 max-w-[220px]">
          <div className="truncate">{row.customerName}</div>
          {row.village && (
            <div className="truncate text-xs text-muted-foreground">{row.village}</div>
          )}
        </div>
      ),
      exportValue: (row) => row.customerName,
    },
    {
      key: "type",
      header: t("cust.type"),
      align: "center",
      hideBelow: "lg",
      cell: (row) => (
        <span className="text-xs">
          {t(`cust.${row.saleType.toLowerCase()}`, row.saleType)} ·{" "}
          {t(`sale.paymentType.${row.paymentType.toLowerCase()}`, row.paymentType)}
        </span>
      ),
      exportValue: (row) => `${row.saleType} / ${row.paymentType}`,
    },
    {
      key: "amount",
      header: t("common.total"),
      sortable: true,
      align: "right",
      cell: (row) => formatCurrency(row.grandTotal),
      exportValue: (row) => row.grandTotal,
    },
    {
      key: "balance",
      header: t("sale.balance"),
      sortable: true,
      align: "right",
      hideBelow: "sm",
      cell: (row) =>
        row.balanceAmount > 0 ? (
          <span className="text-destructive">{formatCurrency(row.balanceAmount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      exportValue: (row) => row.balanceAmount,
    },
    {
      key: "payment",
      header: t("sale.payment"),
      align: "center",
      hideBelow: "md",
      cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
      exportValue: (row) => row.paymentStatus,
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (row) => <DocumentStatusBadge status={row.status} />,
      exportValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/sales/${row.saleId}`)}
            aria-label={`Open ${row.invoiceNumber}`}
            title={t("sale.open")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/sales/${row.saleId}/print`)}
            aria-label={`Print ${row.invoiceNumber}`}
            title={t("common.print")}
          >
            <Printer className="size-4" />
          </Button>
          {row.status !== "Cancelled" && can(Permissions.Sales.Cancel) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => {
                setCancelling(row);
                setCancelReason("");
              }}
              aria-label={`Cancel ${row.invoiceNumber}`}
              title={t("common.cancel")}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("sale.title")}
        description={t("sale.desc")}
        actions={
          can(Permissions.Sales.Create) ? (
            <Button variant="neutral" onClick={() => router.push("/sales/new")}>
              <Plus className="mr-1.5 size-4" />
              {t("sale.newInvoice")}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as SaleQuery)}
        getRowId={(row) => row.saleId}
        onRowClick={(row) => router.push(`/sales/${row.saleId}`)}
        searchPlaceholder={t("sale.search")}
        emptyMessage={t("sale.empty")}
        exportFileName="sales"
        exportTitle={t("sale.exportTitle")}
        filters={
          <>
            <Input
              type="date"
              value={query.fromDate ?? ""}
              onChange={(event) =>
                setQuery({ ...query, fromDate: event.target.value || null, page: 1 })
              }
              className="w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={query.toDate ?? ""}
              onChange={(event) =>
                setQuery({ ...query, toDate: event.target.value || null, page: 1 })
              }
              className="w-[150px]"
              aria-label="To date"
            />
            <Select
              value={query.status ?? ALL}
              onValueChange={(value) =>
                setQuery({
                  ...query,
                  status: value === ALL ? null : (value as DocumentStatus),
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[130px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("sale.allStatuses")}</SelectItem>
                <SelectItem value="Draft">{t("sale.status.draft")}</SelectItem>
                <SelectItem value="Posted">{t("sale.status.posted")}</SelectItem>
                <SelectItem value="Cancelled">{t("sale.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={query.unpaidOnly ? "due" : ALL}
              onValueChange={(value) =>
                setQuery({ ...query, unpaidOnly: value === "due" ? true : null, page: 1 })
              }
            >
              <SelectTrigger className="w-[140px]" aria-label="Filter by dues">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("sale.allBills")}</SelectItem>
                <SelectItem value="due">{t("sale.unpaidOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title={t("sale.cancelTitle")}
        description={
          <div className="space-y-3">
            <p>
              {cancelling?.status === "Posted"
                ? t("sale.cancelPostedDesc")
                : t("sale.cancelDraftDesc")}
            </p>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t("common.reasonRequired")}
              rows={2}
            />
          </div>
        }
        confirmLabel={t("sale.cancelInvoice")}
        cancelLabel={t("custPay.keepIt")}
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (!cancelling || !cancelReason.trim()) return;
          try {
            await cancel.mutateAsync({ id: cancelling.saleId, reason: cancelReason.trim() });
            setCancelling(null);
            setCancelReason("");
          } catch {
            /* the hook shows the reason as a toast */
          }
        }}
      />
    </>
  );
}
