"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackageCheck, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { PurchaseOrderStatusBadge } from "@/components/common/status-badge";
import { useAuth } from "@/features/auth/auth-context";
import { usePurchaseOrder } from "@/features/transactions/hooks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const orderId = Number(params.id);

  const order = usePurchaseOrder(orderId);

  if (order.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const data = order.data;
  if (!data) return null;

  const canReceive = data.status === "Open" || data.status === "Partial";
  // Editable only before any goods are received - matches the backend Open guard.
  const canEdit = data.status === "Open" && can(Permissions.Purchase.Order);

  return (
    <>
      <PageHeader
        title={data.orderNumber}
        description={`${formatDate(data.orderDate)} · ${data.supplierName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/purchases/orders")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back")}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/purchases/orders/${orderId}/print`)}>
              <Printer className="mr-1.5 size-4" />
              {t("common.print")}
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => router.push(`/purchases/orders/new?editId=${orderId}`)}>
                <Pencil className="mr-1.5 size-4" />
                {t("common.edit")}
              </Button>
            )}
            {canReceive && can(Permissions.Purchase.Create) && (
              <Button onClick={() => router.push(`/purchases/new?poId=${orderId}`)}>
                <PackageCheck className="mr-1.5 size-4" />
                {t("po.receiveGoods")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{t("po.orderedItemsTitle")}</CardTitle>
              <PurchaseOrderStatusBadge status={data.status} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 text-left font-medium">{t("pur.item")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("po.orderedCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("po.receivedCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("po.pendingCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("pur.rate")}</th>
                      <th className="py-2 pl-2 text-right font-medium">{t("common.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.purchaseOrderDetailId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="max-w-[240px] truncate">{line.itemName}</div>
                          <div className="text-xs text-muted-foreground">{line.unitCode}</div>
                        </td>
                        <td className="px-2 py-2 text-right tabular">
                          {formatQuantity(line.orderedQty)}
                        </td>
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {formatQuantity(line.receivedQty)}
                        </td>
                        <td className="px-2 py-2 text-right tabular">
                          {line.pendingQty > 0 ? (
                            <span className="font-medium text-warning">
                              {formatQuantity(line.pendingQty)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular">{formatCurrency(line.rate)}</td>
                        <td className="py-2 pl-2 text-right tabular">
                          {formatCurrency(line.estimatedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("pur.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={t("pur.totalItems")} value={String(data.lines.length)} />
              <Row label={t("pur.totalQuantity")} value={formatQuantity(data.totalQty)} />
              {data.expectedDate && (
                <Row label={t("pur.expected")} value={formatDate(data.expectedDate)} muted />
              )}
              <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                <span>{t("po.estimatedValueLabel")}</span>
                <span className="tabular">{formatCurrency(data.estimatedValue)}</span>
              </div>
              {data.remarks && (
                <p className="pt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("pur.remarkLabel")}</span>
                  {data.remarks}
                </p>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                {t("po.orderNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
