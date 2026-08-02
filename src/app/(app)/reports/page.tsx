"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { ExpiryBadge, StockStatusBadge } from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { StatCard } from "@/features/dashboard/stat-card";
import { useAuth } from "@/features/auth/auth-context";
import {
  useExpiryReport,
  useGstReport,
  useProfitReport,
  usePurchaseReport,
  useSalesReport,
  useStockReport,
  useStockValuation,
} from "@/features/transactions/hooks";
import type {
  BatchStockView,
  ItemStockView,
  ProfitReportRow,
  PurchaseReportRow,
  SalesReportRow,
} from "@/features/transactions/types";
import { formatCurrency, formatDate, formatPercent, formatQuantity, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { AlertTriangle, IndianRupee, Package, TrendingUp } from "lucide-react";
import { useT } from "@/features/i18n/provider";

/** Client-side pager over an array the API returns whole. */
function usePagedArray<T>(rows: T[]) {
  const [query, setQuery] = useState({ page: 1, pageSize: 25 });
  const result = {
    items: rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    totalCount: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / query.pageSize)),
    hasPrevious: query.page > 1,
    hasNext: query.page * query.pageSize < rows.length,
  };
  return { query, setQuery, result };
}

export default function ReportsPage() {
  const { can } = useAuth();
  const t = useT();

  return (
    <>
      <PageHeader title={t("rep.title")} description={t("rep.desc")} />

      <Tabs defaultValue="stock">
        <TabsList className="flex-wrap">
          {can(Permissions.Report.Stock) && <TabsTrigger value="stock">{t("rep.tabStock")}</TabsTrigger>}
          {can(Permissions.Report.Stock) && <TabsTrigger value="expiry">{t("rep.tabExpiry")}</TabsTrigger>}
          {can(Permissions.Report.Sales) && <TabsTrigger value="sales">{t("rep.tabSales")}</TabsTrigger>}
          {can(Permissions.Report.Purchase) && <TabsTrigger value="purchase">{t("rep.tabPurchase")}</TabsTrigger>}
          {can(Permissions.Report.Profit) && <TabsTrigger value="profit">{t("rep.tabProfit")}</TabsTrigger>}
          {can(Permissions.Report.Gst) && <TabsTrigger value="gst">{t("rep.tabGst")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="expiry" className="mt-4"><ExpiryTab /></TabsContent>
        <TabsContent value="sales" className="mt-4"><SalesTab /></TabsContent>
        <TabsContent value="purchase" className="mt-4"><PurchaseTab /></TabsContent>
        <TabsContent value="profit" className="mt-4"><ProfitTab /></TabsContent>
        <TabsContent value="gst" className="mt-4"><GstTab /></TabsContent>
      </Tabs>
    </>
  );
}

/* -------------------------------- date range ------------------------------ */

function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useT();
  return (
    <div className="no-print mb-3 flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="w-[160px]"
        aria-label="From date"
      />
      <span className="text-sm text-muted-foreground">{t("rep.rangeTo")}</span>
      <Input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="w-[160px]"
        aria-label="To date"
      />
    </div>
  );
}

function monthStart(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/* ---------------------------------- stock --------------------------------- */

function StockTab() {
  const t = useT();
  const [kind, setKind] = useState<"current" | "low" | "out-of-stock">("current");
  const report = useStockReport(kind);
  const valuation = useStockValuation();
  const { query, setQuery, result } = usePagedArray(report.data ?? []);

  const columns: DataColumn<ItemStockView>[] = [
    {
      key: "item",
      header: t("rep.item"),
      cell: (row) => (
        <div className="min-w-0 max-w-[280px]">
          <div className="truncate">{row.itemName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {row.itemSubGroupName}
            {row.companyName && ` · ${row.companyName}`}
          </div>
        </div>
      ),
      exportValue: (row) => row.itemName,
    },
    {
      key: "rack", header: t("rep.rack"), hideBelow: "lg",
      cell: (row) => row.rackNumber ?? "-", exportValue: (row) => row.rackNumber ?? "",
    },
    {
      key: "stock", header: t("rep.onHand"), align: "right",
      cell: (row) => (
        <span>
          {formatQuantity(row.currentStock)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.currentStock,
    },
    {
      key: "min", header: t("rep.min"), align: "right", hideBelow: "md",
      cell: (row) => formatQuantity(row.minStockLevel), exportValue: (row) => row.minStockLevel,
    },
    {
      key: "value", header: t("rep.valueAtCost"), align: "right",
      cell: (row) => formatCurrency(row.stockValueAtCost), exportValue: (row) => row.stockValueAtCost,
    },
    {
      key: "status", header: t("common.status"), align: "center",
      cell: (row) => <StockStatusBadge status={row.stockStatus} />,
      exportValue: (row) => row.stockStatus,
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("rep.stockAtCost")} icon={Package} tone="success"
          value={formatCurrency(valuation.data?.valueAtCost ?? 0)}
          detail={`${valuation.data?.itemCount ?? 0} ${t("rep.items")}`}
          isLoading={valuation.isLoading}
        />
        <StatCard
          label={t("rep.stockAtMrp")} icon={IndianRupee}
          value={formatCurrency(valuation.data?.valueAtMrp ?? 0)}
          isLoading={valuation.isLoading}
        />
        <StatCard
          label={t("rep.potentialMargin")} icon={TrendingUp} tone="success"
          value={formatCurrency(valuation.data?.potentialMargin ?? 0)}
          detail={t("rep.ifAllSoldMrp")}
          isLoading={valuation.isLoading}
        />
        <StatCard
          label={t("rep.totalQuantity")} icon={Package}
          value={formatQuantity(valuation.data?.totalQuantity ?? 0)}
          isLoading={valuation.isLoading}
        />
      </div>

      <div className="no-print mb-3 flex gap-2">
        {(["current", "low", "out-of-stock"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setKind(option)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              kind === option ? "border-primary bg-primary/10 text-primary" : ""
            }`}
          >
            {option === "current" ? t("rep.allStock") : option === "low" ? t("rep.lowStock") : t("rep.outOfStock")}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        result={result}
        isLoading={report.isLoading}
        query={query}
        onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
        getRowId={(row) => row.itemId}
        emptyMessage={t("rep.nothingToShow")}
        exportFileName={`stock-${kind}`}
        exportTitle={t("rep.stockReportExportTitle")}
      />
    </>
  );
}

/* --------------------------------- expiry --------------------------------- */

function ExpiryTab() {
  const t = useT();
  const [kind, setKind] = useState<"near-expiry" | "expired">("near-expiry");
  const [withinDays, setWithinDays] = useState(90);
  const report = useExpiryReport(kind, withinDays);
  const { query, setQuery, result } = usePagedArray(report.data ?? []);

  const columns: DataColumn<BatchStockView>[] = [
    {
      key: "item", header: t("rep.item"),
      cell: (row) => (
        <div className="min-w-0 max-w-[260px]">
          <div className="truncate">{row.itemName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {row.batchNumber} · {row.locationName}
          </div>
        </div>
      ),
      exportValue: (row) => row.itemName,
    },
    {
      key: "expiry", header: t("rep.expires"),
      cell: (row) => (
        <div className="whitespace-nowrap">
          <div>{row.expiryDate ? formatDate(row.expiryDate) : "-"}</div>
          <ExpiryBadge status={row.expiryStatus} days={row.daysToExpiry} />
        </div>
      ),
      exportValue: (row) => (row.expiryDate ? formatDate(row.expiryDate) : ""),
    },
    {
      key: "qty", header: t("rep.onHand"), align: "right",
      cell: (row) => `${formatQuantity(row.currentQty)} ${row.unitCode}`,
      exportValue: (row) => row.currentQty,
    },
    {
      key: "value", header: t("rep.valueAtRisk"), align: "right",
      cell: (row) => formatCurrency(row.stockValueAtCost),
      exportValue: (row) => row.stockValueAtCost,
    },
  ];

  const totalAtRisk = (report.data ?? []).reduce((sum, row) => sum + row.stockValueAtCost, 0);

  return (
    <>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        {(["near-expiry", "expired"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setKind(option)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              kind === option ? "border-primary bg-primary/10 text-primary" : ""
            }`}
          >
            {option === "near-expiry" ? t("rep.expiringSoon") : t("rep.alreadyExpired")}
          </button>
        ))}
        {kind === "near-expiry" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("rep.within")}</span>
            <Input
              type="number" min={1} max={365}
              value={withinDays}
              onChange={(e) => setWithinDays(Number(e.target.value) || 90)}
              className="w-20 text-right tabular"
              aria-label="Days"
            />
            <span className="text-sm text-muted-foreground">{t("rep.days")}</span>
          </div>
        )}
      </div>

      {kind === "expired" && totalAtRisk > 0 && (
        <div className="mb-3 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p>
            {formatCurrency(totalAtRisk)} {t("rep.expiredStockWarning")}
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        result={result}
        isLoading={report.isLoading}
        query={query}
        onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
        getRowId={(row) => row.batchId}
        emptyMessage={kind === "expired" ? t("rep.nothingExpired") : t("rep.nothingExpiringWindow")}
        exportFileName={kind}
        exportTitle={kind === "expired" ? t("rep.expiredStockTitle") : t("rep.nearExpiryStockTitle")}
      />
    </>
  );
}

/* ---------------------------------- sales --------------------------------- */

function SalesTab() {
  const t = useT();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const report = useSalesReport(from, to);
  const { query, setQuery, result } = usePagedArray(report.data ?? []);

  const columns: DataColumn<SalesReportRow>[] = [
    { key: "date", header: t("common.date"), cell: (r) => formatDate(r.invoiceDate), exportValue: (r) => formatDate(r.invoiceDate) },
    { key: "count", header: t("rep.bills"), align: "right", cell: (r) => r.invoiceCount, exportValue: (r) => r.invoiceCount },
    { key: "taxable", header: t("rep.taxable"), align: "right", cell: (r) => formatCurrency(r.taxableAmount), exportValue: (r) => r.taxableAmount },
    { key: "tax", header: t("rep.tax"), align: "right", hideBelow: "md", cell: (r) => formatCurrency(r.taxAmount), exportValue: (r) => r.taxAmount },
    { key: "total", header: t("common.total"), align: "right", cell: (r) => formatCurrency(r.totalSales), exportValue: (r) => r.totalSales },
    { key: "received", header: t("rep.received"), align: "right", hideBelow: "lg", cell: (r) => formatCurrency(r.amountReceived), exportValue: (r) => r.amountReceived },
    { key: "credit", header: t("rep.creditGiven"), align: "right", hideBelow: "lg", cell: (r) => formatCurrency(r.creditGiven), exportValue: (r) => r.creditGiven },
  ];

  const totals = (report.data ?? []).reduce(
    (acc, row) => ({
      bills: acc.bills + row.invoiceCount,
      total: acc.total + row.totalSales,
      received: acc.received + row.amountReceived,
    }),
    { bills: 0, total: 0, received: 0 },
  );

  return (
    <>
      <DateRange from={from} to={to} onChange={(f, d) => { setFrom(f); setTo(d); }} />
      <SummaryStrip
        items={[
          { label: t("rep.bills"), value: String(totals.bills) },
          { label: t("rep.sales"), value: formatCurrency(totals.total) },
          { label: t("rep.received"), value: formatCurrency(totals.received) },
        ]}
        isLoading={report.isLoading}
      />
      <DataTable
        columns={columns}
        result={result}
        isLoading={report.isLoading}
        query={query}
        onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
        getRowId={(row) => row.invoiceDate}
        emptyMessage={t("rep.noSalesPeriod")}
        exportFileName="sales-report"
        exportTitle={`${t("rep.salesTitle")} ${formatDate(from)} - ${formatDate(to)}`}
      />
    </>
  );
}

/* -------------------------------- purchase -------------------------------- */

function PurchaseTab() {
  const t = useT();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const report = usePurchaseReport(from, to);
  const { query, setQuery, result } = usePagedArray(report.data ?? []);

  const columns: DataColumn<PurchaseReportRow>[] = [
    { key: "date", header: t("common.date"), cell: (r) => formatDate(r.purchaseDate), exportValue: (r) => formatDate(r.purchaseDate) },
    { key: "count", header: t("rep.bills"), align: "right", cell: (r) => r.billCount, exportValue: (r) => r.billCount },
    { key: "taxable", header: t("rep.taxable"), align: "right", cell: (r) => formatCurrency(r.taxableAmount), exportValue: (r) => r.taxableAmount },
    { key: "tax", header: t("rep.inputTax"), align: "right", hideBelow: "md", cell: (r) => formatCurrency(r.taxAmount), exportValue: (r) => r.taxAmount },
    { key: "total", header: t("common.total"), align: "right", cell: (r) => formatCurrency(r.totalPurchase), exportValue: (r) => r.totalPurchase },
    { key: "paid", header: t("rep.paid"), align: "right", hideBelow: "lg", cell: (r) => formatCurrency(r.amountPaid), exportValue: (r) => r.amountPaid },
    { key: "due", header: t("rep.payable"), align: "right", cell: (r) => formatCurrency(r.amountDue), exportValue: (r) => r.amountDue },
  ];

  const totals = (report.data ?? []).reduce(
    (acc, row) => ({
      bills: acc.bills + row.billCount,
      total: acc.total + row.totalPurchase,
      due: acc.due + row.amountDue,
    }),
    { bills: 0, total: 0, due: 0 },
  );

  return (
    <>
      <DateRange from={from} to={to} onChange={(f, d) => { setFrom(f); setTo(d); }} />
      <SummaryStrip
        items={[
          { label: t("rep.bills"), value: String(totals.bills) },
          { label: t("rep.purchases"), value: formatCurrency(totals.total) },
          { label: t("rep.stillPayable"), value: formatCurrency(totals.due) },
        ]}
        isLoading={report.isLoading}
      />
      <DataTable
        columns={columns}
        result={result}
        isLoading={report.isLoading}
        query={query}
        onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
        getRowId={(row) => row.purchaseDate}
        emptyMessage={t("rep.noPurchasesPeriod")}
        exportFileName="purchase-report"
        exportTitle={`${t("rep.purchasesTitle")} ${formatDate(from)} - ${formatDate(to)}`}
      />
    </>
  );
}

/* --------------------------------- profit --------------------------------- */

function ProfitTab() {
  const { can } = useAuth();
  const t = useT();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const report = useProfitReport(from, to, can(Permissions.Report.Profit));
  const { query, setQuery, result } = usePagedArray(report.data ?? []);

  const columns: DataColumn<ProfitReportRow>[] = [
    { key: "date", header: t("common.date"), cell: (r) => formatDate(r.invoiceDate), exportValue: (r) => formatDate(r.invoiceDate) },
    { key: "sales", header: t("rep.salesTaxable"), align: "right", cell: (r) => formatCurrency(r.taxableAmount), exportValue: (r) => r.taxableAmount },
    { key: "cost", header: t("rep.costOfGoods"), align: "right", cell: (r) => formatCurrency(r.totalCost), exportValue: (r) => r.totalCost },
    {
      key: "profit", header: t("rep.grossProfit"), align: "right",
      cell: (r) => (
        <span className={r.grossProfit >= 0 ? "font-medium text-primary" : "font-medium text-destructive"}>
          {formatCurrency(r.grossProfit)}
        </span>
      ),
      exportValue: (r) => r.grossProfit,
    },
    { key: "margin", header: t("rep.margin"), align: "right", cell: (r) => formatPercent(r.marginPercent), exportValue: (r) => r.marginPercent },
  ];

  const totals = (report.data ?? []).reduce(
    (acc, row) => ({
      sales: acc.sales + row.taxableAmount,
      cost: acc.cost + row.totalCost,
      profit: acc.profit + row.grossProfit,
    }),
    { sales: 0, cost: 0, profit: 0 },
  );

  return (
    <>
      <DateRange from={from} to={to} onChange={(f, d) => { setFrom(f); setTo(d); }} />
      <SummaryStrip
        items={[
          { label: t("rep.sales"), value: formatCurrency(totals.sales) },
          { label: t("rep.cost"), value: formatCurrency(totals.cost) },
          { label: t("rep.grossProfit"), value: formatCurrency(totals.profit) },
          {
            label: t("rep.margin"),
            value: totals.sales > 0 ? formatPercent((totals.profit / totals.sales) * 100) : "-",
          },
        ]}
        isLoading={report.isLoading}
      />
      <DataTable
        columns={columns}
        result={result}
        isLoading={report.isLoading}
        query={query}
        onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
        getRowId={(row) => row.invoiceDate}
        emptyMessage={t("rep.noSalesPeriod")}
        exportFileName="profit-report"
        exportTitle={`${t("rep.profitTitle")} ${formatDate(from)} - ${formatDate(to)}`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {t("rep.costFootnote")}
      </p>
    </>
  );
}

/* ----------------------------------- GST ---------------------------------- */

function GstTab() {
  const { can } = useAuth();
  const t = useT();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(toIsoDate(new Date()));
  const report = useGstReport(from, to, can(Permissions.Report.Gst));
  const data = report.data;

  return (
    <>
      <DateRange from={from} to={to} onChange={(f, d) => { setFrom(f); setTo(d); }} />

      {report.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <SummaryStrip
            items={[
              {
                label: t("rep.outputTax"),
                value: formatCurrency(
                  (data?.outwardSupplies ?? []).reduce((sum, r) => sum + r.totalTax, 0),
                ),
              },
              {
                label: t("rep.inputCredit"),
                value: formatCurrency(
                  (data?.inwardSupplies ?? []).reduce((sum, r) => sum + r.totalTax, 0),
                ),
              },
              { label: t("rep.netPayable"), value: formatCurrency(data?.netTaxPayable ?? 0) },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <GstTable title={t("rep.outwardSupplies")} rows={data?.outwardSupplies ?? []} />
            <GstTable title={t("rep.inwardSupplies")} rows={data?.inwardSupplies ?? []} />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {t("rep.gstFootnote")}
          </p>
        </>
      )}
    </>
  );
}

function GstTable({
  title,
  rows,
}: {
  title: string;
  rows: { hsnCode?: string | null; gstPercent: number; taxableAmount: number; totalTax: number }[];
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("rep.nothingInPeriod")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">{t("rep.hsn")}</th>
                <th className="py-2 text-right font-medium">{t("rep.rate")}</th>
                <th className="py-2 text-right font-medium">{t("rep.taxable")}</th>
                <th className="py-2 text-right font-medium">{t("rep.tax")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-2">{row.hsnCode ?? "-"}</td>
                  <td className="py-2 text-right tabular">{row.gstPercent}%</td>
                  <td className="py-2 text-right tabular">{formatCurrency(row.taxableAmount)}</td>
                  <td className="py-2 text-right tabular font-medium">
                    {formatCurrency(row.totalTax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStrip({
  items,
  isLoading,
}: {
  items: { label: string; value: string }[];
  isLoading?: boolean;
}) {
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-6 w-24" />
            ) : (
              <p className="mt-0.5 text-lg font-semibold tabular">{item.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
