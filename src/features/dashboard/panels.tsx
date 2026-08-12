"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, HandCoins, IndianRupee, Package, PackageX,
  Receipt, ShoppingCart, TrendingUp, Truck, Users, Warehouse,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/features/dashboard/hooks";
import { useReceivablesSummary } from "@/features/masters/hooks";
import { useSalesByCustomer, usePurchaseBySupplier } from "@/features/transactions/hooks";
import type { Dashboard } from "@/features/dashboard/types";
import type { ReceivablesSummaryDto } from "@/features/masters/types";
import type { CustomerSalesRow, SupplierPurchaseRow } from "@/features/transactions/types";
import {
  PALETTES, SparkAreaKpi, GlowCard, ModernArea, ModernBars, ModernDonut,
  ModernDonutLabeled, PillRankBars,
} from "@/features/dashboard/kit";
import { useT } from "@/features/i18n/provider";
import { DashboardFilter, defaultRange, type DashRange } from "@/features/dashboard/date-filter";
import { formatCurrency, formatDate } from "@/lib/format";

function compactINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** Sales-only dashboard (its own route/menu item). */
export function SalesDashboard() {
  const t = useT();
  const [range, setRange] = useState<DashRange>(() => defaultRange());
  const { data, isLoading } = useDashboard(range.from, range.to);
  const recv = useReceivablesSummary();
  const top = useSalesByCustomer(range.from, range.to);
  return (
    <div className="space-y-6">
      <DashHeader title={t("dash.salesDash")} range={range} onChange={setRange} />
      <ExpiredAlert data={data} t={t} />
      <SalesTab data={data} recv={recv.data} isLoading={isLoading} top={top.data} t={t} periodLabel={range.label} />
    </div>
  );
}

/** Purchase-only dashboard (its own route/menu item). */
export function PurchaseDashboard() {
  const t = useT();
  const [range, setRange] = useState<DashRange>(() => defaultRange());
  const { data, isLoading } = useDashboard(range.from, range.to);
  const top = usePurchaseBySupplier(range.from, range.to);
  return (
    <div className="space-y-6">
      <DashHeader title={t("dash.purchaseDash")} range={range} onChange={setRange} />
      <ExpiredAlert data={data} t={t} />
      <PurchaseTab data={data} isLoading={isLoading} top={top.data} t={t} periodLabel={range.label} />
    </div>
  );
}

/** Centered dashboard header: title + selected period, with the filter on the right. */
function DashHeader({
  title, range, onChange,
}: {
  title: string; range: DashRange; onChange: (r: DashRange) => void;
}) {
  return (
    <div className="mb-2 flex flex-col items-center gap-3 sm:relative sm:min-h-[46px] sm:flex-row sm:justify-center">
      <div className="order-2 text-center sm:order-none">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{range.label}</p>
      </div>
      <div className="order-1 sm:absolute sm:right-0 sm:top-1/2 sm:order-none sm:-translate-y-1/2">
        <DashboardFilter value={range} onChange={onChange} />
      </div>
    </div>
  );
}

type Tr = (key: string, fallback?: string) => string;

function ExpiredAlert({ data, t }: { data?: Dashboard; t: Tr }) {
  if ((data?.alerts?.expiredBatchCount ?? 0) === 0) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <p>
        <strong>{data!.alerts.expiredBatchCount} {t("dash.expiredBannerA")}</strong>{" "}
        {t("dash.expiredBannerB")} {formatCurrency(data!.alerts.expiredStockValue)}.
      </p>
    </div>
  );
}

/* -------------------- reusable tabular drill-down modal ------------------- */

interface TableModal {
  title: string;
  headers: string[];
  aligns?: ("left" | "right")[];
  rows: React.ReactNode[][];
}

function DataDialog({ modal, onClose }: { modal: TableModal | null; onClose: () => void }) {
  return (
    <Dialog open={!!modal} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modal?.title}</DialogTitle>
        </DialogHeader>
        {modal && (
          <div className="max-h-[65vh] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                <tr>
                  {modal.headers.map((hd, i) => (
                    <th key={i} className={cn("px-3 py-2 font-medium", modal.aligns?.[i] === "right" ? "text-right" : "text-left")}>
                      {hd}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modal.rows.length === 0 ? (
                  <tr>
                    <td colSpan={modal.headers.length} className="px-3 py-8 text-center text-muted-foreground">
                      No data.
                    </td>
                  </tr>
                ) : (
                  modal.rows.map((row, ri) => (
                    <tr key={ri} className="border-t">
                      {row.map((cell, ci) => (
                        <td key={ci} className={cn("px-3 py-2", modal.aligns?.[ci] === "right" && "text-right tabular")}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================================== sales ================================= */

function SalesTab({
  data, recv, isLoading, top, t, periodLabel,
}: {
  data?: Dashboard; recv?: ReceivablesSummaryDto; isLoading: boolean; top?: CustomerSalesRow[]; t: Tr; periodLabel: string;
}) {
  const [modal, setModal] = useState<TableModal | null>(null);
  const h = data?.headline;
  const trend = data?.monthlyTrend ?? [];
  const spark = trend.map((m) => m.salesAmount);
  const custRows = top ?? [];
  const dueRows = custRows.filter((c) => c.balanceAmount > 0).sort((a, b) => b.balanceAmount - a.balanceAmount);
  const due = (n: number) => <span className="font-medium text-destructive">{formatCurrency(n)}</span>;

  const buildCustSales = (): TableModal => ({
    title: t("dash.topCustomers"),
    headers: ["Customer", "Bills", "Sales", "Received", "Balance"],
    aligns: ["left", "right", "right", "right", "right"],
    rows: custRows.map((c) => [
      c.customerName, c.invoiceCount, formatCurrency(c.totalSales), formatCurrency(c.amountReceived),
      c.balanceAmount > 0 ? due(c.balanceAmount) : "0",
    ]),
  });
  const buildReceivables = (title: string): TableModal => ({
    title,
    headers: ["Customer", "Village", "Sales", "Balance"],
    aligns: ["left", "left", "right", "right"],
    rows: dueRows.map((c) => [c.customerName, c.village ?? "-", formatCurrency(c.totalSales), due(c.balanceAmount)]),
  });
  const buildInvoices = (title: string): TableModal => ({
    title,
    headers: ["Invoice", "Date", "Customer", "Amount", "Status"],
    aligns: ["left", "left", "left", "right", "left"],
    rows: (data?.recentBills ?? []).map((b) => [
      b.invoiceNumber, formatDate(b.invoiceDate), b.customerName, formatCurrency(b.grandTotal), b.paymentStatus,
    ]),
  });

  const topItems = useMemo(() => (data?.topItems ?? []).slice(0, 5).map((it, i) => ({
    name: it.itemName, value: it.salesValue, color: PALETTES.vibrant[i % PALETTES.vibrant.length],
  })), [data?.topItems]);
  const customerBars = useMemo(() => (top ?? []).slice(0, 6).map((c, i) => ({
    label: c.customerName, value: c.totalSales, color: PALETTES.ocean[i % PALETTES.ocean.length],
  })), [top]);

  if (isLoading) return <LoadingGrid />;

  return (
    <div className="space-y-6">
      {/* KPI cards — Month Sales & Receivables first, then the rest. Each opens its module. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <SparkAreaKpi title={t("dash.monthSales")} value={compactINR(h?.monthSales ?? 0)} color="#7c3aed" icon={TrendingUp} data={spark}
          stats={[{ k: "Today", v: compactINR(h?.todaySales ?? 0) }, { k: "Bills", v: String(h?.todayInvoiceCount ?? 0) }]}
          onClick={() => setModal(buildCustSales())} />
        <SparkAreaKpi title={t("dash.receivables")} value={compactINR(recv?.totalOutstanding ?? h?.customerDue ?? 0)} color="#f59e0b" icon={IndianRupee} data={spark}
          stats={[{ k: "Overdue", v: String(recv?.overdueCustomerCount ?? 0) }, { k: "Due 7d", v: String(recv?.nearDueCount ?? 0) }]}
          onClick={() => setModal(buildReceivables(t("dash.receivables")))} />
        <SparkAreaKpi title={t("dash.todaySales")} value={compactINR(h?.todaySales ?? 0)} color="#10b981" icon={Receipt} data={spark}
          stats={[{ k: "Bills", v: String(h?.todayInvoiceCount ?? 0) }]}
          onClick={() => setModal(buildInvoices(t("dash.recentBills")))} />
        <SparkAreaKpi title={t("dash.todayCollection")} value={compactINR(recv?.todayCollection ?? 0)} color="#14b8a6" icon={HandCoins} data={spark} onClick={() => setModal(buildInvoices(t("dash.recentBills")))} />
        <SparkAreaKpi title={t("dash.overdueAmt")} value={compactINR(recv?.overdueAmount ?? 0)} color="#ef4444" icon={AlertTriangle} data={spark}
          stats={[{ k: "Cust", v: String(recv?.overdueCustomerCount ?? 0) }]}
          onClick={() => setModal(buildReceivables(t("dash.overdueAmt")))} />
        <SparkAreaKpi title={t("dash.customerDues")} value={compactINR(h?.customerDue ?? 0)} color="#3b82f6" icon={Users} data={spark} onClick={() => setModal(buildReceivables(t("dash.customerDues")))} />
      </div>

      <DataDialog modal={modal} onClose={() => setModal(null)} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlowCard title={t("dash.salesVsPurchase")} subtitle={periodLabel} accent="#10b981" className="lg:col-span-2">
          <ModernArea data={trend as unknown as Record<string, string | number>[]} xKey="monthLabel" height={300} series={[
            { key: "salesAmount", name: t("dash.sales"), color: "#10b981" },
            { key: "purchaseAmount", name: t("dash.purchase"), color: "#6366f1" },
          ]} />
        </GlowCard>
        <GlowCard title={t("dash.topSelling")} subtitle={t("dash.byValue")} accent="#6366f1">
          {topItems.length === 0 ? <Empty t={t} /> : (
            <ModernDonutLabeled data={topItems} height={300} centerLabel={t("dash.items")} centerValue={String(data?.topItems.length ?? 0)} />
          )}
        </GlowCard>
      </div>

      {/* Bar chart + top customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlowCard title={t("dash.monthlyBars")} subtitle={periodLabel} accent="#0ea5e9">
          <ModernBars data={trend as unknown as Record<string, string | number>[]} xKey="monthLabel" height={280} series={[
            { key: "salesAmount", name: t("dash.sales"), color: "#0ea5e9" },
            { key: "purchaseAmount", name: t("dash.purchase"), color: "#8b5cf6" },
          ]} />
        </GlowCard>
        <GlowCard title={t("dash.topCustomers")} subtitle={periodLabel} accent="#7c3aed">
          {customerBars.length === 0 ? <Empty t={t} /> : <PillRankBars data={customerBars} />}
        </GlowCard>
      </div>

      {/* Recent invoices */}
      <RecentBills data={data} t={t} />
    </div>
  );
}

/* ================================ purchase ================================ */

function PurchaseTab({
  data, isLoading, top, t, periodLabel,
}: {
  data?: Dashboard; isLoading: boolean; top?: SupplierPurchaseRow[]; t: Tr; periodLabel: string;
}) {
  const [modal, setModal] = useState<TableModal | null>(null);
  const h = data?.headline;
  const trend = data?.monthlyTrend ?? [];
  const spark = trend.map((m) => m.purchaseAmount);
  const supRows = top ?? [];
  const supDue = supRows.filter((s) => s.balanceAmount > 0).sort((a, b) => b.balanceAmount - a.balanceAmount);
  const due = (n: number) => <span className="font-medium text-destructive">{formatCurrency(n)}</span>;
  const stockRows = (data?.itemSubGroupStock ?? []).filter((s) => s.itemCount > 0);

  const buildSupPurchase = (): TableModal => ({
    title: t("dash.topSuppliers"),
    headers: ["Supplier", "Bills", "Purchase", "Paid", "Balance"],
    aligns: ["left", "right", "right", "right", "right"],
    rows: supRows.map((s) => [
      s.supplierName, s.billCount, formatCurrency(s.totalPurchase), formatCurrency(s.amountPaid),
      s.balanceAmount > 0 ? due(s.balanceAmount) : "0",
    ]),
  });
  const buildPayables = (title: string): TableModal => ({
    title,
    headers: ["Supplier", "City", "Purchase", "Balance"],
    aligns: ["left", "left", "right", "right"],
    rows: supDue.map((s) => [s.supplierName, s.city ?? "-", formatCurrency(s.totalPurchase), due(s.balanceAmount)]),
  });
  const buildStock = (title: string): TableModal => ({
    title,
    headers: ["Category", "Items", "Low", "Out", "Value"],
    aligns: ["left", "right", "right", "right", "right"],
    rows: stockRows.map((s) => [
      s.itemSubGroupName, s.itemCount, s.lowStockCount, s.outOfStockCount, formatCurrency(s.stockValueAtCost),
    ]),
  });

  const supplierDonut = useMemo(() => (top ?? []).slice(0, 5).map((s, i) => ({
    name: s.supplierName, value: s.totalPurchase, color: PALETTES.candy[i % PALETTES.candy.length],
  })), [top]);
  const supplierBars = useMemo(() => (top ?? []).slice(0, 6).map((s, i) => ({
    label: s.supplierName, value: s.totalPurchase, color: PALETTES.royal[i % PALETTES.royal.length],
  })), [top]);
  const payables = useMemo(() => (top ?? []).filter((s) => s.balanceAmount > 0)
    .sort((a, b) => b.balanceAmount - a.balanceAmount).slice(0, 6), [top]);
  const stockDonut = useMemo(() => (data?.itemSubGroupStock ?? [])
    .filter((s) => s.stockValueAtCost > 0)
    .sort((a, b) => b.stockValueAtCost - a.stockValueAtCost)
    .slice(0, 6)
    .map((s, i) => ({ name: s.itemSubGroupName, value: s.stockValueAtCost, color: PALETTES.forest[i % PALETTES.forest.length] })),
    [data?.itemSubGroupStock]);

  if (isLoading) return <LoadingGrid />;

  return (
    <div className="space-y-6">
      {/* KPI cards — Month Purchase & Payables first, then the rest. Each opens its module. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <SparkAreaKpi title={t("dash.monthPurchase")} value={compactINR(h?.monthPurchase ?? 0)} color="#6366f1" icon={Package} data={spark}
          stats={[{ k: "Today", v: compactINR(h?.todayPurchase ?? 0) }]}
          onClick={() => setModal(buildSupPurchase())} />
        <SparkAreaKpi title={t("dash.payables")} value={compactINR(h?.supplierDue ?? 0)} color="#f59e0b" icon={IndianRupee} data={spark} onClick={() => setModal(buildPayables(t("dash.payables")))} />
        <SparkAreaKpi title={t("dash.todayPurchase")} value={compactINR(h?.todayPurchase ?? 0)} color="#0ea5e9" icon={ShoppingCart} data={spark} onClick={() => setModal(buildSupPurchase())} />
        <SparkAreaKpi title={t("dash.stockValue")} value={compactINR(h?.stockValueAtCost ?? 0)} color="#14b8a6" icon={Warehouse} data={spark}
          stats={[{ k: "MRP", v: compactINR(h?.stockValueAtMrp ?? 0) }]}
          onClick={() => setModal(buildStock(t("dash.stockByCategory")))} />
        <SparkAreaKpi title={t("dash.lowStock")} value={`${data?.alerts.lowStockCount ?? 0} / ${data?.alerts.outOfStockCount ?? 0}`} color="#ef4444" icon={PackageX} data={spark}
          stats={[{ k: "Out", v: String(data?.alerts.outOfStockCount ?? 0) }]}
          onClick={() => setModal(buildStock(t("dash.lowStock")))} />
        <SparkAreaKpi title={t("dash.expiring")} value={String(data?.alerts.nearExpiryBatchCount ?? 0)} color="#f97316" icon={CalendarClock} data={spark}
          stats={[{ k: "Expired", v: String(data?.alerts.expiredBatchCount ?? 0) }]}
          onClick={() => setModal(buildStock(t("dash.expiring")))} />
      </div>

      <DataDialog modal={modal} onClose={() => setModal(null)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlowCard title={t("dash.salesVsPurchase")} subtitle={periodLabel} accent="#6366f1" className="lg:col-span-2">
          <ModernArea data={trend as unknown as Record<string, string | number>[]} xKey="monthLabel" height={300} series={[
            { key: "purchaseAmount", name: t("dash.purchase"), color: "#6366f1" },
            { key: "salesAmount", name: t("dash.sales"), color: "#10b981" },
          ]} />
        </GlowCard>
        <GlowCard title={t("dash.purchaseBySupplier")} subtitle={periodLabel} accent="#ec4899">
          {supplierDonut.length === 0 ? <Empty t={t} /> : (
            <ModernDonutLabeled data={supplierDonut} height={300} centerLabel={t("dash.suppliers")} centerValue={String(top?.length ?? 0)} />
          )}
        </GlowCard>
      </div>

      {/* Bar chart + stock donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlowCard title={t("dash.monthlyBars")} subtitle={periodLabel} accent="#6366f1">
          <ModernBars data={trend as unknown as Record<string, string | number>[]} xKey="monthLabel" height={300} series={[
            { key: "purchaseAmount", name: t("dash.purchase"), color: "#6366f1" },
            { key: "salesAmount", name: t("dash.sales"), color: "#10b981" },
          ]} />
        </GlowCard>
        <GlowCard title={t("dash.stockByCategory")} subtitle={t("dash.byValue")} accent="#14b8a6">
          {stockDonut.length === 0 ? <Empty t={t} /> : (
            <ModernDonut data={stockDonut} height={300} centerLabel={t("dash.stockValue")}
              centerValue={compactINR((data?.itemSubGroupStock ?? []).reduce((s, x) => s + x.stockValueAtCost, 0))} />
          )}
        </GlowCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlowCard title={t("dash.topSuppliers")} subtitle={periodLabel} accent="#7c3aed">
          {supplierBars.length === 0 ? <Empty t={t} /> : <PillRankBars data={supplierBars} />}
        </GlowCard>
        <GlowCard title={t("dash.supplierPayables")} subtitle={t("dash.dSupplierDues")} accent="#f59e0b">
          {payables.length === 0 ? <Empty t={t} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {payables.map((s) => (
                    <tr key={s.supplierId} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="max-w-[220px] truncate font-medium">{s.supplierName}</div>
                        {s.city && <div className="truncate text-xs text-muted-foreground">{s.city}</div>}
                      </td>
                      <td className="py-2 text-right tabular font-medium text-destructive">{formatCurrency(s.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlowCard>
      </div>
    </div>
  );
}

/* ------------------------------- shared bits ------------------------------ */

function RecentBills({ data, t }: { data?: Dashboard; t: Tr }) {
  return (
    <GlowCard title={t("dash.recentBills")} accent="#10b981" right={<Truck className="size-4 text-muted-foreground" />}>
      {(data?.recentBills.length ?? 0) === 0 ? <Empty t={t} /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {data!.recentBills.slice(0, 6).map((bill) => (
                <tr key={bill.saleId} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{bill.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(bill.invoiceDate)}</div>
                  </td>
                  <td className="py-2 pr-3"><div className="max-w-[150px] truncate">{bill.customerName}</div></td>
                  <td className="py-2 pr-3 text-right tabular">{formatCurrency(bill.grandTotal)}</td>
                  <td className="py-2 text-right">
                    <Badge variant="outline" className={
                      bill.paymentStatus === "Paid"
                        ? "border-transparent bg-primary/10 font-normal text-primary"
                        : bill.paymentStatus === "Unpaid"
                          ? "border-destructive/30 bg-destructive/10 font-normal text-destructive"
                          : "border-warning/40 bg-warning/10 font-normal text-warning"
                    }>
                      {bill.paymentStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlowCard>
  );
}

function Empty({ t }: { t: Tr }) {
  return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("dash.noData")}</p>;
}

function LoadingGrid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-[360px] w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
