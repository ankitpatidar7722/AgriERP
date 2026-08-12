"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { supplierHooks, useSupplierLedger } from "@/features/masters/hooks";
import { LedgerTable } from "@/features/accounts/ledger-table";
import { useT } from "@/features/i18n/provider";
import { formatCurrency } from "@/lib/format";

export default function SupplierLedgerPage() {
  const t = useT();
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierLabel, setSupplierLabel] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const suppliers = supplierHooks.useLookup();
  const ledger = useSupplierLedger(supplierId, from || null, to || null);

  // Deep-link from a supplier screen: ?supplierId=
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("supplierId"));
    if (id > 0) setSupplierId(id);
  }, []);

  const options: SearchPickerOption[] = (suppliers.data ?? [])
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 30)
    .map((s) => ({
      id: s.id,
      primary: s.name,
      secondary: s.description ?? undefined,
      trailing: s.code,
    }));

  return (
    <>
      <PageHeader
        title={t("supLedger.title")}
        description={t("supLedger.desc")}
        actions={
          supplierId ? (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 size-4" />
              {t("common.print")}
            </Button>
          ) : null
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("supLedger.supplier")}>
            {supplierId ? (
              <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                <span className="truncate font-medium">{supplierLabel || "—"}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSupplierId(null);
                    setSupplierLabel("");
                  }}
                >
                  {t("supLedger.change")}
                </button>
              </div>
            ) : (
              <SearchPicker
                value={search}
                onValueChange={setSearch}
                options={options}
                isLoading={suppliers.isFetching}
                openOnFocus
                placeholder={t("supLedger.searchSupplier")}
                emptyMessage={t("supLedger.noSupplier")}
                onSelect={(o) => {
                  setSupplierId(o.id);
                  setSupplierLabel(o.primary);
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

      {supplierId ? (
        <LedgerTable data={ledger.data} isLoading={ledger.isLoading} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {t("supLedger.pickSupplier")}
        </div>
      )}
    </>
  );
}
