"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/features/i18n/provider";
import { formatCurrency, formatDate } from "@/lib/format";

/** The subset of a ledger DTO this table renders - customer OR supplier both fit. */
export interface LedgerData {
  fromDate?: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  rows: {
    seq: number;
    transactionDate: string;
    voucherType: string;
    voucherNumber?: string | null;
    narration?: string | null;
    debit: number;
    credit: number;
    runningBalance: number;
    createdByName?: string | null;
  }[];
}

/** A Tally-style ledger: opening row, one row per voucher with a running balance, then a closing total. */
export function LedgerTable({
  data,
  isLoading,
}: {
  data?: LedgerData;
  isLoading?: boolean;
}) {
  const t = useT();
  if (isLoading && !data) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (!data) return null;

  const bal = (n: number) =>
    n === 0 ? "0.00" : `${formatCurrency(Math.abs(n))} ${n < 0 ? "CR" : "DR"}`;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t("common.date")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("ledger.voucherType")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("ledger.voucherNo")}</th>
            <th className="min-w-[180px] px-3 py-2 text-left font-medium">{t("ledger.narration")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ledger.debit")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ledger.credit")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("ledger.balance")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("ledger.by")}</th>
          </tr>
        </thead>
        <tbody>
          {/* opening carried into the window */}
          <tr className="border-t bg-muted/30 font-medium">
            <td className="px-3 py-2" colSpan={6}>
              {t("ledger.openingBalance")}
              {data.fromDate ? ` (${t("ledger.asOn")} ${formatDate(data.fromDate)})` : ""}
            </td>
            <td className="px-3 py-2 text-right tabular">{bal(data.openingBalance)}</td>
            <td />
          </tr>

          {data.rows.length === 0 ? (
            <tr className="border-t">
              <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                {t("ledger.noTx")}
              </td>
            </tr>
          ) : (
            data.rows.map((r) => (
              <tr key={r.seq} className="border-t">
                <td className="whitespace-nowrap px-3 py-2">{formatDate(r.transactionDate)}</td>
                <td className="px-3 py-2">{r.voucherType}</td>
                <td className="px-3 py-2 font-medium">{r.voucherNumber ?? "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.narration}</td>
                <td className="px-3 py-2 text-right tabular">
                  {r.debit > 0 ? formatCurrency(r.debit) : ""}
                </td>
                <td className="px-3 py-2 text-right tabular">
                  {r.credit > 0 ? formatCurrency(r.credit) : ""}
                </td>
                <td className="px-3 py-2 text-right tabular font-medium">{bal(r.runningBalance)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.createdByName ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-muted/40 font-semibold">
            <td className="px-3 py-2" colSpan={4}>
              {t("ledger.closingBalance")}
            </td>
            <td className="px-3 py-2 text-right tabular">{formatCurrency(data.totalDebit)}</td>
            <td className="px-3 py-2 text-right tabular">{formatCurrency(data.totalCredit)}</td>
            <td className="px-3 py-2 text-right tabular">{bal(data.closingBalance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
