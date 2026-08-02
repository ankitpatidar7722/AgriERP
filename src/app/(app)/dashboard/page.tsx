"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  HandCoins,
  IndianRupee,
  PackageX,
  Receipt,
  ShoppingCart,
  TimerReset,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboard } from "@/features/dashboard/hooks";
import { useReceivablesSummary } from "@/features/masters/hooks";
import { useT } from "@/features/i18n/provider";
import { StatCard } from "@/features/dashboard/stat-card";
import { TrendChart } from "@/features/dashboard/trend-chart";
import { ItemSubGroupDonut } from "@/features/dashboard/item-subgroup-donut";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";

export default function DashboardPage() {
  const { user, can } = useAuth();
  const t = useT();
  const { data, isLoading } = useDashboard();

  const showProfit = can(Permissions.Dashboard.ViewProfit);
  const headline = data?.headline;
  const alerts = data?.alerts;
  const recv = useReceivablesSummary();
  const r = recv.data;

  // The full name, not its first word: "System Administrator" would greet the
  // user as "System".
  const greetingName = user?.fullName?.trim() || "there";

  return (
    <>
      <PageHeader
        title={`${t("dash.goodDay")}, ${greetingName}`}
        description={
          headline ? `${t("dash.asOn")} ${formatDate(headline.asOnDate)}` : t("dash.loading")
        }
      />

      {/* Money first - what came in and what went out today. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.todaySales")}
          value={formatCurrency(headline?.todaySales ?? 0)}
          detail={`${headline?.todayInvoiceCount ?? 0} ${t("dash.invoices")}`}
          icon={Receipt}
          tone="success"
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.monthSales")}
          value={formatCurrency(headline?.monthSales ?? 0)}
          detail={
            showProfit ? `${t("dash.profit")} ${formatCurrency(headline?.monthProfit ?? 0)}` : undefined
          }
          icon={TrendingUp}
          tone="success"
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.todayPurchase")}
          value={formatCurrency(headline?.todayPurchase ?? 0)}
          detail={`${t("dash.month")} ${formatCurrency(headline?.monthPurchase ?? 0)}`}
          icon={ShoppingCart}
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.stockValue")}
          value={formatCurrency(headline?.stockValueAtCost ?? 0)}
          detail={`${t("dash.atMrp")} ${formatCurrency(headline?.stockValueAtMrp ?? 0)}`}
          icon={Warehouse}
          isLoading={isLoading}
        />
      </div>

      {/* Then what needs attention. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.customerDues")}
          value={formatCurrency(headline?.customerDue ?? 0)}
          detail={t("dash.dCustomerDues")}
          icon={IndianRupee}
          tone={(headline?.customerDue ?? 0) > 0 ? "warning" : "default"}
          href="/customers"
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.supplierDues")}
          value={formatCurrency(headline?.supplierDue ?? 0)}
          detail={t("dash.dSupplierDues")}
          icon={IndianRupee}
          tone={(headline?.supplierDue ?? 0) > 0 ? "warning" : "default"}
          href="/suppliers"
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.lowOutStock")}
          value={`${alerts?.lowStockCount ?? 0} / ${alerts?.outOfStockCount ?? 0}`}
          detail={`${alerts?.activeItemCount ?? 0} ${t("dash.activeItems")}`}
          icon={PackageX}
          tone={(alerts?.outOfStockCount ?? 0) > 0 ? "danger" : "default"}
          href="/items?stockStatus=LowStock"
          isLoading={isLoading}
        />
        <StatCard
          label={t("dash.expiring")}
          value={`${alerts?.nearExpiryBatchCount ?? 0} / ${alerts?.expiredBatchCount ?? 0}`}
          detail={
            (alerts?.expiredStockValue ?? 0) > 0
              ? `${formatCurrency(alerts?.expiredStockValue ?? 0)} ${t("dash.atRisk")}`
              : t("dash.batches")
          }
          icon={CalendarClock}
          tone={(alerts?.expiredBatchCount ?? 0) > 0 ? "danger" : "default"}
          isLoading={isLoading}
        />
      </div>

      {/* Receivables (udhar): total dues, today's collection, overdue, near-due. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.totalOutstanding")}
          value={formatCurrency(r?.totalOutstanding ?? 0)}
          detail={t("dash.dAllDues")}
          icon={BookOpen}
          tone={(r?.totalOutstanding ?? 0) > 0 ? "warning" : "default"}
          href="/accounts/customer-ledger"
          isLoading={recv.isLoading}
        />
        <StatCard
          label={t("dash.todayCollection")}
          value={formatCurrency(r?.todayCollection ?? 0)}
          detail={t("dash.dReceivedToday")}
          icon={HandCoins}
          tone={(r?.todayCollection ?? 0) > 0 ? "success" : "default"}
          href="/accounts/customer-payment"
          isLoading={recv.isLoading}
        />
        <StatCard
          label={t("dash.overdueCustomers")}
          value={String(r?.overdueCustomerCount ?? 0)}
          detail={
            (r?.overdueAmount ?? 0) > 0
              ? `${formatCurrency(r?.overdueAmount ?? 0)} ${t("dash.overdueAmt")}`
              : t("dash.dPastDue")
          }
          icon={AlertTriangle}
          tone={(r?.overdueCustomerCount ?? 0) > 0 ? "danger" : "default"}
          href="/accounts/customer-ledger"
          isLoading={recv.isLoading}
        />
        <StatCard
          label={t("dash.fallingDue")}
          value={String(r?.nearDueCount ?? 0)}
          detail={t("dash.dDue7")}
          icon={TimerReset}
          tone={(r?.nearDueCount ?? 0) > 0 ? "warning" : "default"}
          href="/accounts/customer-ledger"
          isLoading={recv.isLoading}
        />
      </div>

      {/*
        min-w-0 on every grid child. A grid item defaults to min-width:auto,
        which means it refuses to shrink below the intrinsic width of what is
        inside it - so a wide table or a chart pushes the card past the viewport
        and the whole page scrolls sideways on a phone. The inner overflow-x-auto
        wrappers cannot help until the item itself is allowed to be narrow.
      */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          {isLoading ? (
            <Skeleton className="h-[380px] w-full rounded-xl" />
          ) : (
            <TrendChart data={data?.monthlyTrend ?? []} showProfit={showProfit} />
          )}
        </div>
        <div className="min-w-0 lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-[380px] w-full rounded-xl" />
          ) : (
            <ItemSubGroupDonut data={data?.itemSubGroupStock ?? []} />
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dash.recentBills")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.recentBills.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("dash.noBills")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {data!.recentBills.map((bill) => (
                      <tr key={bill.saleId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{bill.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(bill.invoiceDate)}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="max-w-[160px] truncate">{bill.customerName}</div>
                          {bill.village && (
                            <div className="truncate text-xs text-muted-foreground">
                              {bill.village}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular">
                          {formatCurrency(bill.grandTotal)}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant="outline"
                            className={
                              bill.paymentStatus === "Paid"
                                ? "border-transparent bg-primary/10 font-normal text-primary"
                                : bill.paymentStatus === "Unpaid"
                                  ? "border-destructive/30 bg-destructive/10 font-normal text-destructive"
                                  : "border-warning/40 bg-warning/10 font-normal text-warning"
                            }
                          >
                            {bill.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dash.topSelling")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.topItems.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("dash.noSales")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {data!.topItems.map((item) => (
                      <tr key={item.itemId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="max-w-[220px] truncate font-medium">
                            {item.itemName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {item.itemSubGroupName}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right tabular whitespace-nowrap">
                          {formatQuantity(item.quantitySold)}{" "}
                          <span className="text-xs text-muted-foreground">
                            {item.unitCode}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular">
                          {formatCurrency(item.salesValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(alerts?.expiredBatchCount ?? 0) > 0 && (
        <div className="mt-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p>
            <strong>{alerts?.expiredBatchCount} {t("dash.expiredBannerA")}</strong>{" "}
            {t("dash.expiredBannerB")} {formatCurrency(alerts?.expiredStockValue ?? 0)}.{" "}
            {t("dash.expiredBannerC")}
          </p>
        </div>
      )}
    </>
  );
}
