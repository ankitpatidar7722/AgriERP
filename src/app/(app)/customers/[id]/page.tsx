"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { useAuth } from "@/features/auth/auth-context";
import { customerHooks, useCustomerLedger, useCustomerProfile } from "@/features/masters/hooks";
import type { CustomerLedgerRow } from "@/features/masters/types";
import { useT } from "@/features/i18n/provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { LedgerTable } from "@/features/accounts/ledger-table";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const customerId = Number(params.id);

  const profile = useCustomerProfile(customerId);
  const ledger = useCustomerLedger(customerId);
  const detail = customerHooks.useOne(customerId);

  if (profile.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  const p = profile.data;
  if (!p) return null;

  const rows = ledger.data?.rows ?? [];
  const purchases = rows.filter((r) => r.voucherType === "Sales Invoice");
  const payments = rows.filter((r) => r.voucherType === "Payment Receipt" || r.voucherType === "Receipt");
  const returns = rows.filter((r) => r.voucherType === "Sales Return");

  return (
    <>
      <PageHeader
        title={p.customerName}
        description={`${p.customerCode} · ${p.customerType}${p.village ? ` · ${p.village}` : ""}${
          p.mobile ? ` · ${p.mobile}` : ""
        }`}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/customers")}>
              <ArrowLeft className="mr-1.5 size-4" />
              {t("common.back")}
            </Button>
            {can(Permissions.Payment.Create) && (
              <Button onClick={() => router.push(`/accounts/customer-payment?customerId=${customerId}`)}>
                <Wallet className="mr-1.5 size-4" />
                {t("profile.recordPayment")}
              </Button>
            )}
          </>
        }
      />

      {/* ------------------------------ summary ------------------------------- */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t("profile.outstanding")}
          value={formatCurrency(p.outstanding)}
          tone={p.outstanding > 0 ? "danger" : "ok"}
          big
        />
        <Stat label={t("profile.totalPurchases")} value={formatCurrency(p.totalPurchases)} />
        <Stat label={t("profile.totalPayments")} value={formatCurrency(p.totalPayments)} />
        <Stat
          label={t("profile.openingBalance")}
          value={`${formatCurrency(Math.abs(p.openingBalance))} ${p.openingBalance < 0 ? "CR" : "DR"}`}
        />
        <Stat label={t("profile.creditLimit")} value={p.creditLimit > 0 ? formatCurrency(p.creditLimit) : "-"} />
        <Stat label={t("profile.creditDays")} value={String(p.creditDays)} />
        <Stat label={t("profile.lastPurchase")} value={p.lastPurchaseDate ? formatDate(p.lastPurchaseDate) : "-"} />
        <Stat
          label={t("profile.nextDue")}
          value={p.nextDueDate ? formatDate(p.nextDueDate) : "-"}
          tone={p.nextDueDate && new Date(p.nextDueDate) < new Date() ? "danger" : "default"}
        />
      </div>

      {p.overCreditLimit && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t("profile.overLimit")} {formatCurrency(p.creditLimit)}.
        </div>
      )}

      {/* -------------------------------- tabs -------------------------------- */}
      <Tabs defaultValue="ledger">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="ledger">
            <BookOpen className="mr-1.5 size-4" />
            {t("profile.ledger")}
          </TabsTrigger>
          <TabsTrigger value="purchases">
            {t("profile.purchases")} ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            {t("profile.payments")} ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="returns">
            {t("profile.returns")} ({returns.length})
          </TabsTrigger>
          <TabsTrigger value="notes">{t("profile.notes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-3">
          <LedgerTable data={ledger.data} isLoading={ledger.isLoading} />
        </TabsContent>

        <TabsContent value="purchases" className="mt-3">
          <VoucherList rows={purchases} amountKey="debit" emptyText={t("common.noData")} onOpen={(r) => r.referenceId && router.push(`/sales/${r.referenceId}`)} />
        </TabsContent>
        <TabsContent value="payments" className="mt-3">
          <VoucherList rows={payments} amountKey="credit" emptyText={t("common.noData")} />
        </TabsContent>
        <TabsContent value="returns" className="mt-3">
          <VoucherList rows={returns} amountKey="credit" emptyText={t("common.noData")} />
        </TabsContent>
        <TabsContent value="notes" className="mt-3">
          <Card>
            <CardContent className="p-4 text-sm">
              {detail.data?.remarks ? (
                <p className="whitespace-pre-wrap">{detail.data.remarks}</p>
              ) : (
                <p className="text-muted-foreground">{t("profile.noNotes")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  big,
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "danger";
  big?: boolean;
}) {
  const toneCls =
    tone === "danger" ? "text-destructive" : tone === "ok" ? "text-[#2e9e4f]" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 font-semibold tabular ${big ? "text-xl" : "text-base"} ${toneCls}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function VoucherList({
  rows,
  amountKey,
  emptyText,
  onOpen,
}: {
  rows: CustomerLedgerRow[];
  amountKey: "debit" | "credit";
  emptyText: string;
  onOpen?: (row: CustomerLedgerRow) => void;
}) {
  const t = useT();
  if (rows.length === 0)
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t("common.date")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("profile.number")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("profile.narration")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("common.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.seq}
              className={`border-t ${onOpen ? "cursor-pointer hover:bg-muted/40" : ""}`}
              onClick={() => onOpen?.(r)}
            >
              <td className="px-3 py-2">{formatDate(r.transactionDate)}</td>
              <td className="px-3 py-2 font-medium">{r.voucherNumber ?? "-"}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.narration}</td>
              <td className="px-3 py-2 text-right tabular font-medium">
                {formatCurrency(r[amountKey])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
