"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { PurchaseRequisitionStatusBadge } from "@/components/common/status-badge";
import { useAuth } from "@/features/auth/auth-context";
import { usePurchaseRequisition } from "@/features/transactions/hooks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";
import { PurchaseRequisitionModal } from "../PurchaseRequisitionModal";

export default function PurchaseRequisitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const requisitionId = Number(params.id);

  const requisition = usePurchaseRequisition(requisitionId);
  const [editOpen, setEditOpen] = useState(false);

  if (requisition.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const data = requisition.data;
  if (!data) return null;

  const canOrder = data.status === "Open" || data.status === "Partial";
  // Editable only before a PO has drawn on it - matches the backend Open guard.
  const canEdit = data.status === "Open" && can(Permissions.Purchase.Order);

  return (
    <>
      <PageHeader
        title={data.requisitionNumber}
        description={`${formatDate(data.requisitionDate)} · ${data.locationName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/purchases/requisitions")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back")}
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 size-4" />
                {t("common.edit")}
              </Button>
            )}
            {canOrder && can(Permissions.Purchase.Order) && (
              <Button onClick={() => router.push(`/purchases/orders/new?reqId=${requisitionId}`)}>
                <ShoppingCart className="mr-1.5 size-4" />
                {t("req.raisePo")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{t("req.requisitionedItemsTitle")}</CardTitle>
              <PurchaseRequisitionStatusBadge status={data.status} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 text-left font-medium">{t("pur.item")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("req.requiredCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("po.orderedCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("po.pendingCol")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("req.estRate")}</th>
                      <th className="py-2 pl-2 text-right font-medium">{t("pur.expected")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.requisitionDetailId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="max-w-[240px] truncate">{line.itemName}</div>
                          <div className="text-xs text-muted-foreground">{line.unitCode}</div>
                        </td>
                        <td className="px-2 py-2 text-right tabular">
                          {formatQuantity(line.requiredQty)}
                        </td>
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {formatQuantity(line.orderedQty)}
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
                        <td className="px-2 py-2 text-right tabular">
                          {formatCurrency(line.estimatedRate)}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          {line.expectedDate ? formatDate(line.expectedDate) : "-"}
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
              <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                <span>{t("pur.totalQuantity")}</span>
                <span className="tabular">{formatQuantity(data.totalQty)}</span>
              </div>
              {data.remarks && (
                <p className="pt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("pur.remarkLabel")}</span>
                  {data.remarks}
                </p>
              )}
              <p className="pt-1 text-xs text-muted-foreground">
                {t("req.reqNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PurchaseRequisitionModal
        open={editOpen}
        editModel={data}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
