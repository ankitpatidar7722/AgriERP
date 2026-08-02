"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { ActiveBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, FieldGrid, FormDialog, NumberInput } from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { unitHooks } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { SaveUnitRequest, UnitDto } from "@/features/masters/types";
import type { QueryParameters } from "@/types/api";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const schema = z.object({
  unitCode: z
    .string()
    .min(1, "Code is required.")
    .max(10)
    .regex(/^[A-Za-z]+$/, "Letters only."),
  unitName: z.string().min(1, "Name is required.").max(50),
  description: z.string().max(150).nullable(),
  allowDecimal: z.boolean(),
  displayOrder: z.number().min(0),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  unitCode: "",
  unitName: "",
  description: "",
  allowDecimal: true,
  displayOrder: 0,
  isActive: true,
};

export default function UnitsPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<QueryParameters>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<UnitDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<UnitDto | null>(null);

  const list = unitHooks.useList(query);
  const create = unitHooks.useCreate();
  const update = unitHooks.useUpdate();
  const remove = unitHooks.useRemove();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(row: UnitDto) {
    setEditing(row);
    form.reset({
      unitCode: row.unitCode,
      unitName: row.unitName,
      description: row.description ?? "",
      allowDecimal: row.allowDecimal,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const body: SaveUnitRequest = values;
    try {
      if (editing) await update.mutateAsync({ id: editing.unitId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<UnitDto>[] = [
    {
      key: "code",
      header: t("unit.code"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.unitCode}</span>,
      exportValue: (row) => row.unitCode,
    },
    {
      key: "name",
      header: t("unit.unit"),
      sortable: true,
      cell: (row) => row.unitName,
      exportValue: (row) => row.unitName,
    },
    {
      key: "decimals",
      header: t("unit.fractions"),
      align: "center",
      hideBelow: "sm",
      // Seeds sell in half kilos; bags of urea do not.
      cell: (row) => (row.allowDecimal ? t("unit.allowed") : t("unit.wholeOnly")),
      exportValue: (row) => (row.allowDecimal ? "Allowed" : "Whole only"),
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
          {can(Permissions.Item.Edit) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.unitName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.Item.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.unitName}`}
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
        title={t("unit.title")}
        description={t("unit.desc")}
        actions={
          can(Permissions.Item.Create) ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("unit.newUnit")}
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
        onQueryChange={setQuery}
        getRowId={(row) => row.unitId}
        searchPlaceholder={t("unit.search")}
        emptyMessage={t("unit.empty")}
        exportFileName="units"
        exportTitle="Units of measure"
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("unit.editTitle") : t("unit.newUnit")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
      >
        <FieldGrid>
          <Field label={t("unit.code")} htmlFor="unitCode" required error={form.formState.errors.unitCode?.message}>
            <Input id="unitCode" className="uppercase" {...form.register("unitCode")} />
          </Field>
          <Field label={t("common.name")} htmlFor="unitName" required error={form.formState.errors.unitName?.message}>
            <Input id="unitName" {...form.register("unitName")} />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label={t("unit.description")} htmlFor="description" error={form.formState.errors.description?.message}>
            <Input id="description" {...form.register("description")} />
          </Field>
          <Field label={t("unit.displayOrder")} htmlFor="displayOrder" error={form.formState.errors.displayOrder?.message}>
            <NumberInput
              id="displayOrder"
              value={form.watch("displayOrder")}
              onChange={(value) => form.setValue("displayOrder", value)}
              min={0}
            />
          </Field>
        </FieldGrid>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="allowDecimal"
              checked={form.watch("allowDecimal")}
              onCheckedChange={(checked) => form.setValue("allowDecimal", checked)}
            />
            <label htmlFor="allowDecimal" className="text-sm">
              {t("unit.allowFractional")}
            </label>
          </div>
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
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("unit.deleteTitle")}
        description={
          <>
            <strong>{deleting?.unitCode}</strong> {t("unit.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.unitId);
            setDeleting(null);
          } catch {
            /* reason is shown as a toast; keep the dialog open */
          }
        }}
      />
    </>
  );
}
