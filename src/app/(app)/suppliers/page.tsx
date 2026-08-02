"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { ActiveBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Field,
  FieldGrid,
  FormDialog,
  NumberInput,
  ToggleRow,
} from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { supplierHooks, useStates } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { SaveSupplierRequest, SupplierListDto, SupplierQuery } from "@/features/masters/types";
import { formatCurrency } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE = /^[1-9][0-9]{5}$/;

const optionalText = (max: number) => z.string().max(max).nullable().optional();

const schema = z.object({
  supplierName: z.string().min(1, "Name is required.").max(150),
  gstNumber: z.string().regex(GSTIN, "15 characters, e.g. 27AAAAA0000A1Z5.").nullable().optional().or(z.literal("")),
  panNumber: z.string().regex(PAN, "10 characters, e.g. AAAAA0000A.").nullable().optional().or(z.literal("")),
  address: optionalText(300),
  city: optionalText(80),
  stateId: z.number().nullable(),
  pincode: z.string().regex(PINCODE, "6 digits.").nullable().optional().or(z.literal("")),
  phone: optionalText(15),
  alternatePhone: optionalText(15),
  email: z.string().email("Enter a valid email.").nullable().optional().or(z.literal("")),
  contactPerson: optionalText(120),
  paymentTermDays: z.number().min(0).max(365, "365 days at most."),
  creditLimit: z.number().min(0),
  openingBalance: z.number().min(0, "Enter a positive amount and pick DR or CR."),
  openingBalanceType: z.enum(["DR", "CR"]),
  bankName: optionalText(120),
  bankAccountNumber: optionalText(30),
  bankIfsc: z.string().regex(IFSC, "11 characters, e.g. SBIN0001234.").nullable().optional().or(z.literal("")),
  remarks: optionalText(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  supplierName: "",
  gstNumber: "",
  panNumber: "",
  address: "",
  city: "",
  stateId: null,
  pincode: "",
  phone: "",
  alternatePhone: "",
  email: "",
  contactPerson: "",
  paymentTermDays: 0,
  creditLimit: 0,
  openingBalance: 0,
  openingBalanceType: "CR",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  remarks: "",
  isActive: true,
};

const NO_STATE = "none";

export default function SuppliersPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<SupplierQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<SupplierListDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<SupplierListDto | null>(null);

  const list = supplierHooks.useList(query);
  const states = useStates();
  const create = supplierHooks.useCreate();
  const update = supplierHooks.useUpdate();
  const remove = supplierHooks.useRemove();
  const detail = supplierHooks.useOne(formOpen && editing ? editing.supplierId : null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const full = detail.data;
    if (!full || !editing || full.supplierId !== editing.supplierId) return;

    form.reset({
      supplierName: full.supplierName,
      gstNumber: full.gstNumber ?? "",
      panNumber: full.panNumber ?? "",
      address: full.address ?? "",
      city: full.city ?? "",
      stateId: full.stateId ?? null,
      pincode: full.pincode ?? "",
      phone: full.phone ?? "",
      alternatePhone: full.alternatePhone ?? "",
      email: full.email ?? "",
      contactPerson: full.contactPerson ?? "",
      paymentTermDays: full.paymentTermDays,
      creditLimit: full.creditLimit,
      openingBalance: full.openingBalance,
      openingBalanceType: full.openingBalanceType,
      bankName: full.bankName ?? "",
      bankAccountNumber: full.bankAccountNumber ?? "",
      bankIfsc: full.bankIfsc ?? "",
      remarks: full.remarks ?? "",
      isActive: full.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data, editing]);

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY);
    setFormOpen(true);
  }

  // Deep link from a purchase screen's "+ new supplier" button (/suppliers?new=1):
  // open the create form straight away. Read from window rather than
  // useSearchParams to keep this page statically prerenderable.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(row: SupplierListDto) {
    setEditing(row);
    form.reset({
      ...EMPTY,
      supplierName: row.supplierName,
      gstNumber: row.gstNumber ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      contactPerson: row.contactPerson ?? "",
      paymentTermDays: row.paymentTermDays,
      creditLimit: row.creditLimit,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const body: SaveSupplierRequest = {
      ...values,
      // The code is allocated by the server's number series on create and never
      // changes afterwards, so it is not sent from the form.
      supplierCode: null,
      gstNumber: values.gstNumber || null,
      panNumber: values.panNumber || null,
      pincode: values.pincode || null,
      email: values.email || null,
      bankIfsc: values.bankIfsc || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.supplierId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<SupplierListDto>[] = [
    {
      key: "code",
      header: t("sup.code"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.supplierCode}</span>,
      exportValue: (row) => row.supplierCode,
    },
    {
      key: "name",
      header: t("sup.supplier"),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate">{row.supplierName}</div>
          {row.gstNumber && (
            <div className="truncate text-xs text-muted-foreground">{row.gstNumber}</div>
          )}
        </div>
      ),
      exportValue: (row) => row.supplierName,
    },
    {
      key: "city",
      header: t("cust.city"),
      sortable: true,
      hideBelow: "md",
      cell: (row) => row.city ?? "-",
      exportValue: (row) => row.city ?? "",
    },
    {
      key: "contact",
      header: t("sup.contact"),
      hideBelow: "lg",
      cell: (row) => (
        <div className="text-sm">
          <div>{row.contactPerson ?? "-"}</div>
          {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
        </div>
      ),
      exportValue: (row) => [row.contactPerson, row.phone].filter(Boolean).join(" / "),
    },
    {
      key: "terms",
      header: t("sup.terms"),
      align: "right",
      hideBelow: "lg",
      cell: (row) =>
        row.paymentTermDays > 0 ? `${row.paymentTermDays} ${t("sup.daysShort")}` : t("sup.cash"),
      exportValue: (row) => (row.paymentTermDays > 0 ? `${row.paymentTermDays} days` : "Cash"),
    },
    {
      key: "limit",
      header: t("sup.creditLimit"),
      align: "right",
      hideBelow: "xl",
      cell: (row) => formatCurrency(row.creditLimit),
      exportValue: (row) => row.creditLimit,
    },
    {
      key: "active",
      header: t("common.status"),
      align: "center",
      cell: (row) => <ActiveBadge active={row.isActive} />,
      exportValue: (row) => (row.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {can(Permissions.Supplier.Edit) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.supplierName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.Supplier.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.supplierName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("sup.title")}
        description={t("sup.desc")}
        actions={
          can(Permissions.Supplier.Create) ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("sup.newSupplier")}
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
        onQueryChange={(next) => setQuery(next as SupplierQuery)}
        getRowId={(row) => row.supplierId}
        searchPlaceholder={t("sup.search")}
        emptyMessage={t("sup.empty")}
        exportFileName="suppliers"
        exportTitle="Suppliers"
        filters={
          <>
            <Select
              value={query.isActive == null ? "all" : String(query.isActive)}
              onValueChange={(value) =>
                setQuery({ ...query, isActive: value === "all" ? null : value === "true", page: 1 })
              }
            >
              <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sup.allStatuses")}</SelectItem>
                <SelectItem value="true">{t("sup.activeOnly")}</SelectItem>
                <SelectItem value="false">{t("sup.inactiveOnly")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={query.hasOutstanding ? "due" : "all"}
              onValueChange={(value) =>
                setQuery({ ...query, hasOutstanding: value === "due" ? true : null, page: 1 })
              }
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by dues">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sup.allSuppliers")}</SelectItem>
                <SelectItem value="due">{t("sup.withDuesOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("sup.editTitle") : t("sup.newSupplier")}
        description={editing ? undefined : t("sup.formDesc")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
        size="3xl"
      >
        <FieldGrid columns={4}>
          <Field label={t("sup.supplierName")} htmlFor="supplierName" required error={form.formState.errors.supplierName?.message}>
            <Input id="supplierName" {...form.register("supplierName")} />
          </Field>
          <Field label={t("sup.contactPerson")} htmlFor="contactPerson" error={form.formState.errors.contactPerson?.message}>
            <Input id="contactPerson" {...form.register("contactPerson")} />
          </Field>
          <Field label={t("cust.gstin")} htmlFor="gstNumber" error={form.formState.errors.gstNumber?.message}>
            <Input id="gstNumber" className="uppercase" maxLength={15} {...form.register("gstNumber")} />
          </Field>
          <Field label={t("sup.pan")} htmlFor="panNumber" error={form.formState.errors.panNumber?.message}>
            <Input id="panNumber" className="uppercase" maxLength={10} {...form.register("panNumber")} />
          </Field>

          <Field label={t("sup.phone")} htmlFor="phone" error={form.formState.errors.phone?.message}>
            <Input id="phone" {...form.register("phone")} />
          </Field>
          <Field label={t("sup.altPhone")} htmlFor="alternatePhone" error={form.formState.errors.alternatePhone?.message}>
            <Input id="alternatePhone" {...form.register("alternatePhone")} />
          </Field>
          <Field label={t("sup.email")} htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" {...form.register("email")} />
          </Field>
          <Field label={t("cust.city")} htmlFor="city" error={form.formState.errors.city?.message}>
            <Input id="city" {...form.register("city")} />
          </Field>

          <Field label={t("cust.state")} error={form.formState.errors.stateId?.message}>
            <Select
              value={form.watch("stateId") == null ? NO_STATE : String(form.watch("stateId"))}
              onValueChange={(value) => form.setValue("stateId", value === NO_STATE ? null : Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("cust.selectState")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATE}>{t("cust.notSet")}</SelectItem>
                {(states.data ?? []).map((state) => (
                  <SelectItem key={state.id} value={String(state.id)}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("cust.pincode")} htmlFor="pincode" error={form.formState.errors.pincode?.message}>
            <Input id="pincode" maxLength={6} {...form.register("pincode")} />
          </Field>
          <Field
            label={t("sup.paymentTerms")}
            htmlFor="paymentTermDays"
            error={form.formState.errors.paymentTermDays?.message}
            hint={t("sup.paymentTermsHint")}
          >
            <NumberInput
              id="paymentTermDays"
              value={form.watch("paymentTermDays")}
              onChange={(value) => form.setValue("paymentTermDays", value)}
              min={0}
            />
          </Field>
          <Field label={t("sup.creditLimit")} htmlFor="creditLimit" error={form.formState.errors.creditLimit?.message}>
            <NumberInput
              id="creditLimit"
              value={form.watch("creditLimit")}
              onChange={(value) => form.setValue("creditLimit", value)}
              min={0}
              step="0.01"
            />
          </Field>

          <Field
            label={t("sup.openingBalance")}
            htmlFor="openingBalance"
            error={form.formState.errors.openingBalance?.message}
            hint={t("sup.openingHint")}
          >
            <div className="flex gap-2">
              <NumberInput
                id="openingBalance"
                value={form.watch("openingBalance")}
                onChange={(value) => form.setValue("openingBalance", value)}
                min={0}
                step="0.01"
              />
              <Select
                value={form.watch("openingBalanceType")}
                onValueChange={(value) => form.setValue("openingBalanceType", value as "DR" | "CR")}
              >
                <SelectTrigger className="w-[76px] shrink-0" aria-label="Balance type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CR">CR</SelectItem>
                  <SelectItem value="DR">DR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field label={t("sup.bankName")} htmlFor="bankName" error={form.formState.errors.bankName?.message}>
            <Input id="bankName" {...form.register("bankName")} />
          </Field>
          <Field label={t("sup.accountNumber")} htmlFor="bankAccountNumber" error={form.formState.errors.bankAccountNumber?.message}>
            <Input id="bankAccountNumber" {...form.register("bankAccountNumber")} />
          </Field>
          <Field label={t("sup.ifsc")} htmlFor="bankIfsc" error={form.formState.errors.bankIfsc?.message}>
            <Input id="bankIfsc" className="uppercase" maxLength={11} {...form.register("bankIfsc")} />
          </Field>
        </FieldGrid>

        <FieldGrid columns={2}>
          <Field label={t("cust.address")} htmlFor="address" error={form.formState.errors.address?.message}>
            <Textarea id="address" rows={2} {...form.register("address")} />
          </Field>
          <Field label={t("common.remarks")} htmlFor="remarks" error={form.formState.errors.remarks?.message}>
            <Textarea id="remarks" rows={2} {...form.register("remarks")} />
          </Field>
        </FieldGrid>

        <ToggleRow
          id="isActive"
          label={t("common.active")}
          description={t("sup.activeDesc")}
          checked={form.watch("isActive")}
          onCheckedChange={(checked) => form.setValue("isActive", checked)}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("sup.deleteTitle")}
        description={
          <>
            <strong>{deleting?.supplierName}</strong> {t("sup.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.supplierId);
            setDeleting(null);
          } catch {
            /* reason is shown as a toast */
          }
        }}
      />
    </>
  );
}
