"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCustomerLedger, useCustomerLookup } from "@/features/masters/hooks";
import { LedgerTable } from "@/features/accounts/ledger-table";
import { useT } from "@/features/i18n/provider";
import { formatCurrency } from "@/lib/format";

export default function CustomerLedgerPage() {
  const router = useRouter();
  const t = useT();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const debounced = useDebouncedValue(search);
  const customers = useCustomerLookup(debounced);
  const ledger = useCustomerLedger(customerId, from || null, to || null);

  // Deep-link from a customer profile: ?customerId=
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("customerId"));
    if (id > 0) setCustomerId(id);
  }, []);

  const options: SearchPickerOption[] = (customers.data ?? []).map((c) => ({
    id: c.id,
    primary: c.name,
    secondary: c.description ?? undefined,
    trailing: c.code,
  }));

  return (
    <>
      <PageHeader
        title={t("custLedger.title")}
        description={t("custLedger.desc")}
        actions={
          customerId ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/customers/${customerId}`)}>
                <ExternalLink className="mr-1.5 size-4" />
                {t("custLedger.fullProfile")}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 size-4" />
                {t("common.print")}
              </Button>
            </>
          ) : null
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("custLedger.customer")}>
            {customerId ? (
              <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                <span className="truncate font-medium">{customerLabel || "—"}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCustomerId(null);
                    setCustomerLabel("");
                  }}
                >
                  {t("custLedger.change")}
                </button>
              </div>
            ) : (
              <SearchPicker
                value={search}
                onValueChange={setSearch}
                options={options}
                isLoading={customers.isFetching}
                openOnFocus
                placeholder={t("custLedger.searchCustomer")}
                emptyMessage={t("custLedger.noCustomer")}
                onSelect={(o) => {
                  setCustomerId(o.id);
                  setCustomerLabel(o.primary);
                }}
              />
            )}
          </Field>
          <Field label={t("common.fromDate")} htmlFor="from">
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("common.toDate")} htmlFor="to">
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {ledger.data && (
            <Field label={t("ledger.closingBalance")}>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold tabular">
                {ledger.data.closingBalance === 0
                  ? "0.00"
                  : `${formatCurrency(Math.abs(ledger.data.closingBalance))} ${
                      ledger.data.closingBalance < 0 ? "CR" : "DR"
                    }`}
              </div>
            </Field>
          )}
        </CardContent>
      </Card>

      {customerId ? (
        <LedgerTable data={ledger.data} isLoading={ledger.isLoading} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {t("custLedger.pickCustomer")}
        </div>
      )}
    </>
  );
}
