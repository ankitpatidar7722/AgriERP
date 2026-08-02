"use client";

import { useState } from "react";
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
import { Field, FieldGrid, FormDialog, NumberInput } from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { itemSubGroupHooks } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { ItemSubGroupListDto, ItemSubGroupQuery, SaveItemSubGroupRequest } from "@/features/masters/types";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const schema = z.object({
  itemSubGroupCode: z
    .string()
    .min(1, "Code is required.")
    .max(20, "Keep the code to 20 characters.")
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, digits, hyphen and underscore only."),
  itemSubGroupName: z.string().min(1, "Name is required.").max(100),
  parentItemSubGroupId: z.number().nullable(),
  description: z.string().max(300).nullable(),
  displayOrder: z.number().min(0, "Cannot be negative."),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  itemSubGroupCode: "",
  itemSubGroupName: "",
  parentItemSubGroupId: null,
  description: "",
  displayOrder: 0,
  isActive: true,
};

// Radix Select cannot hold an empty-string value, so "no parent" needs a
// sentinel that is mapped back to null on submit.
const NO_PARENT = "none";

export default function ItemSubGroupsPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<ItemSubGroupQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<ItemSubGroupListDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ItemSubGroupListDto | null>(null);

  const list = itemSubGroupHooks.useList(query);
  const lookup = itemSubGroupHooks.useLookup();
  const create = itemSubGroupHooks.useCreate();
  const update = itemSubGroupHooks.useUpdate();
  const remove = itemSubGroupHooks.useRemove();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(row: ItemSubGroupListDto) {
    setEditing(row);
    form.reset({
      itemSubGroupCode: row.itemSubGroupCode,
      itemSubGroupName: row.itemSubGroupName,
      parentItemSubGroupId: row.parentItemSubGroupId ?? null,
      description: row.description ?? "",
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    });
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const body: SaveItemSubGroupRequest = { ...values, iconName: null };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.itemSubGroupId, body });
      } else {
        await create.mutateAsync(body);
      }
      setFormOpen(false);
    } catch (error) {
      // Field errors land on the inputs; anything else has already been
      // surfaced as a toast by the mutation hook.
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const columns: DataColumn<ItemSubGroupListDto>[] = [
    {
      key: "code",
      header: t("sub.code"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.itemSubGroupCode}</span>,
      exportValue: (row) => row.itemSubGroupCode,
    },
    {
      key: "name",
      header: t("sub.subGroup"),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate">{row.itemSubGroupName}</div>
          {row.parentItemSubGroupName && (
            <div className="truncate text-xs text-muted-foreground">
              {t("sub.under")} {row.parentItemSubGroupName}
            </div>
          )}
        </div>
      ),
      exportValue: (row) => row.itemSubGroupName,
    },
    {
      key: "parent",
      header: t("sub.parent"),
      hideBelow: "lg",
      cell: (row) => row.parentItemSubGroupName ?? "-",
      exportValue: (row) => row.parentItemSubGroupName ?? "",
    },
    {
      key: "items",
      header: t("sub.items"),
      align: "right",
      hideBelow: "sm",
      cell: (row) => row.itemCount,
      exportValue: (row) => row.itemCount,
    },
    {
      key: "active",
      header: t("common.status"),
      sortable: true,
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
          {can(Permissions.ItemSubGroup.Edit) && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.itemSubGroupName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.ItemSubGroup.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.itemSubGroupName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const isSaving = create.isPending || update.isPending;

  return (
    <>
      <PageHeader
        title={t("sub.title")}
        description={t("sub.desc")}
        actions={
          can(Permissions.ItemSubGroup.Create) ? (
            <Button variant="neutral" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" />
              {t("sub.newSubGroup")}
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
        onQueryChange={(next) => setQuery(next as ItemSubGroupQuery)}
        getRowId={(row) => row.itemSubGroupId}
        searchPlaceholder={t("sub.search")}
        emptyMessage={t("sub.empty")}
        exportFileName="itemSubGroups"
        exportTitle="ItemSubGroups"
        filters={
          <Select
            value={query.isActive == null ? "all" : String(query.isActive)}
            onValueChange={(value) =>
              setQuery({
                ...query,
                isActive: value === "all" ? null : value === "true",
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-[140px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("sub.allStatuses")}</SelectItem>
              <SelectItem value="true">{t("sub.activeOnly")}</SelectItem>
              <SelectItem value="false">{t("sub.inactiveOnly")}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("sub.editTitle") : t("sub.newSubGroup")}
        description={t("sub.formDesc")}
        onSubmit={form.handleSubmit(onSubmit)}
        isPending={isSaving}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
      >
        <FieldGrid>
          <Field
            label={t("sub.code")}
            htmlFor="itemSubGroupCode"
            required
            error={form.formState.errors.itemSubGroupCode?.message}
          >
            <Input id="itemSubGroupCode" {...form.register("itemSubGroupCode")} className="uppercase" />
          </Field>

          <Field
            label={t("common.name")}
            htmlFor="itemSubGroupName"
            required
            error={form.formState.errors.itemSubGroupName?.message}
          >
            <Input id="itemSubGroupName" {...form.register("itemSubGroupName")} />
          </Field>
        </FieldGrid>

        <FieldGrid>
          <Field label={t("sub.parentSubGroup")} error={form.formState.errors.parentItemSubGroupId?.message}>
            <Select
              value={
                form.watch("parentItemSubGroupId") == null
                  ? NO_PARENT
                  : String(form.watch("parentItemSubGroupId"))
              }
              onValueChange={(value) =>
                form.setValue("parentItemSubGroupId", value === NO_PARENT ? null : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("sub.topLevel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>{t("sub.topLevel")}</SelectItem>
                {(lookup.data ?? [])
                  // A itemSubGroup cannot be its own parent.
                  .filter((option) => option.id !== editing?.itemSubGroupId)
                  .map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t("sub.displayOrder")}
            htmlFor="displayOrder"
            error={form.formState.errors.displayOrder?.message}
            hint={t("sub.displayOrderHint")}
          >
            <NumberInput
              id="displayOrder"
              value={form.watch("displayOrder")}
              onChange={(value) => form.setValue("displayOrder", value)}
              min={0}
            />
          </Field>
        </FieldGrid>

        <Field label={t("sub.description")} htmlFor="description" error={form.formState.errors.description?.message}>
          <Textarea id="description" rows={2} {...form.register("description")} />
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
        title={t("sub.deleteTitle")}
        description={
          <>
            <strong>{deleting?.itemSubGroupName}</strong> {t("sub.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.itemSubGroupId);
            setDeleting(null);
          } catch {
            // The hook toasts the reason - the "still in use" message names
            // exactly what is blocking it, so the dialog stays open.
          }
        }}
      />
    </>
  );
}
