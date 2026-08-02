"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { ActiveBadge, StockStatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  Field,
  FieldGrid,
  FormDialog,
  FormSection,
  NumberInput,
} from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { itemHooks, itemSubGroupHooks, useItemFormLookups } from "@/features/masters/hooks";
import { useItemFormDefinition, useItemGroups } from "@/features/items/hooks";
import {
  DynamicField,
  validateDynamicFields,
  type FieldValue,
  type LookupTable,
} from "@/features/items/dynamic-field";
import type { ItemFormDefinitionDto } from "@/features/items/types";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import { ApiError } from "@/types/api";
import type { ItemListDto, ItemQuery, SaveItemRequest } from "@/features/masters/types";
import { formatCurrency, formatDate, formatPacking, formatQuantity } from "@/lib/format";
import { firstErrorMessage } from "@/lib/form-errors";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const schema = z
  .object({
    itemName: z.string().min(1, "Name is required.").max(200),
    shortName: z.string().max(60).nullable().optional(),
    technicalName: z.string().max(200).nullable().optional(),
    itemSubGroupId: z.number().min(1, "Select a sub group."),
    companyId: z.number().nullable(),
    brand: z.string().max(100).nullable().optional(),
    packingSize: z.number().nullable(),
    packingUnitId: z.number().nullable(),
    unitId: z.number().min(1, "Select a unit."),
    purchaseUnitId: z.number().nullable(),
    stockUnitId: z.number().nullable(),
    hsnId: z.number().nullable(),
    gstSlabId: z.number().min(1, "Select a GST rate."),
    purchaseRate: z.number().min(0),
    sellingRate: z.number().min(0),
    mrp: z.number().min(0),
    wholesaleRate: z.number().min(0),
    dealerRate: z.number().min(0),
    minSellingRate: z.number().min(0),
    minStockLevel: z.number().min(0),
    maxStockLevel: z.number().min(0),
    reorderLevel: z.number().min(0),
    isBatchTracked: z.boolean(),
    isExpiryTracked: z.boolean(),
    allowNegativeStock: z.boolean(),
    isActive: z.boolean(),
  })
  // The same three rules the server enforces, checked here so the operator
  // sees them before the round trip.
  .refine((v) => v.mrp <= 0 || v.sellingRate <= v.mrp, {
    message: "Cannot exceed the MRP - billing above MRP is not permitted.",
    path: ["sellingRate"],
  })
  .refine((v) => v.minSellingRate <= 0 || v.sellingRate >= v.minSellingRate, {
    message: "Cannot be below the minimum selling rate.",
    path: ["sellingRate"],
  })
  .refine((v) => v.maxStockLevel <= 0 || v.maxStockLevel >= v.minStockLevel, {
    message: "Cannot be below the minimum.",
    path: ["maxStockLevel"],
  })
  .refine((v) => v.packingSize == null || v.packingUnitId != null, {
    message: "Select a packing unit when a pack size is entered.",
    path: ["packingUnitId"],
  })
  .refine((v) => !v.isExpiryTracked || v.isBatchTracked, {
    message: "Expiry tracking needs batch tracking.",
    path: ["isExpiryTracked"],
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  itemName: "",
  shortName: "",
  technicalName: "",
  itemSubGroupId: 0,
  companyId: null,
  brand: "",
  packingSize: null,
  packingUnitId: null,
  unitId: 0,
  purchaseUnitId: null,
  stockUnitId: null,
  hsnId: null,
  gstSlabId: 0,
  purchaseRate: 0,
  sellingRate: 0,
  mrp: 0,
  wholesaleRate: 0,
  dealerRate: 0,
  minSellingRate: 0,
  minStockLevel: 0,
  maxStockLevel: 0,
  reorderLevel: 0,
  isBatchTracked: true,
  isExpiryTracked: true,
  allowNegativeStock: false,
  isActive: true,
};

const NONE = "none";
const ALL = "all";

/**
 * The group-specific half of the item form, rendered from the definition the
 * API returned rather than from anything written here.
 *
 * Fields are grouped under their SectionName so the form reads as sections
 * rather than a run of unrelated inputs, and each keeps the column span the
 * definition asked for.
 */
function DynamicGroupFields({
  definition,
  isLoading,
  values,
  errors,
  onChange,
  lookups,
}: {
  definition: ItemFormDefinitionDto | undefined;
  isLoading: boolean;
  values: Record<number, FieldValue>;
  errors: Record<number, string>;
  onChange: (fieldId: number, value: FieldValue) => void;
  lookups: LookupTable;
}) {
  const t = useT();
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("item.loadingGroupFields")}</p>;
  }

  const fields = (definition?.fields ?? []).filter((f) => !f.isStoredOnItem);
  if (fields.length === 0) return null;

  const sections = Array.from(new Set(fields.map((f) => f.sectionName ?? "Details")));

  return (
    <>
      {sections.map((section) => (
        <div key={section} className="space-y-4">
          <FormSection title={section} />
          <FieldGrid columns={4}>
            {fields
              .filter((f) => (f.sectionName ?? "Details") === section)
              .map((field) => (
                <DynamicField
                  key={field.itemGroupFieldId}
                  field={field}
                  value={values[field.itemGroupFieldId] ?? null}
                  error={errors[field.itemGroupFieldId]}
                  lookups={lookups}
                  onChange={(value) => onChange(field.itemGroupFieldId, value)}
                />
              ))}
          </FieldGrid>
        </div>
      ))}
    </>
  );
}

export default function ItemsPage() {
  const { can } = useAuth();
  const t = useT();
  const [query, setQuery] = useState<ItemQuery>({ page: 1, pageSize: 25 });
  const [editing, setEditing] = useState<ItemListDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ItemListDto | null>(null);
  const [invalidNotice, setInvalidNotice] = useState<string | null>(null);

  /*
    The header dropdown's group. It scopes the grid to one group at a time -
    Products by default - and becomes the group a new item is created under, so
    the create form no longer has to ask for it. Kept apart from itemGroupId
    below: opening an item from another group to edit it must not silently
    re-filter the list underneath.
  */
  const [listGroupId, setListGroupId] = useState<number | null>(null);

  /*
    The group the OPEN form is working in. It drives the form's sub-group list
    and swaps in that group's own fields - a seed asks for germination and a lot
    number where a pesticide asks for a CIB licence. For a new item it inherits
    the header group; for an edit it comes from the item being edited.
  */
  const [itemGroupId, setItemGroupId] = useState<number | null>(null);
  const [extraValues, setExtraValues] = useState<Record<number, FieldValue>>({});
  const [extraErrors, setExtraErrors] = useState<Record<number, string>>({});

  const groups = useItemGroups();
  const formDefinition = useItemFormDefinition(itemGroupId);

  // Land on the first group (Products) once the list arrives, and scope the
  // grid to it from the first fetch rather than showing every group briefly.
  useEffect(() => {
    if (listGroupId != null || !groups.data || groups.data.length === 0) return;
    const first = groups.data[0].itemGroupId;
    setListGroupId(first);
    setQuery((current) => ({ ...current, itemGroupId: first, page: 1 }));
  }, [groups.data, listGroupId]);

  /** The group name shown, read-only, at the top of the create/edit form. */
  const activeGroupName = useMemo(() => {
    const group = (groups.data ?? []).find((g) => g.itemGroupId === itemGroupId);
    return group ? `${group.itemGroupName} (${group.itemCodePrefix}-)` : "";
  }, [groups.data, itemGroupId]);

  /*
    Sub groups, narrowed to the chosen group.
    The lookup list carries no group id, so this reads the full master instead.
    Offering all sixteen would let the operator put a seed under Fertilizers
    Master - the API rejects that mismatch, but only after the save, and the
    complaint names a field the form does not show.
  */
  const allSubGroups = itemSubGroupHooks.useList({ page: 1, pageSize: 200 });
  const subGroupsForGroup = useMemo(
    () =>
      (allSubGroups.data?.items ?? []).filter(
        (s) => itemGroupId == null || s.itemGroupId === itemGroupId,
      ),
    [allSubGroups.data, itemGroupId],
  );

  // The grid's sub-group filter only offers sub-groups of the group on screen -
  // once the grid shows Fertilizers, "Insecticide" has no business in the list.
  const subGroupsForListGroup = useMemo(
    () =>
      (allSubGroups.data?.items ?? []).filter(
        (s) => listGroupId == null || s.itemGroupId === listGroupId,
      ),
    [allSubGroups.data, listGroupId],
  );

  const list = itemHooks.useList(query);
  const lookups = useItemFormLookups();
  const create = itemHooks.useCreate();
  const update = itemHooks.useUpdate();
  const remove = itemHooks.useRemove();
  const detail = itemHooks.useOne(formOpen && editing ? editing.itemId : null);

  /*
    Option lists a dynamic select can name, keyed exactly as LookupSource is on
    the server. Two of them - fertilizer form and sowing season - are short
    fixed vocabularies with no table behind them; listing them here keeps a
    two-row master out of the database for something that never changes.
  */
  const dynamicLookups: LookupTable = useMemo(() => {
    const options = lookups.data;
    const asOptions = (rows: { id: number; name?: string; code?: string }[] | undefined) =>
      (rows ?? []).map((row) => ({ id: row.id, label: row.name ?? row.code ?? String(row.id) }));

    return {
      subgroups: asOptions(options?.itemSubGroups),
      companies: asOptions(options?.companies),
      units: asOptions(options?.units),
      gstslabs: asOptions(options?.gstSlabs),
      hsncodes: asOptions(options?.hsnCodes),
      locations: asOptions(options?.storageLocations),
      fertilizerform: [
        { id: 1, label: "Granular" },
        { id: 2, label: "Powder" },
        { id: 3, label: "Liquid" },
        { id: 4, label: "Water soluble" },
      ],
      season: [
        { id: 1, label: "Kharif" },
        { id: 2, label: "Rabi" },
        { id: 3, label: "Zaid" },
        { id: 4, label: "All season" },
      ],
    };
  }, [lookups.data]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const full = detail.data;
    if (!full || !editing || full.itemId !== editing.itemId) return;

    form.reset({
      itemName: full.itemName,
      shortName: full.shortName ?? "",
      technicalName: full.technicalName ?? "",
      itemSubGroupId: full.itemSubGroupId,
      companyId: full.companyId ?? null,
      brand: full.brand ?? "",
      packingSize: full.packingSize ?? null,
      packingUnitId: full.packingUnitId ?? null,
      unitId: full.unitId,
      purchaseUnitId: full.purchaseUnitId ?? null,
      stockUnitId: full.stockUnitId ?? null,
      hsnId: full.hsnId ?? null,
      gstSlabId: full.gstSlabId,
      purchaseRate: full.purchaseRate,
      sellingRate: full.sellingRate,
      mrp: full.mrp,
      wholesaleRate: full.wholesaleRate,
      dealerRate: full.dealerRate,
      minSellingRate: full.minSellingRate,
      minStockLevel: full.minStockLevel,
      maxStockLevel: full.maxStockLevel,
      reorderLevel: full.reorderLevel,
      isBatchTracked: full.isBatchTracked,
      isExpiryTracked: full.isExpiryTracked,
      allowNegativeStock: full.allowNegativeStock,
      isActive: full.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data, editing]);

  // The saved values arrive keyed by field id, which is the same key the form
  // renders and posts under - no name matching anywhere in the round trip.
  useEffect(() => {
    const full = detail.data;
    if (!full || !editing || full.itemId !== editing.itemId) return;
    setItemGroupId(full.itemGroupId);
    setExtraValues(full.extraFields ?? {});
  }, [detail.data, editing]);

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY);
    setInvalidNotice(null);
    // A new item belongs to the group shown in the list, so the form no longer
    // asks for it.
    setItemGroupId(listGroupId ?? groups.data?.[0]?.itemGroupId ?? null);
    setExtraValues({});
    setExtraErrors({});
    setFormOpen(true);
  }

  function openEdit(row: ItemListDto) {
    setEditing(row);
    form.reset({ ...EMPTY, itemName: row.itemName, itemSubGroupId: row.itemSubGroupId });
    setInvalidNotice(null);
    setExtraErrors({});
    setFormOpen(true);
  }

  /**
   * Switching the group shown in the list.
   *
   * The grid re-fetches scoped to the new group, and the sub-group filter is
   * cleared because the one that was set belonged to the group leaving the
   * screen.
   */
  function changeListGroup(nextGroupId: number) {
    setListGroupId(nextGroupId);
    setQuery((current) => ({
      ...current,
      itemGroupId: nextGroupId,
      itemSubGroupId: null,
      page: 1,
    }));
  }

  /**
   * Runs when validation blocks the submit.
   *
   * Every field is on screen now, and react-hook-form scrolls to the first
   * invalid one - but the form is tall enough to scroll, so a summary at the
   * top says what happened without the operator having to hunt for red text.
   */
  function onInvalid(errors: typeof form.formState.errors) {
    const message = firstErrorMessage(errors);
    const count = Object.keys(errors).length;
    setInvalidNotice(
      count > 1
        ? `${count} ${t("item.fieldsNeedAttention")} ${message ?? ""}`.trim()
        : (message ?? t("item.checkHighlightedField")),
    );
  }

  async function onSubmit(values: FormValues) {
    setInvalidNotice(null);

    // The group's own fields are validated from their definition, since they
    // are not in the zod schema - the schema cannot know about a field that
    // was added by a migration after this file was written.
    const groupFields = (formDefinition.data?.fields ?? []).filter((f) => !f.isStoredOnItem);
    const fieldErrors = validateDynamicFields(groupFields, extraValues, t);
    setExtraErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      setInvalidNotice(Object.values(fieldErrors)[0]);
      return;
    }

    const extraFields: Record<number, string | null> = {};
    for (const field of groupFields) {
      const value = extraValues[field.itemGroupFieldId];
      extraFields[field.itemGroupFieldId] =
        value == null || value === "" ? null : String(value);
    }

    const body: SaveItemRequest = {
      ...values,
      itemGroupId: itemGroupId ?? 0,
      extraFields,
      itemCode: null,
      isRateInclusiveOfTax: false,
      defaultLocationId: null,
      shortName: values.shortName || null,
      technicalName: values.technicalName || null,
      brand: values.brand || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.itemId, body });
      else await create.mutateAsync(body);
      setFormOpen(false);
    } catch (error) {
      // Field-level errors land on their inputs. Anything else - a duplicate
      // code, a conflict, a server fault - only ever produced a toast, which
      // fades while the dialog stays open, leaving the operator looking at a
      // form that refused to save for no visible reason. Keep the reason on
      // screen for as long as the form is.
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));

      // The notice is set unconditionally, not only when the error had no
      // field mapping. A server error can name a field this form does not
      // render - itemGroupId, or one of the group's own fields - and
      // form.setError on a key with no input attached puts the message
      // nowhere. The dialog then sits open having refused to save, with no
      // reason on screen, which is the exact complaint that started all this.
      setInvalidNotice(
        error instanceof ApiError ? error.message : t("item.saveFailed"),
      );
    }
  }

  const columns: DataColumn<ItemListDto>[] = [
    {
      key: "code",
      header: t("item.code"),
      sortable: true,
      hideBelow: "lg",
      cell: (row) => <span className="font-medium">{row.itemCode}</span>,
      exportValue: (row) => row.itemCode,
    },
    {
      key: "name",
      header: t("item.colItem"),
      sortable: true,
      cell: (row) => (
        <div className="min-w-0 max-w-[320px]">
          <div className="truncate font-medium">{row.itemName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {/* The technical name is what farmers actually ask for. */}
            {[row.technicalName, formatPacking(row.packingSize, row.packingUnitCode)]
              .filter((part) => part && part !== "-")
              .join(" · ")}
          </div>
        </div>
      ),
      exportValue: (row) => row.itemName,
    },
    {
      key: "itemSubGroup",
      header: t("item.subGroup"),
      sortable: true,
      hideBelow: "md",
      cell: (row) => (
        <div className="text-sm">
          <div>{row.itemSubGroupName}</div>
          {row.companyName && (
            <div className="text-xs text-muted-foreground">{row.companyName}</div>
          )}
        </div>
      ),
      exportValue: (row) => row.itemSubGroupName,
    },
    {
      key: "stock",
      header: t("item.stock"),
      sortable: true,
      align: "right",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <div>
            {formatQuantity(row.currentStock)}{" "}
            <span className="text-xs text-muted-foreground">{row.unitCode}</span>
          </div>
          {row.nearestExpiryDate && (
            <div className="text-xs text-muted-foreground">
              {t("item.expPrefix")} {formatDate(row.nearestExpiryDate)}
            </div>
          )}
        </div>
      ),
      exportValue: (row) => row.currentStock,
    },
    {
      key: "rate",
      header: t("item.colSelling"),
      sortable: true,
      align: "right",
      cell: (row) => formatCurrency(row.sellingRate),
      exportValue: (row) => row.sellingRate,
    },
    {
      key: "mrp",
      header: t("item.mrp"),
      sortable: true,
      align: "right",
      hideBelow: "lg",
      cell: (row) => formatCurrency(row.mrp),
      exportValue: (row) => row.mrp,
    },
    {
      key: "gst",
      header: t("item.colGst"),
      align: "right",
      hideBelow: "xl",
      cell: (row) => `${row.gstPercent}%`,
      exportValue: (row) => row.gstPercent,
    },
    {
      key: "status",
      header: t("item.colStockStatus"),
      align: "center",
      // The label is the encoding, not the colour - warning and critical steps
      // fall below 3:1 on white and would vanish in print or for a
      // colour-blind reader.
      cell: (row) => <StockStatusBadge status={row.stockStatus} />,
      exportValue: (row) => row.stockStatus,
    },
    {
      key: "active",
      header: "",
      align: "center",
      hideBelow: "xl",
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
            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)} aria-label={`Edit ${row.itemName}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permissions.Item.Delete) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.itemName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const options = lookups.data;

  return (
    <>
      <PageHeader
        title={t("item.title")}
        description={t("item.desc")}
        actions={
          <div className="flex items-center gap-2">
            {/*
              The group picker sits with the action, not among the grid's own
              filters: it decides which set of items the screen is about at all,
              and a new item is created into whichever group is showing.
            */}
            <Select
              value={listGroupId ? String(listGroupId) : ""}
              onValueChange={(value) => changeListGroup(Number(value))}
            >
              <SelectTrigger className="w-[190px]" aria-label="Item group">
                <SelectValue placeholder={t("item.selectGroup")} />
              </SelectTrigger>
              <SelectContent>
                {(groups.data ?? []).map((group) => (
                  <SelectItem key={group.itemGroupId} value={String(group.itemGroupId)}>
                    {group.itemGroupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {can(Permissions.Item.Create) && (
              <Button variant="neutral" onClick={openCreate}>
                <Plus className="mr-1.5 size-4" />
                {t("item.newItem")}
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as ItemQuery)}
        getRowId={(row) => row.itemId}
        searchPlaceholder={t("item.search")}
        emptyMessage={t("item.empty")}
        exportFileName="items"
        exportTitle="Item list"
        filters={
          <>
            <Select
              value={query.itemSubGroupId == null ? ALL : String(query.itemSubGroupId)}
              onValueChange={(value) =>
                setQuery({ ...query, itemSubGroupId: value === ALL ? null : Number(value), page: 1 })
              }
            >
              <SelectTrigger className="w-[160px]" aria-label="Filter by sub group">
                <SelectValue placeholder={t("item.allSubGroups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("item.allSubGroups")}</SelectItem>
                {subGroupsForListGroup.map((option) => (
                  <SelectItem key={option.itemSubGroupId} value={String(option.itemSubGroupId)}>
                    {option.itemSubGroupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={query.companyId == null ? ALL : String(query.companyId)}
              onValueChange={(value) =>
                setQuery({ ...query, companyId: value === ALL ? null : Number(value), page: 1 })
              }
            >
              <SelectTrigger className="w-[160px]" aria-label="Filter by company">
                <SelectValue placeholder={t("item.allCompanies")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("item.allCompanies")}</SelectItem>
                {(options?.companies ?? []).map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={query.stockStatus ?? ALL}
              onValueChange={(value) =>
                setQuery({ ...query, stockStatus: value === ALL ? null : value, page: 1 })
              }
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by stock">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("item.allStock")}</SelectItem>
                <SelectItem value="InStock">{t("item.inStock")}</SelectItem>
                <SelectItem value="LowStock">{t("item.lowStock")}</SelectItem>
                <SelectItem value="OutOfStock">{t("item.outOfStock")}</SelectItem>
                <SelectItem value="OverStock">{t("item.overStock")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t("item.editTitle") : t("item.newItem")}
        description={editing ? undefined : t("item.formDesc")}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        isPending={create.isPending || update.isPending}
        submitLabel={editing ? t("common.saveChanges") : t("common.create")}
        size="2xl"
      >
        {invalidNotice && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {invalidNotice}
          </div>
        )}

        {/*
          One continuous form rather than three tabs. Tabs hid required fields
          behind panels Radix unmounts, so a submit could be blocked by a rule
          the operator had no way to see. Everything is on screen now, and
          react-hook-form scrolls to the first offender by itself.
        */}
        <div className="space-y-4">
          {/*
            The group comes first because it decides the rest of the form. It
            is locked once an item exists: moving an item between groups would
            strand its group-specific answers under fields the new group does
            not define, and change what its code means.
          */}
          <FormSection title={t("item.sectionGroup")} />
          <FieldGrid columns={4}>
            {/*
              Read-only, not a dropdown: a new item takes the group chosen in the
              list above, and an existing item's group is fixed - moving it would
              strand its group-specific answers and change what its code means.
              The name is shown so the operator knows which group's fields the
              form below is asking for.
            */}
            <Field
              label={t("item.group")}
              hint={editing ? t("item.groupHintFixed") : t("item.groupHintNew")}
            >
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                {activeGroupName || "—"}
              </div>
            </Field>
          </FieldGrid>

          <FormSection title={t("item.sectionBasicDetails")} />

          <FieldGrid columns={4}>
            <Field label={t("item.itemName")} htmlFor="itemName" required error={form.formState.errors.itemName?.message}>
              <Input id="itemName" {...form.register("itemName")} />
            </Field>
            <Field label={t("item.shortName")} htmlFor="shortName" error={form.formState.errors.shortName?.message} hint={t("item.shortNameHint")}>
              <Input id="shortName" {...form.register("shortName")} />
            </Field>
            <Field
              label={t("item.technicalName")}
              htmlFor="technicalName"
              error={form.formState.errors.technicalName?.message}
              hint={t("item.technicalNameHint")}
            >
              <Input id="technicalName" {...form.register("technicalName")} />
            </Field>
            <Field label={t("item.brand")} htmlFor="brand" error={form.formState.errors.brand?.message}>
              <Input id="brand" {...form.register("brand")} />
            </Field>

            <Field label={t("item.subGroup")} htmlFor="itemSubGroupId" required error={form.formState.errors.itemSubGroupId?.message}>
                <Select
                  value={form.watch("itemSubGroupId") ? String(form.watch("itemSubGroupId")) : ""}
                  onValueChange={(value) => form.setValue("itemSubGroupId", Number(value))}
                >
                  <SelectTrigger id="itemSubGroupId">
                    <SelectValue placeholder={t("item.selectSubGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subGroupsForGroup.map((option) => (
                      <SelectItem key={option.itemSubGroupId} value={String(option.itemSubGroupId)}>
                        {option.itemSubGroupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("item.company")} htmlFor="companyId" error={form.formState.errors.companyId?.message}>
                <Select
                  value={form.watch("companyId") == null ? NONE : String(form.watch("companyId"))}
                  onValueChange={(value) =>
                    form.setValue("companyId", value === NONE ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("item.selectCompany")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("item.notSet")}</SelectItem>
                    {(options?.companies ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("item.packSize")} htmlFor="packingSize" error={form.formState.errors.packingSize?.message}>
                <NumberInput
                  id="packingSize"
                  value={form.watch("packingSize")}
                  onChange={(value) => form.setValue("packingSize", value || null)}
                  min={0}
                  step="0.001"
                />
              </Field>
              <Field label={t("item.packUnit")} htmlFor="packingUnitId" error={form.formState.errors.packingUnitId?.message}>
                <Select
                  value={form.watch("packingUnitId") == null ? NONE : String(form.watch("packingUnitId"))}
                  onValueChange={(value) =>
                    form.setValue("packingUnitId", value === NONE ? null : Number(value))
                  }
                >
                  <SelectTrigger id="packingUnitId">
                    <SelectValue placeholder={t("item.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("item.notSet")}</SelectItem>
                    {(options?.units ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("item.purchaseUnit")} htmlFor="purchaseUnitId" error={form.formState.errors.purchaseUnitId?.message}>
                <Select
                  value={form.watch("purchaseUnitId") == null ? NONE : String(form.watch("purchaseUnitId"))}
                  onValueChange={(value) =>
                    form.setValue("purchaseUnitId", value === NONE ? null : Number(value))
                  }
                >
                  <SelectTrigger id="purchaseUnitId">
                    <SelectValue placeholder={t("item.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("item.notSet")}</SelectItem>
                    {(options?.units ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.code} - {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("item.stockUnit")} htmlFor="stockUnitId" error={form.formState.errors.stockUnitId?.message}>
                <Select
                  value={form.watch("stockUnitId") == null ? NONE : String(form.watch("stockUnitId"))}
                  onValueChange={(value) =>
                    form.setValue("stockUnitId", value === NONE ? null : Number(value))
                  }
                >
                  <SelectTrigger id="stockUnitId">
                    <SelectValue placeholder={t("item.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("item.notSet")}</SelectItem>
                    {(options?.units ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.code} - {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("item.sellingUnit")} htmlFor="unitId" required error={form.formState.errors.unitId?.message}>
                <Select
                  value={form.watch("unitId") ? String(form.watch("unitId")) : ""}
                  onValueChange={(value) => form.setValue("unitId", Number(value))}
                >
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder={t("item.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.units ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.code} - {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

            </FieldGrid>

            <FormSection title={t("item.sectionPricingTax")} />

            <FieldGrid columns={4}>
              <Field label={t("item.hsnCode")} htmlFor="hsnId" error={form.formState.errors.hsnId?.message}>
                <Select
                  value={form.watch("hsnId") == null ? NONE : String(form.watch("hsnId"))}
                  onValueChange={(value) => form.setValue("hsnId", value === NONE ? null : Number(value))}
                >
                  <SelectTrigger id="hsnId">
                    <SelectValue placeholder={t("item.selectHsn")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("item.notSet")}</SelectItem>
                    {(options?.hsnCodes ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("item.gstRate")} htmlFor="gstSlabId" required error={form.formState.errors.gstSlabId?.message}>
                <Select
                  value={form.watch("gstSlabId") ? String(form.watch("gstSlabId")) : ""}
                  onValueChange={(value) => form.setValue("gstSlabId", Number(value))}
                >
                  <SelectTrigger id="gstSlabId">
                    <SelectValue placeholder={t("item.selectGstRate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.gstSlabs ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("item.mrp")} htmlFor="mrp" error={form.formState.errors.mrp?.message}>
                <NumberInput
                  id="mrp"
                  value={form.watch("mrp")}
                  onChange={(value) => form.setValue("mrp", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>

              <Field
                label={t("item.purchaseRate")}
                htmlFor="purchaseRate"
                error={form.formState.errors.purchaseRate?.message}
                hint={t("item.purchaseRateHint")}
              >
                <NumberInput
                  id="purchaseRate"
                  value={form.watch("purchaseRate")}
                  onChange={(value) => form.setValue("purchaseRate", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>
              <Field label={t("item.sellingRate")} htmlFor="sellingRate" error={form.formState.errors.sellingRate?.message}>
                <NumberInput
                  id="sellingRate"
                  value={form.watch("sellingRate")}
                  onChange={(value) => form.setValue("sellingRate", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>
              <Field
                label={t("item.minSellingRate")}
                htmlFor="minSellingRate"
                error={form.formState.errors.minSellingRate?.message}
                hint={t("item.minSellingRateHint")}
              >
                <NumberInput
                  id="minSellingRate"
                  value={form.watch("minSellingRate")}
                  onChange={(value) => form.setValue("minSellingRate", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>

              <Field label={t("item.wholesaleRate")} htmlFor="wholesaleRate" error={form.formState.errors.wholesaleRate?.message}>
                <NumberInput
                  id="wholesaleRate"
                  value={form.watch("wholesaleRate")}
                  onChange={(value) => form.setValue("wholesaleRate", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>
              <Field label={t("item.dealerRate")} htmlFor="dealerRate" error={form.formState.errors.dealerRate?.message}>
                <NumberInput
                  id="dealerRate"
                  value={form.watch("dealerRate")}
                  onChange={(value) => form.setValue("dealerRate", value)}
                  min={0}
                  step="0.0001"
                />
              </Field>
            </FieldGrid>

            {/*
              Everything below this point comes from ItemGroupFieldMaster.
              Nothing here knows that a seed has a germination percentage - it
              renders whatever the chosen group declares, in the sections and
              order the definition gives.
            */}
            <DynamicGroupFields
              definition={formDefinition.data}
              isLoading={formDefinition.isLoading}
              values={extraValues}
              errors={extraErrors}
              onChange={(fieldId, value) =>
                setExtraValues((current) => ({ ...current, [fieldId]: value }))
              }
              lookups={dynamicLookups}
            />

            <FormSection title={t("item.stock")} />

            <FieldGrid columns={4}>
              <Field label={t("item.minStock")} htmlFor="minStockLevel" error={form.formState.errors.minStockLevel?.message} hint={t("item.minStockHint")}>
                <NumberInput
                  id="minStockLevel"
                  value={form.watch("minStockLevel")}
                  onChange={(value) => form.setValue("minStockLevel", value)}
                  min={0}
                  step="0.001"
                />
              </Field>
              <Field label={t("item.maxStock")} htmlFor="maxStockLevel" error={form.formState.errors.maxStockLevel?.message}>
                <NumberInput
                  id="maxStockLevel"
                  value={form.watch("maxStockLevel")}
                  onChange={(value) => form.setValue("maxStockLevel", value)}
                  min={0}
                  step="0.001"
                />
              </Field>
              <Field label={t("item.reorderLevel")} htmlFor="reorderLevel" error={form.formState.errors.reorderLevel?.message}>
                <NumberInput
                  id="reorderLevel"
                  value={form.watch("reorderLevel")}
                  onChange={(value) => form.setValue("reorderLevel", value)}
                  min={0}
                  step="0.001"
                />
              </Field>
            </FieldGrid>

            <div className="grid gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("item.batchTracking")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("item.batchTrackingDesc")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("isBatchTracked")}
                  onCheckedChange={(checked) => {
                    form.setValue("isBatchTracked", checked);
                    // Expiry has nothing to hang on without a batch.
                    if (!checked) form.setValue("isExpiryTracked", false);
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("item.expiryTracking")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("item.expiryTrackingDesc")}
                  </p>
                  {form.formState.errors.isExpiryTracked && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.isExpiryTracked.message}
                    </p>
                  )}
                </div>
                <Switch
                  checked={form.watch("isExpiryTracked")}
                  disabled={!form.watch("isBatchTracked")}
                  onCheckedChange={(checked) => form.setValue("isExpiryTracked", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{t("item.allowNegativeStock")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("item.allowNegativeStockDesc")}
                  </p>
                </div>
                <Switch
                  checked={form.watch("allowNegativeStock")}
                  onCheckedChange={(checked) => form.setValue("allowNegativeStock", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{t("common.active")}</p>
                <Switch
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                />
              </div>
            </div>

            {editing && detail.data && detail.data.batches.length > 0 && (
              <div className="rounded-lg border">
                <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium">
                  <Package className="size-4" aria-hidden />
                  {t("item.batchesInStock")}
                </div>
                <div className="max-h-48 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <tbody>
                      {detail.data.batches
                        .filter((batch) => batch.currentQty !== 0)
                        .map((batch) => (
                          <tr key={batch.batchId} className="border-b last:border-0">
                            <td className="px-4 py-2">{batch.batchNumber}</td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {batch.expiryDate
                                ? `${t("item.expPrefix")} ${formatDate(batch.expiryDate)}`
                                : t("item.noExpiry")}
                            </td>
                            <td className="px-4 py-2 text-right tabular">
                              {formatQuantity(batch.currentQty)}
                            </td>
                            <td className="px-4 py-2 text-right tabular text-muted-foreground">
                              {formatCurrency(batch.purchaseRate)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("item.deleteTitle")}
        description={
          <>
            <strong>{deleting?.itemName}</strong> {t("item.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.itemId);
            setDeleting(null);
          } catch {
            /* reason is shown as a toast */
          }
        }}
      />
    </>
  );
}
