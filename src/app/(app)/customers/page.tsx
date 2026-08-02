"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { customerHooks, useVillages } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type {
  CustomerListDto,
  CustomerQuery,
  CustomerType,
  SaveCustomerRequest,
} from "@/features/masters/types";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

// Indian mobiles start 6-9. Rejecting a leading 0-5 catches a landline typed
// into the mobile field.
const MOBILE = /^[6-9][0-9]{9}$/;

const optionalText = (max: number) => z.string().max(max).nullable().optional();

const schema = z.object({
  customerName: z.string().min(1, "Name is required.").max(150),
  fatherName: optionalText(150),
  village: optionalText(100),
  mobile: z.string().regex(MOBILE, "10 digits starting 6-9.").nullable().optional().or(z.literal("")),
  address: optionalText(300),
  city: optionalText(80),
  customerType: z.enum(["Retail", "Wholesale", "Dealer"]),
  creditDays: z.number().min(0).max(365),
  remarks: optionalText(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  customerName: "",
  fatherName: "",
  village: "",
  mobile: "",
  address: "",
  city: "",
  customerType: "Retail",
  creditDays: 0,
  remarks: "",
  isActive: true,
};

const ALL_VILLAGES = "all";

export default function CustomersPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();
  const [query, setQuery] = useState<CustomerQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<CustomerListDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CustomerListDto | null>(null);

  const list = customerHooks.useList(query);
  const villages = useVillages();
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();
  const remove = customerHooks.useRemove();
  const detail = customerHooks.useOne(formOpen && editing ? editing.customerId : null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const full = detail.data;
    if (!full || !editing || full.customerId !== editing.customerId) return;

    form.reset({
      customerName: full.customerName,
      fatherName: full.fatherName ?? "",
      village: full.village ?? "",
      mobile: full.mobile ?? "",
      address: full.address ?? "",
      city: full.city ?? "",
      customerType: full.customerType,
      creditDays: full.creditDays,
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

  // Deep link from the billing screen's "+ new customer" button (/customers?new=1):
  // open the create form straight away so the user lands ready to type. Read from
  // window rather than useSearchParams to keep this page statically prerenderable.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(row: CustomerListDto) {
    setEditing(row);
    form.reset({
      ...EMPTY,
      customerName: row.customerName,
      village: row.village ?? "",
      mobile: row.mobile ?? "",
      customerType: row.customerType,
      creditDays: row.creditDays,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const body: SaveCustomerRequest = {
      ...values,
      customerCode: null,
      mobile: values.mobile || null,
      fatherName: values.fatherName || null,
      // Fields dropped from the simplified form still exist on the record and in
      // the ledger, so they are sent as their neutral defaults.
      alternateMobile: null,
      gstNumber: null,
      stateId: null,
      pincode: null,
      creditLimit: 0,
      openingBalance: 0,
      openingBalanceType: "DR",
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.customerId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<CustomerListDto>[] = [
    {
      key: "code",
      header: t("cust.code"),
      sortable: true,
      hideBelow: "md",
      cell: (row) => <span className="font-medium">{row.customerCode}</span>,
      exportValue: (row) => row.customerCode,
    },
    {
      key: "name",
      header: t("custLedger.customer"),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate">{row.customerName}</div>
          {/* Village disambiguates the four Ramesh Patils on the list. */}
          {row.village && (
            <div className="truncate text-xs text-muted-foreground">{row.village}</div>
          )}
        </div>
      ),
      exportValue: (row) => row.customerName,
    },
    {
      key: "village",
      header: t("cust.village"),
      sortable: true,
      hideBelow: "lg",
      cell: (row) => row.village ?? "-",
      exportValue: (row) => row.village ?? "",
    },
    {
      key: "mobile",
      header: t("common.mobile"),
      sortable: true,
      cell: (row) => row.mobile ?? "-",
      exportValue: (row) => row.mobile ?? "",
    },
    {
      key: "type",
      header: t("cust.type"),
      align: "center",
      hideBelow: "sm",
      cell: (row) => t(`cust.${row.customerType.toLowerCase()}`, row.customerType),
      exportValue: (row) => row.customerType,
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
          {can(Permissions.Customer.Edit) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.customerName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.Customer.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.customerName}`}
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
        title={t("cust.title")}
        description={t("cust.desc")}
        actions={
          can(Permissions.Customer.Create) ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("cust.newCustomer")}
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
        onQueryChange={(next) => setQuery(next as CustomerQuery)}
        getRowId={(row) => row.customerId}
        onRowClick={(row) => router.push(`/customers/${row.customerId}`)}
        searchPlaceholder={t("cust.search")}
        emptyMessage={t("cust.empty")}
        exportFileName="customers"
        exportTitle="Customers"
        filters={
          <>
            <Select
              value={query.village ?? ALL_VILLAGES}
              onValueChange={(value) =>
                setQuery({ ...query, village: value === ALL_VILLAGES ? null : value, page: 1 })
              }
            >
              <SelectTrigger className="w-[160px]" aria-label="Filter by village">
                <SelectValue placeholder={t("cust.allVillages")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VILLAGES}>{t("cust.allVillages")}</SelectItem>
                {(villages.data ?? []).map((village) => (
                  <SelectItem key={village} value={village}>
                    {village}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={query.customerType ?? "all"}
              onValueChange={(value) =>
                setQuery({
                  ...query,
                  customerType: value === "all" ? null : (value as CustomerType),
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[140px]" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cust.allTypes")}</SelectItem>
                <SelectItem value="Retail">{t("cust.retail")}</SelectItem>
                <SelectItem value="Wholesale">{t("cust.wholesale")}</SelectItem>
                <SelectItem value="Dealer">{t("cust.dealer")}</SelectItem>
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
                <SelectItem value="all">{t("cust.allCustomers")}</SelectItem>
                <SelectItem value="due">{t("cust.withDues")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("cust.editTitle") : t("cust.newCustomer")}
        description={editing ? undefined : t("cust.formDesc")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
        size="3xl"
      >
        <FieldGrid columns={4}>
          <Field label={t("cust.name")} htmlFor="customerName" required error={form.formState.errors.customerName?.message}>
            <Input id="customerName" {...form.register("customerName")} />
          </Field>
          <Field label={t("cust.fatherName")} htmlFor="fatherName" hint={t("common.optional")} error={form.formState.errors.fatherName?.message}>
            <Input id="fatherName" {...form.register("fatherName")} />
          </Field>
          <Field label={t("cust.village")} htmlFor="village" error={form.formState.errors.village?.message}>
            <Input id="village" {...form.register("village")} />
          </Field>
          <Field label={t("common.mobile")} htmlFor="mobile" error={form.formState.errors.mobile?.message}>
            <Input id="mobile" inputMode="numeric" maxLength={10} {...form.register("mobile")} />
          </Field>

          <Field label={t("cust.city")} htmlFor="city" error={form.formState.errors.city?.message}>
            <Input id="city" {...form.register("city")} />
          </Field>
          <Field
            label={t("cust.priceType")}
            error={form.formState.errors.customerType?.message}
            hint={t("cust.priceTypeHint")}
          >
            <Select
              value={form.watch("customerType")}
              onValueChange={(value) => form.setValue("customerType", value as CustomerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Retail">{t("cust.retail")}</SelectItem>
                <SelectItem value="Wholesale">{t("cust.wholesale")}</SelectItem>
                <SelectItem value="Dealer">{t("cust.dealer")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("profile.creditDays")} htmlFor="creditDays" error={form.formState.errors.creditDays?.message}>
            <NumberInput
              id="creditDays"
              value={form.watch("creditDays")}
              onChange={(value) => form.setValue("creditDays", value)}
              min={0}
            />
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
          description={t("cust.activeDesc")}
          checked={form.watch("isActive")}
          onCheckedChange={(checked) => form.setValue("isActive", checked)}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("cust.deleteTitle")}
        description={
          <>
            <strong>{deleting?.customerName}</strong> {t("cust.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.customerId);
            setDeleting(null);
          } catch {
            /* reason is shown as a toast */
          }
        }}
      />
    </>
  );
}
