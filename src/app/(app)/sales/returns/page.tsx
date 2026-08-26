"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/page-header";
import { DocumentStatusBadge } from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { useSalesReturns } from "@/features/transactions/hooks";
import type { SalesReturnDto, SalesReturnQuery } from "@/features/transactions/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

export default function SalesReturnsPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = useState<SalesReturnQuery>({ page: 1, pageSize: 25 });
  const list = useSalesReturns(query);
  const canReturn = can(Permissions.Sales.Return);

  const columns: DataColumn<SalesReturnDto>[] = [
    {
      key: "number",
      header: t("sret.colReturn", "Credit Note"),
      sortable: true,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.returnNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(r.returnDate)}</div>
        </div>
      ),
      exportValue: (r) => r.returnNumber,
    },
    {
      key: "customer",
      header: t("sret.customer", "Customer"),
      sortable: true,
      cell: (r) => <div className="max-w-[220px] truncate">{r.customerName || "-"}</div>,
      exportValue: (r) => r.customerName,
    },
    {
      key: "invoice",
      header: t("sret.againstInvoice", "Against Invoice"),
      hideBelow: "md",
      cell: (r) => <span className="text-muted-foreground">{r.invoiceNumber || "-"}</span>,
      exportValue: (r) => r.invoiceNumber ?? "",
    },
    {
      key: "amount",
      header: t("sret.amount", "Amount"),
      align: "right",
      cell: (r) => <span className="font-medium">{formatCurrency(r.grandTotal)}</span>,
      exportValue: (r) => r.grandTotal,
    },
    {
      key: "refund",
      header: t("sret.refund", "Refund"),
      align: "center",
      hideBelow: "lg",
      cell: (r) => r.refundMode,
      exportValue: (r) => r.refundMode,
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (r) => <DocumentStatusBadge status={r.status} />,
      exportValue: (r) => r.status,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("sret.title", "Sales Returns")}
        description={t(
          "sret.desc",
          "Goods returned by customers. Posting a credit note restocks saleable items and reduces the customer's balance.",
        )}
        actions={
          canReturn ? (
            <Button variant="neutral" onClick={() => router.push("/sales/returns/new")}>
              <Plus className="mr-1.5 size-4" />
              {t("sret.newReturn", "New Return")}
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
        onQueryChange={(next) => setQuery(next as SalesReturnQuery)}
        getRowId={(row) => row.salesReturnId}
        onRowClick={(row) => router.push(`/sales/returns/${row.salesReturnId}`)}
        searchPlaceholder={t("sret.search", "Search credit note or invoice no...")}
        emptyMessage={t("sret.empty", "No sales returns yet.")}
        exportFileName="sales-returns"
        exportTitle="Sales Returns"
        filters={
          <>
            <Input
              type="date"
              value={query.fromDate ?? ""}
              onChange={(e) => setQuery({ ...query, fromDate: e.target.value || null, page: 1 })}
              className="w-full sm:w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={query.toDate ?? ""}
              onChange={(e) => setQuery({ ...query, toDate: e.target.value || null, page: 1 })}
              className="w-full sm:w-[150px]"
              aria-label="To date"
            />
          </>
        }
      />
    </>
  );
}
