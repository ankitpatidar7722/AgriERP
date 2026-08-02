"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Field, FieldGrid, FormDialog } from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { companyHooks, useStates } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { CompanyListDto, CompanyQuery, SaveCompanyRequest } from "@/features/masters/types";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

// Same shapes the server validates. GSTIN: 2-digit state code, 10-char PAN,
// entity number, 'Z', checksum.
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PINCODE = /^[1-9][0-9]{5}$/;

const optionalText = (max: number) => z.string().max(max).nullable().optional();

const schema = z.object({
  companyCode: z.string().min(1, "Code is required.").max(20),
  companyName: z.string().min(1, "Name is required.").max(150),
  gstNumber: z
    .string()
    .regex(GSTIN, "15 characters, e.g. 27AAAAA0000A1Z5.")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: optionalText(300),
  city: optionalText(80),
  stateId: z.number().nullable(),
  pincode: z.string().regex(PINCODE, "6 digits.").nullable().optional().or(z.literal("")),
  phone: optionalText(15),
  email: z.string().email("Enter a valid email.").nullable().optional().or(z.literal("")),
  website: optionalText(200),
  contactPerson: optionalText(120),
  remarks: optionalText(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  companyCode: "",
  companyName: "",
  gstNumber: "",
  address: "",
  city: "",
  stateId: null,
  pincode: "",
  phone: "",
  email: "",
  website: "",
  contactPerson: "",
  remarks: "",
  isActive: true,
};

const NO_STATE = "none";

export default function CompaniesPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<CompanyQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<CompanyListDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CompanyListDto | null>(null);

  const list = companyHooks.useList(query);
  const states = useStates();
  const create = companyHooks.useCreate();
  const update = companyHooks.useUpdate();
  const remove = companyHooks.useRemove();
  // The list row is a summary; the form needs address, email and remarks too.
  const detail = companyHooks.useOne(formOpen && editing ? editing.companyId : null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(row: CompanyListDto) {
    setEditing(row);
    // Seeded from the row so the dialog is usable immediately; the detail
    // query fills the remaining fields when it lands.
    form.reset({
      ...EMPTY,
      companyCode: row.companyCode,
      companyName: row.companyName,
      gstNumber: row.gstNumber ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      contactPerson: row.contactPerson ?? "",
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  // Fills the fields the list row does not carry, once the detail lands.
  // In an effect, not the render body: resetting the form while rendering is a
  // side effect during render and re-triggers the render that caused it.
  useEffect(() => {
    const full = detail.data;
    if (!full || !editing || full.companyId !== editing.companyId) return;

    form.reset({
      companyCode: full.companyCode,
      companyName: full.companyName,
      gstNumber: full.gstNumber ?? "",
      address: full.address ?? "",
      city: full.city ?? "",
      stateId: full.stateId ?? null,
      pincode: full.pincode ?? "",
      phone: full.phone ?? "",
      email: full.email ?? "",
      website: full.website ?? "",
      contactPerson: full.contactPerson ?? "",
      remarks: full.remarks ?? "",
      isActive: full.isActive,
    });
    // form is a stable object from useForm; listing it would re-run on every
    // keystroke and wipe what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data, editing]);

  async function onSubmit(values: FormValues) {
    // Blank strings become null so the server's filtered unique indexes on
    // GST number treat "not provided" as absent rather than as a value.
    const body: SaveCompanyRequest = {
      ...values,
      gstNumber: values.gstNumber || null,
      pincode: values.pincode || null,
      email: values.email || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.companyId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<CompanyListDto>[] = [
    {
      key: "code",
      header: t("co.code"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.companyCode}</span>,
      exportValue: (row) => row.companyCode,
    },
    {
      key: "name",
      header: t("co.manufacturer"),
      sortable: true,
      cell: (row) => <span className="block max-w-[280px] truncate">{row.companyName}</span>,
      exportValue: (row) => row.companyName,
    },
    {
      key: "gst",
      header: t("cust.gstin"),
      hideBelow: "lg",
      cell: (row) => row.gstNumber ?? "-",
      exportValue: (row) => row.gstNumber ?? "",
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
      header: t("co.contact"),
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
      key: "items",
      header: t("co.items"),
      align: "right",
      hideBelow: "sm",
      cell: (row) => row.itemCount,
      exportValue: (row) => row.itemCount,
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
          {can(Permissions.Company.Edit) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.companyName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.Company.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.companyName}`}
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
        title={t("co.title")}
        description={t("co.desc")}
        actions={
          can(Permissions.Company.Create) ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("co.newCompany")}
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
        onQueryChange={(next) => setQuery(next as CompanyQuery)}
        getRowId={(row) => row.companyId}
        searchPlaceholder={t("co.search")}
        emptyMessage={t("co.empty")}
        exportFileName="companies"
        exportTitle="Manufacturers"
        filters={
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
              <SelectItem value="all">{t("co.allStatuses")}</SelectItem>
              <SelectItem value="true">{t("co.activeOnly")}</SelectItem>
              <SelectItem value="false">{t("co.inactiveOnly")}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("co.editTitle") : t("co.newCompany")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
        size="lg"
      >
        <FieldGrid>
          <Field label={t("co.code")} htmlFor="companyCode" required error={form.formState.errors.companyCode?.message}>
            <Input id="companyCode" className="uppercase" {...form.register("companyCode")} />
          </Field>
          <Field label={t("common.name")} htmlFor="companyName" required error={form.formState.errors.companyName?.message}>
            <Input id="companyName" {...form.register("companyName")} />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label={t("cust.gstin")} htmlFor="gstNumber" error={form.formState.errors.gstNumber?.message} hint={t("co.gstinHint")}>
            <Input id="gstNumber" className="uppercase" maxLength={15} {...form.register("gstNumber")} />
          </Field>
          <Field label={t("co.contactPerson")} htmlFor="contactPerson" error={form.formState.errors.contactPerson?.message}>
            <Input id="contactPerson" {...form.register("contactPerson")} />
          </Field>
        </FieldGrid>

        <Field label={t("cust.address")} htmlFor="address" error={form.formState.errors.address?.message}>
          <Textarea id="address" rows={2} {...form.register("address")} />
        </Field>

        <FieldGrid columns={3}>
          <Field label={t("cust.city")} htmlFor="city" error={form.formState.errors.city?.message}>
            <Input id="city" {...form.register("city")} />
          </Field>
          <Field label={t("cust.state")} error={form.formState.errors.stateId?.message}>
            <Select
              value={form.watch("stateId") == null ? NO_STATE : String(form.watch("stateId"))}
              onValueChange={(value) =>
                form.setValue("stateId", value === NO_STATE ? null : Number(value))
              }
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
        </FieldGrid>

        <FieldGrid columns={3}>
          <Field label={t("co.phone")} htmlFor="phone" error={form.formState.errors.phone?.message}>
            <Input id="phone" {...form.register("phone")} />
          </Field>
          <Field label={t("co.email")} htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" {...form.register("email")} />
          </Field>
          <Field label={t("co.website")} htmlFor="website" error={form.formState.errors.website?.message}>
            <Input id="website" {...form.register("website")} />
          </Field>
        </FieldGrid>

        <Field label={t("common.remarks")} htmlFor="remarks" error={form.formState.errors.remarks?.message}>
          <Textarea id="remarks" rows={2} {...form.register("remarks")} />
        </Field>

        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={form.watch("isActive")}
            onCheckedChange={(checked) => form.setValue("isActive", checked)}
          />
          <label htmlFor="isActive" className="text-sm">
            {t("common.active")}
          </label>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("co.deleteTitle")}
        description={
          <>
            <strong>{deleting?.companyName}</strong> {t("co.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.companyId);
            setDeleting(null);
          } catch {
            /* reason is shown as a toast */
          }
        }}
      />
    </>
  );
}
