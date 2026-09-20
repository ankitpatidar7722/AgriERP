"use client";

import { useDevice } from "indas-ui";
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
  const { isMobile } = useDevice();
  if (isLoading && !data) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (!data) return null;

  const bal = (n: number) =>
    n === 0 ? "0.00" : `${formatCurrency(Math.abs(n))} ${n < 0 ? "CR" : "DR"}`;

  // Phone: the 8-column ledger is unreadable, so show a simple list — an opening
  // balance strip, one clean card per voucher (date + type/no, narration, the
  // debit/credit amount and the running balance), then a closing summary.
  if (isMobile) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          <span className="font-medium">
            {t("ledger.openingBalance")}
            {data.fromDate ? ` (${t("ledger.asOn")} ${formatDate(data.fromDate)})` : ""}
          </span>
          <span className="tabular font-semibold">{bal(data.openingBalance)}</span>
        </div>

        {data.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {t("ledger.noTx")}
          </div>
        ) : (
          data.rows.map((r) => (
            <div key={r.seq} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{r.voucherType}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.transactionDate)}
                    {r.voucherNumber ? ` · ${r.voucherNumber}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {r.debit > 0 && (
                    <p className="tabular font-medium">
                      {formatCurrency(r.debit)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{t("ledger.debit")}</span>
                    </p>
                  )}
                  {r.credit > 0 && (
                    <p className="tabular font-medium">
                      {formatCurrency(r.credit)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{t("ledger.credit")}</span>
                    </p>
                  )}
                </div>
              </div>
              {r.narration && (
                <p className="mt-1.5 truncate text-xs text-muted-foreground">{r.narration}</p>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
                <span className="text-muted-foreground">{t("ledger.balance")}</span>
                <span className="tabular font-semibold">{bal(r.runningBalance)}</span>
              </div>
            </div>
          ))
        )}

        <div className="rounded-lg border-2 bg-muted/50 p-3">
          <div className="flex items-center justify-between font-semibold">
            <span>{t("ledger.closingBalance")}</span>
            <span className="tabular">{bal(data.closingBalance)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("ledger.debit")}: <span className="tabular">{formatCurrency(data.totalDebit)}</span>
            </span>
            <span>
              {t("ledger.credit")}: <span className="tabular">{formatCurrency(data.totalCredit)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

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
