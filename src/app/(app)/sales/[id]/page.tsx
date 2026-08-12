"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { DocumentStatusBadge, PaymentStatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useCancelSale, usePostSale, useSale } from "@/features/transactions/hooks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const saleId = Number(params.id);

  const sale = useSale(saleId);
  const post = usePostSale();
  const cancel = useCancelSale();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (sale.isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const data = sale.data;
  if (!data) return null;

  const isDraft = data.status === "Draft";
  const isPosted = data.status === "Posted";

  return (
    <>
      <PageHeader
        title={data.invoiceNumber}
        description={`${formatDate(data.invoiceDate)} · ${data.customerName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/sales")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back")}
            </Button>

            {isDraft && can(Permissions.Sales.Post) && (
              <Button onClick={() => post.mutate(saleId)} disabled={post.isPending}>
                {post.isPending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-4" />
                )}
                {t("sale.postInvoice")}
              </Button>
            )}

            {data.status !== "Cancelled" && can(Permissions.Sales.Print) && (
              <Button onClick={() => router.push(`/sales/${saleId}/sales-order-print`)}>
                <Printer className="mr-1.5 size-4" />
                {t("common.print")}
              </Button>
            )}

            {isPosted && can(Permissions.Sales.Print) && (
              <Button variant="outline" onClick={() => router.push(`/sales/${saleId}/print`)}>
                <FileText className="mr-1.5 size-4" />
                {t("sale.taxInvoiceDoc")}
              </Button>
            )}

            {data.status !== "Cancelled" && can(Permissions.Sales.Cancel) && (
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
              <CardTitle className="text-base">{t("sale.items")}</CardTitle>
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
                      <th className="py-2 pr-3 text-left font-medium">{t("sale.item")}</th>
                      <th className="px-2 py-2 text-left font-medium">{t("sale.batch")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("sale.qty")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("sale.rate")}</th>
                      <th className="px-2 py-2 text-right font-medium">{t("sale.gst")}</th>
                      <th className="py-2 pl-2 text-right font-medium">{t("common.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <tr key={line.salesDetailId} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="max-w-[220px] truncate">{line.itemName}</div>
                          {line.hsnCode && (
                            <div className="text-xs text-muted-foreground">
                              {t("sale.hsn")} {line.hsnCode}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <div>{line.batchNumber ?? "-"}</div>
                          {line.expiryDate && (
                            <div className="text-muted-foreground">
                              {t("sale.exp")} {formatDate(line.expiryDate)}
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
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {line.gstPercent}%
                        </td>
                        <td className="py-2 pl-2 text-right tabular font-medium">
                          {formatCurrency(line.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/*
                One requested line can become several here: the server picks
                batches by earliest expiry and splits when the quantity spans
                more than one.
              */}
              {data.lines.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {data.lines.length} {t("sale.lineSuffix")}
                </p>
              )}
            </CardContent>
          </Card>

          {data.payments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("sale.paymentReceived")}</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {data.payments.map((payment) => (
                      <tr key={payment.salePaymentId} className="border-b last:border-0">
                        <td className="py-2">{payment.paymentModeName}</td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {payment.referenceNumber ?? ""}
                        </td>
                        <td className="py-2 text-right tabular">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("sale.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={t("sale.gross")} value={formatCurrency(data.grossAmount)} />
              {data.discountAmount > 0 && (
                <Row label={t("sale.discount")} value={`- ${formatCurrency(data.discountAmount)}`} />
              )}
              <Row label={t("sale.taxable")} value={formatCurrency(data.taxableAmount)} />
              {data.isInterState ? (
                <Row label={t("sale.igst")} value={formatCurrency(data.igstAmount)} muted />
              ) : (
                <>
                  <Row label={t("sale.cgst")} value={formatCurrency(data.cgstAmount)} muted />
                  <Row label={t("sale.sgst")} value={formatCurrency(data.sgstAmount)} muted />
                </>
              )}
              {data.otherCharges > 0 && (
                <Row label={t("sale.otherCharges")} value={formatCurrency(data.otherCharges)} muted />
              )}
              {data.roundOff !== 0 && (
                <Row label={t("sale.roundOff")} value={formatCurrency(data.roundOff)} muted />
              )}
              <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                <span>{t("common.total")}</span>
                <span className="tabular">{formatCurrency(data.grandTotal)}</span>
              </div>
              <Row label={t("sale.received")} value={formatCurrency(data.receivedAmount)} />
              {data.balanceAmount > 0 && (
                <div className="flex items-center justify-between font-medium text-destructive">
                  <span>{t("sale.balance")}</span>
                  <span className="tabular">{formatCurrency(data.balanceAmount)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margin is only present when the viewer holds Report.Profit; the
              server strips it from the payload otherwise. */}
          {data.grossProfit != null && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("sale.margin")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label={t("sale.costOfGoods")} value={formatCurrency(data.totalCostAmount ?? 0)} />
                <div className="flex items-center justify-between border-t pt-2 font-medium">
                  <span>{t("sale.grossProfit")}</span>
                  <span className="tabular">{formatCurrency(data.grossProfit)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {data.cancelReason && (
            <Card className="border-destructive/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">{t("sale.status.cancelled")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{data.cancelReason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("sale.stockRestored")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("sale.cancelTitle")}
        description={
          <div className="space-y-3">
            <p>
              {isPosted
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
          if (!cancelReason.trim()) return;
          try {
            await cancel.mutateAsync({ id: saleId, reason: cancelReason.trim() });
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
