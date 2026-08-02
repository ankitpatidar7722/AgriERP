"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, Loader2, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { DocumentStatusBadge, PaymentStatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useCancelPurchase, usePostPurchase, usePurchase } from "@/features/transactions/hooks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const purchaseId = Number(params.id);

  const purchase = usePurchase(purchaseId);
  const post = usePostPurchase();
  const cancel = useCancelPurchase();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (purchase.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  const data = purchase.data;
  if (!data) return null;

  const isDraft = data.status === "Draft";

  return (
    <>
      <PageHeader
        title={data.purchaseNumber}
        description={`${formatDate(data.purchaseDate)} · ${data.supplierName}${
          data.warehouseName ? ` · ${data.warehouseName}` : ""
        }`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/purchases")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back")}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/purchases/${purchaseId}/print`)}>
              <Printer className="mr-1.5 size-4" />
              {t("common.print")}
            </Button>
            {isDraft && can(Permissions.Purchase.Create) && (
              <Button
                variant="outline"
                onClick={() => router.push(`/purchases/new?editId=${purchaseId}`)}
              >
                <Pencil className="mr-1.5 size-4" />
                {t("common.edit")}
              </Button>
            )}
            {isDraft && can(Permissions.Purchase.Post) && (
              <Button onClick={() => post.mutate(purchaseId)} disabled={post.isPending}>
                {post.isPending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-4" />
                )}
                {t("grn.postPurchase")}
              </Button>
            )}
            {data.status !== "Cancelled" && can(Permissions.Purchase.Cancel) && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <Ban className="mr-1.5 size-4" />
                {t("common.cancel")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{t("grn.itemsTitle")}</CardTitle>
              <div className="flex gap-2">
                <DocumentStatusBadge status={data.status} />
                {data.status !== "Cancelled" && (
                  <PaymentStatusBadge status={data.paymentStatus} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-3 text-left font-medium">{t("pur.item")}</th>
                      <th className="px-2 py-2 text-left font-medium">{t("grn.batch")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("pur.qty")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("pur.rate")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("grn.landed")}</th>
                      <th className="py-2 pl-2 text-right font-medium">{t("common.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.purchaseDetailId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="max-w-[220px] truncate">{line.itemName}</div>
                          {line.hsnCode && (
                            <div className="text-xs text-muted-foreground">
                              HSN {line.hsnCode} · GST {line.gstPercent}%
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <div>{line.batchNumber ?? "-"}</div>
                          {line.expiryDate && (
                            <div className="text-muted-foreground">
                              {t("grn.expWord", "exp")} {formatDate(line.expiryDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular whitespace-nowrap">
                          {formatQuantity(line.quantity)}
                          {line.freeQuantity > 0 && (
                            <span className="text-xs text-primary">
                              {" "}
                              +{formatQuantity(line.freeQuantity)}
                            </span>
                          )}{" "}
                          <span className="text-xs text-muted-foreground">{line.unitCode}</span>
                        </td>
                        <td className="px-2 py-2 text-right tabular">
                          {formatCurrency(line.rate)}
                        </td>
                        {/* Landed cost, not the invoice rate: this is what the
                            batch is valued at and what a sale copies as cost. */}
                        <td className="px-2 py-2 text-right tabular font-medium">
                          {formatCurrency(line.landedRate)}
                        </td>
                        <td className="py-2 pl-2 text-right tabular">
                          {formatCurrency(line.lineTotal)}
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
              {data.warehouseName && (
                <>
                  <Row label={t("pur.warehouse")} value={data.warehouseName} />
                  <div className="border-t" />
                </>
              )}
              <Row label={t("pur.gross")} value={formatCurrency(data.grossAmount)} />
              {data.discountAmount > 0 && (
                <Row label={t("pur.discount")} value={`- ${formatCurrency(data.discountAmount)}`} />
              )}
              <Row label={t("pur.taxable")} value={formatCurrency(data.taxableAmount)} />
              {data.isInterState ? (
                <Row label={t("pur.igst")} value={formatCurrency(data.igstAmount)} muted />
              ) : (
                <>
                  <Row label={t("pur.cgst")} value={formatCurrency(data.cgstAmount)} muted />
                  <Row label={t("pur.sgst")} value={formatCurrency(data.sgstAmount)} muted />
                </>
              )}
              {data.freightCharges > 0 && (
                <Row label={t("pur.freight")} value={formatCurrency(data.freightCharges)} muted />
              )}
              {data.otherCharges > 0 && (
                <Row label={t("pur.otherCharges")} value={formatCurrency(data.otherCharges)} muted />
              )}
              {data.roundOff !== 0 && (
                <Row label={t("pur.roundOff")} value={formatCurrency(data.roundOff)} muted />
              )}
              <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                <span>{t("common.total")}</span>
                <span className="tabular">{formatCurrency(data.grandTotal)}</span>
              </div>
              <Row label={t("pur.paid")} value={formatCurrency(data.paidAmount)} />
              {data.balanceAmount > 0 && (
                <div className="flex items-center justify-between font-medium text-destructive">
                  <span>{t("grn.payable")}</span>
                  <span className="tabular">{formatCurrency(data.balanceAmount)}</span>
                </div>
              )}
              {data.supplierInvoiceNumber && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {t("grn.supplierBillWord", "Supplier bill")} {data.supplierInvoiceNumber}
                  {data.supplierInvoiceDate && ` · ${formatDate(data.supplierInvoiceDate)}`}
                </p>
              )}
            </CardContent>
          </Card>

          {data.cancelReason && (
            <Card className="border-destructive/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">{t("grn.cancelledCardTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{data.cancelReason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("grn.stockReversedNote")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("pur.cancelPurchaseTitle")}
        description={
          <div className="space-y-3">
            <p>
              {t("grn.cancelDescDetail")}
            </p>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t("common.reasonRequired")}
              rows={2}
            />
          </div>
        }
        confirmLabel={t("pur.cancelPurchase")}
        cancelLabel={t("pur.keepIt")}
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (!cancelReason.trim()) return;
          try {
            await cancel.mutateAsync({ id: purchaseId, reason: cancelReason.trim() });
            setCancelOpen(false);
            setCancelReason("");
          } catch {
            /* reason shown as a toast */
          }
        }}
      />
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
