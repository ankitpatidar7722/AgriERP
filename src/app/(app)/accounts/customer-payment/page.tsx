"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, FieldGrid, FormDialog } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/features/auth/auth-context";
import {
  useCancelPayment,
  useCreatePayment,
  useOpenBills,
  usePaymentModes,
  usePayments,
} from "@/features/transactions/hooks";
import { useCustomerLookup, useCustomerProfile } from "@/features/masters/hooks";
import type { PaymentDto, PaymentQuery } from "@/features/transactions/types";
import { useT } from "@/features/i18n/provider";
import { formatCurrency, formatDate, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";

export default function CustomerPaymentPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();

  const [query, setQuery] = useState<PaymentQuery>({
    page: 1,
    pageSize: 25,
    partyType: "Customer",
    paymentType: "Receipt",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [cancelling, setCancelling] = useState<PaymentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // form state
  const [custId, setCustId] = useState<number | null>(null);
  const [custLabel, setCustLabel] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [amount, setAmount] = useState(0);
  const [modeId, setModeId] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");

  const list = usePayments(query);
  const debounced = useDebouncedValue(search);
  const customers = useCustomerLookup(debounced);
  const modes = usePaymentModes();
  const profile = useCustomerProfile(custId);
  const openBills = useOpenBills(custId ? "Customer" : null, custId);
  const create = useCreatePayment();
  const cancel = useCancelPayment();

  // "Record payment" deep-link from a customer profile: ?customerId=
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("customerId"));
    if (id > 0) {
      setCustId(id);
      setFormOpen(true);
    }
  }, []);

  const selectedMode = modes.data?.find((m) => m.id === modeId);
  const outstanding = profile.data?.outstanding ?? 0;

  function openForm() {
    setCustId(null);
    setCustLabel("");
    setSearch("");
    setDate(toIsoDate(new Date()));
    setAmount(0);
    setModeId(modes.data?.[0]?.id ?? null);
    setReference("");
    setRemarks("");
    setFormOpen(true);
  }

  const customerOptions: SearchPickerOption[] = (customers.data ?? []).map((c) => ({
    id: c.id,
    primary: c.name,
    secondary: c.description ?? undefined,
    trailing: c.code,
  }));

  async function save() {
    if (!custId) {
      toast.error(t("custPay.selectCustomer"));
      return;
    }
    if (amount <= 0) {
      toast.error(t("custPay.enterAmount"));
      return;
    }
    if (!modeId) {
      toast.error(t("custPay.chooseMode"));
      return;
    }
    if (selectedMode?.requiresReference && !reference.trim()) {
      toast.error(`${selectedMode.name} ${t("custPay.needsRef")}`);
      return;
    }

    // Allocate oldest-first against open bills; the rest stays on account.
    const bills = [...(openBills.data ?? [])].sort((a, b) => b.ageDays - a.ageDays);
    let remaining = amount;
    const allocations: { referenceType: string; referenceId: number; allocatedAmount: number }[] = [];
    for (const b of bills) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.balanceAmount);
      if (take > 0) {
        allocations.push({ referenceType: b.referenceType, referenceId: b.referenceId, allocatedAmount: take });
        remaining = Math.round((remaining - take) * 100) / 100;
      }
    }

    try {
      const payment = await create.mutateAsync({
        paymentDate: date,
        partyType: "Customer",
        customerId: custId,
        paymentType: "Receipt",
        paymentModeId: modeId,
        amount,
        referenceNumber: reference || null,
        clearanceStatus: "Cleared",
        remarks: remarks || null,
        allocations,
      });
      toast.success(`Receipt ${payment.voucherNumber} saved.`);
      setFormOpen(false);
    } catch {
      /* the hook surfaces the reason */
    }
  }

  const columns: DataColumn<PaymentDto>[] = [
    {
      key: "number",
      header: t("custPay.receiptNo"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.voucherNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.paymentDate)}</div>
        </div>
      ),
      exportValue: (row) => row.voucherNumber,
    },
    {
      key: "customer",
      header: t("custLedger.customer"),
      sortable: true,
      cell: (row) => <div className="max-w-[220px] truncate">{row.partyName}</div>,
      exportValue: (row) => row.partyName,
    },
    {
      key: "amount",
      header: t("common.amount"),
      align: "right",
      sortable: true,
      cell: (row) => <span className="tabular font-medium">{formatCurrency(row.amount)}</span>,
      exportValue: (row) => row.amount,
    },
    {
      key: "mode",
      header: t("custPay.mode"),
      hideBelow: "sm",
      cell: (row) => row.paymentModeName,
      exportValue: (row) => row.paymentModeName,
    },
    {
      key: "reference",
      header: t("custPay.reference"),
      hideBelow: "lg",
      cell: (row) => row.referenceNumber ?? "-",
      exportValue: (row) => row.referenceNumber ?? "",
    },
    {
      key: "onaccount",
      header: t("custPay.onAccount"),
      align: "right",
      hideBelow: "md",
      cell: (row) =>
        row.unallocatedAmount > 0 ? (
          <span className="text-warning">{formatCurrency(row.unallocatedAmount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      exportValue: (row) => row.unallocatedAmount,
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (row) => (
        <span
          className={
            row.status === "Cancelled" ? "text-xs text-destructive" : "text-xs text-[#2e9e4f]"
          }
        >
          {row.status}
        </span>
      ),
      exportValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/payments/${row.paymentId}/print`)}
            aria-label={`Print ${row.voucherNumber}`}
            title={t("custPay.printReceipt")}
          >
            <Printer className="size-4" />
          </Button>
          {row.status !== "Cancelled" && can(Permissions.Payment.Cancel) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => {
                setCancelling(row);
                setCancelReason("");
              }}
              aria-label={`Cancel ${row.voucherNumber}`}
              title={t("custPay.cancelReceipt")}
            >
              <Ban className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const willAllocate = useMemo(() => Math.min(amount, outstanding), [amount, outstanding]);

  return (
    <>
      <PageHeader
        title={t("custPay.title")}
        description={t("custPay.desc")}
        actions={
          can(Permissions.Payment.Create) ? (
            <Button variant="neutral" onClick={openForm}>
              <Plus className="mr-1.5 size-4" />
              {t("custPay.newReceipt")}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as PaymentQuery)}
        getRowId={(row) => row.paymentId}
        searchPlaceholder={t("custPay.searchReceipt")}
        emptyMessage={t("custPay.noReceipts")}
        exportFileName="customer-receipts"
        exportTitle="Customer payment history"
        filters={
          <>
            <Input
              type="date"
              value={query.fromDate ?? ""}
              onChange={(e) => setQuery({ ...query, fromDate: e.target.value || null, page: 1 })}
              className="w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={query.toDate ?? ""}
              onChange={(e) => setQuery({ ...query, toDate: e.target.value || null, page: 1 })}
              className="w-[150px]"
              aria-label="To date"
            />
          </>
        }
      />

      {/* ------------------------------ new receipt ---------------------------- */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t("custPay.formTitle")}
        description={t("custPay.formDesc")}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        isPending={create.isPending}
        submitLabel={t("custPay.saveReceipt")}
        size="lg"
      >
        <FieldGrid columns={2}>
          <Field label={t("custLedger.customer")} required>
            {custId ? (
              <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                <span className="truncate font-medium">
                  {custLabel || profile.data?.customerName || "Selected"}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCustId(null);
                    setCustLabel("");
                  }}
                >
                  change
                </button>
              </div>
            ) : (
              <SearchPicker
                value={search}
                onValueChange={setSearch}
                options={customerOptions}
                isLoading={customers.isFetching}
                openOnFocus
                placeholder={t("custLedger.searchCustomer")}
                emptyMessage={t("custLedger.noCustomer")}
                onSelect={(o) => {
                  setCustId(o.id);
                  setCustLabel(o.primary);
                }}
              />
            )}
          </Field>
          <Field label={t("custPay.currentOutstanding")}>
            <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-semibold tabular text-destructive">
              {custId ? formatCurrency(outstanding) : "-"}
            </div>
          </Field>
        </FieldGrid>

        <FieldGrid columns={2}>
          <Field label={t("custPay.receiptDate")} htmlFor="rdate">
            <Input id="rdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t("common.amount")} required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="text-right tabular"
            />
          </Field>
        </FieldGrid>

        <FieldGrid columns={2}>
          <Field label={t("custPay.paymentMode")} required>
            <Select
              value={modeId != null ? String(modeId) : ""}
              onValueChange={(v) => setModeId(Number(v))}
            >
              <SelectTrigger aria-label={t("custPay.paymentMode")}>
                <SelectValue placeholder={t("custPay.selectMode")} />
              </SelectTrigger>
              <SelectContent>
                {(modes.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t("custPay.referenceNumber")}
            hint={selectedMode?.requiresReference ? t("custPay.refRequired") : t("custPay.refHint")}
          >
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("common.optional")} />
          </Field>
        </FieldGrid>

        <Field label={t("common.remarks")} htmlFor="rrem">
          <Textarea id="rrem" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>

        {custId && amount > 0 && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {willAllocate > 0 && (
              <>
                {t("custPay.appliesTo")} {formatCurrency(willAllocate)} {t("custPay.toOldest")}{" "}
              </>
            )}
            {amount > outstanding && (
              <>
                {formatCurrency(amount - outstanding)} {t("custPay.heldAdvance")}
              </>
            )}
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={t("custPay.cancelTitle")}
        description={
          <div className="space-y-3">
            <p>{t("custPay.cancelDesc")}</p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("common.reasonRequired")}
              rows={2}
            />
          </div>
        }
        confirmLabel={t("custPay.cancelReceipt")}
        cancelLabel={t("custPay.keepIt")}
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (!cancelling || !cancelReason.trim()) return;
          try {
            await cancel.mutateAsync({ id: cancelling.paymentId, reason: cancelReason.trim() });
            setCancelling(null);
          } catch {
            /* toast shows the reason */
          }
        }}
      />
    </>
  );
}
