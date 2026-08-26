"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { DocumentStatusBadge } from "@/components/common/status-badge";
import { useAuth } from "@/features/auth/auth-context";
import { usePostSalesReturn, useSalesReturn } from "@/features/transactions/hooks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

export default function SalesReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();

  const id = Number(params.id);
  const ret = useSalesReturn(Number.isFinite(id) ? id : null);
  const post = usePostSalesReturn();

  const data = ret.data;
  const isDraft = data?.status === "Draft";

  return (
    <>
      <PageHeader
        title={data ? data.returnNumber : t("sret.detailTitle", "Sales Return")}
        description={
          data?.invoiceNumber
            ? `${t("sret.againstInvoice", "Against Invoice")}: ${data.invoiceNumber}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/sales/returns")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back", "Back")}
            </Button>
            {isDraft && can(Permissions.Sales.Return) && (
              <Button variant="success" onClick={() => post.mutate(id)} disabled={post.isPending}>
                {post.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-4" />
                )}
                {t("sret.post", "Post")}
              </Button>
            )}
          </div>
        }
      />

      {ret.isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : !data ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          {t("sret.notFound", "Return not found.")}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label={t("sret.customer", "Customer")} value={data.customerName || "-"} />
              <Info label={t("sret.date", "Return Date")} value={formatDate(data.returnDate)} />
              <Info
                label={t("sret.refund", "Refund")}
                value={`${data.refundMode}${data.refundedAmount > 0 ? ` · ${formatCurrency(data.refundedAmount)}` : ""}`}
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("common.status")}</p>
                <DocumentStatusBadge status={data.status} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("sret.items", "Returned Items")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">{t("sret.item", "Item")}</th>
                      <th className="px-4 py-2 font-medium">{t("sret.batch", "Batch")}</th>
                      <th className="px-4 py-2 text-right font-medium">{t("sret.qty", "Qty")}</th>
                      <th className="px-4 py-2 text-right font-medium">{t("sret.rate", "Rate")}</th>
                      <th className="px-4 py-2 text-center font-medium">{t("sret.saleable", "Saleable")}</th>
                      <th className="px-4 py-2 text-right font-medium">{t("sret.lineTotal", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((l) => (
                      <tr key={l.salesReturnDetailId} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{l.itemName}</td>
                        <td className="px-4 py-2 text-muted-foreground">{l.batchNumber || "-"}</td>
                        <td className="px-4 py-2 text-right tabular">{formatQuantity(l.quantity)}</td>
                        <td className="px-4 py-2 text-right tabular">{formatCurrency(l.rate)}</td>
                        <td className="px-4 py-2 text-center">
                          {l.isSaleable ? t("common.yes", "Yes") : t("sret.no", "No")}
                        </td>
                        <td className="px-4 py-2 text-right tabular font-medium">
                          {formatCurrency(l.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="px-4 py-2 text-right font-medium">
                        {t("sret.grandTotal", "Credit Total")}
                      </td>
                      <td className="px-4 py-2 text-right tabular font-semibold">
                        {formatCurrency(data.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
