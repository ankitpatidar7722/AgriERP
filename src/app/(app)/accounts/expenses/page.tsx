"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, Plus, Trash2 } from "lucide-react";
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
import { Field, FieldGrid, FormDialog, NumberInput } from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { expenseHooks, useExpenseCategories, usePaymentModes } from "@/features/transactions/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { ExpenseDto, ExpenseQuery, SaveExpenseRequest } from "@/features/transactions/types";
import { formatCurrency, formatDate, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const ALL = "all";

const schema = z.object({
  expenseDate: z.string().min(1, "Date is required."),
  expenseCategoryId: z.number().min(1, "Select a category."),
  paymentModeId: z.number().min(1, "Select a payment mode."),
  amount: z.number().min(0.01, "Enter an amount greater than zero."),
  gstAmount: z.number().min(0),
  paidTo: z.string().max(150).nullable(),
  billNumber: z.string().max(50).nullable(),
  referenceNumber: z.string().max(60).nullable(),
  description: z.string().max(500).nullable(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm = (): FormValues => ({
  expenseDate: toIsoDate(new Date()),
  expenseCategoryId: 0,
  paymentModeId: 0,
  amount: 0,
  gstAmount: 0,
  paidTo: "",
  billNumber: "",
  referenceNumber: "",
  description: "",
});

export default function ExpensesPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<ExpenseQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseDto | null>(null);

  const list = expenseHooks.useList(query);
  const create = expenseHooks.useCreate();
  const update = expenseHooks.useUpdate();
  const remove = expenseHooks.useRemove();
  const categories = useExpenseCategories();
  const modes = usePaymentModes();

  const canWrite = can(Permissions.Payment.ExpenseCreate);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm() });

  function openCreate() {
    setEditing(null);
    form.reset(emptyForm());
    setFormOpen(true);
  }

  function openEdit(row: ExpenseDto) {
    setEditing(row);
    form.reset({
      expenseDate: row.expenseDate.slice(0, 10),
      expenseCategoryId: row.expenseCategoryId,
      paymentModeId: row.paymentModeId,
      amount: row.amount,
      gstAmount: row.gstAmount,
      paidTo: row.paidTo ?? "",
      billNumber: row.billNumber ?? "",
      referenceNumber: row.referenceNumber ?? "",
      description: row.description ?? "",
    });
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const body: SaveExpenseRequest = {
      expenseDate: values.expenseDate,
      expenseCategoryId: values.expenseCategoryId,
      paymentModeId: values.paymentModeId,
      amount: values.amount,
      gstAmount: values.gstAmount,
      paidTo: values.paidTo || null,
      billNumber: values.billNumber || null,
      referenceNumber: values.referenceNumber || null,
      description: values.description || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.expenseId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<ExpenseDto>[] = [
    {
      key: "voucher",
      header: t("exp.voucher", "Voucher"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.voucherNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.expenseDate)}</div>
        </div>
      ),
      exportValue: (row) => row.voucherNumber,
    },
    {
      key: "category",
      header: t("exp.category", "Category"),
      sortable: true,
      cell: (row) => <div className="max-w-[220px] truncate">{row.expenseCategoryName}</div>,
      exportValue: (row) => row.expenseCategoryName,
    },
    {
      key: "paidTo",
      header: t("exp.paidTo", "Paid To"),
      hideBelow: "md",
      cell: (row) => <span className="text-muted-foreground">{row.paidTo || "-"}</span>,
      exportValue: (row) => row.paidTo ?? "",
    },
    {
      key: "amount",
      header: t("exp.amount", "Amount"),
      align: "right",
      cell: (row) => formatCurrency(row.amount),
      exportValue: (row) => row.amount,
    },
    {
      key: "gst",
      header: t("exp.gst", "GST"),
      align: "right",
      hideBelow: "sm",
      cell: (row) => (row.gstAmount > 0 ? formatCurrency(row.gstAmount) : "-"),
      exportValue: (row) => row.gstAmount,
    },
    {
      key: "total",
      header: t("exp.total", "Total"),
      align: "right",
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalAmount)}</span>,
      exportValue: (row) => row.totalAmount,
    },
    {
      key: "mode",
      header: t("exp.mode", "Mode"),
      align: "center",
      hideBelow: "lg",
      cell: (row) => row.paymentModeName,
      exportValue: (row) => row.paymentModeName,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label="Edit expense">
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label="Delete expense"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("exp.title", "Expenses")}
        description={t("exp.desc", "Shop running costs - rent, electricity, wages and other charges. Deducted from gross profit for the year.")}
        actions={
          canWrite ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("exp.newExpense", "New Expense")}
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
        onQueryChange={(next) => setQuery(next as ExpenseQuery)}
        getRowId={(row) => row.expenseId}
        searchPlaceholder={t("exp.search", "Search voucher, paid-to or bill no...")}
        emptyMessage={t("exp.empty", "No expenses recorded yet.")}
        exportFileName="expenses"
        exportTitle="Expenses"
        filters={
          <>
            <Input
              type="date"
              value={query.fromDate ?? ""}
              onChange={(event) => setQuery({ ...query, fromDate: event.target.value || null, page: 1 })}
              className="w-full sm:w-[150px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={query.toDate ?? ""}
              onChange={(event) => setQuery({ ...query, toDate: event.target.value || null, page: 1 })}
              className="w-full sm:w-[150px]"
              aria-label="To date"
            />
            <Select
              value={query.expenseCategoryId ? String(query.expenseCategoryId) : ALL}
              onValueChange={(value) =>
                setQuery({ ...query, expenseCategoryId: value === ALL ? null : Number(value), page: 1 })
              }
            >
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by category">
                <SelectValue placeholder={t("exp.category", "Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("exp.allCategories", "All categories")}</SelectItem>
                {(categories.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("exp.editTitle", "Edit Expense") : t("exp.newExpense", "New Expense")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
        size="lg"
      >
        <FieldGrid columns={2}>
          <Field label={t("exp.date", "Date")} htmlFor="expenseDate" required error={form.formState.errors.expenseDate?.message}>
            <Input id="expenseDate" type="date" {...form.register("expenseDate")} />
          </Field>
          <Field label={t("exp.category", "Category")} htmlFor="expenseCategoryId" required error={form.formState.errors.expenseCategoryId?.message}>
            <Select
              value={form.watch("expenseCategoryId") ? String(form.watch("expenseCategoryId")) : ""}
              onValueChange={(value) => form.setValue("expenseCategoryId", Number(value))}
            >
              <SelectTrigger id="expenseCategoryId">
                <SelectValue placeholder={t("exp.selectCategory", "Select category")} />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("exp.amount", "Amount")} htmlFor="amount" required error={form.formState.errors.amount?.message}>
            <NumberInput
              id="amount"
              value={form.watch("amount")}
              onChange={(value) => form.setValue("amount", value)}
              min={0}
              step="0.01"
            />
          </Field>
          <Field label={t("exp.gstOptional", "GST (input credit, optional)")} htmlFor="gstAmount" error={form.formState.errors.gstAmount?.message}>
            <NumberInput
              id="gstAmount"
              value={form.watch("gstAmount")}
              onChange={(value) => form.setValue("gstAmount", value)}
              min={0}
              step="0.01"
            />
          </Field>

          <Field label={t("exp.mode", "Payment Mode")} htmlFor="paymentModeId" required error={form.formState.errors.paymentModeId?.message}>
            <Select
              value={form.watch("paymentModeId") ? String(form.watch("paymentModeId")) : ""}
              onValueChange={(value) => form.setValue("paymentModeId", Number(value))}
            >
              <SelectTrigger id="paymentModeId">
                <SelectValue placeholder={t("exp.selectMode", "Select mode")} />
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
          <Field label={t("exp.paidTo", "Paid To")} htmlFor="paidTo" error={form.formState.errors.paidTo?.message}>
            <Input id="paidTo" {...form.register("paidTo")} />
          </Field>

          <Field label={t("exp.billNo", "Bill No")} htmlFor="billNumber" error={form.formState.errors.billNumber?.message}>
            <Input id="billNumber" {...form.register("billNumber")} />
          </Field>
          <Field label={t("exp.referenceNo", "Reference No")} htmlFor="referenceNumber" error={form.formState.errors.referenceNumber?.message}>
            <Input id="referenceNumber" {...form.register("referenceNumber")} />
          </Field>
        </FieldGrid>

        <Field label={t("common.remarks", "Remarks")} htmlFor="description" error={form.formState.errors.description?.message}>
          <Textarea id="description" rows={2} {...form.register("description")} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("exp.deleteTitle", "Delete expense?")}
        description={
          <>
            <strong>{deleting?.voucherNumber}</strong>{" "}
            {t("exp.deleteDesc", "will be permanently removed from the expense record.")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.expenseId);
            setDeleting(null);
          } catch {
            /* reason shown as a toast; keep the dialog open */
          }
        }}
      />
    </>
  );
}
