"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGrid } from "@/components/common/form-dialog";
import { ActiveBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { useNextWarehouseCode, warehouseHooks } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { SaveWarehouseRequest, WarehouseListDto } from "@/features/masters/types";
import type { QueryParameters } from "@/types/api";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const schema = z.object({
  warehouseName: z.string().min(1, "Warehouse name is required.").max(150),
  address: z.string().max(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { warehouseName: "", address: "", isActive: true };

export function WarehouseMasterTab() {
  const { can } = useAuth();
  const t = useT();
  const canEdit = can(Permissions.Settings.Edit);

  const [query, setQuery] = useState<QueryParameters>({ page: 1, pageSize: 25 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<WarehouseListDto | null>(null);
  const [bins, setBins] = useState<string[]>([]);
  const [binInput, setBinInput] = useState("");
  const formTopRef = useRef<HTMLDivElement>(null);

  const list = warehouseHooks.useList(query);
  const editDetail = warehouseHooks.useOne(editingId);
  const viewDetail = warehouseHooks.useOne(viewingId);
  const nextCode = useNextWarehouseCode(canEdit && editingId == null);
  const create = warehouseHooks.useCreate();
  const update = warehouseHooks.useUpdate();
  const remove = warehouseHooks.useRemove();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Load the full record (fields + bins) into the form once it arrives.
  useEffect(() => {
    const d = editDetail.data;
    if (editingId && d && d.warehouseId === editingId) {
      form.reset({ warehouseName: d.warehouseName, address: d.address ?? "", isActive: d.isActive });
      setBins(d.bins ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDetail.data, editingId]);

  function clear() {
    setEditingId(null);
    setBins([]);
    setBinInput("");
    form.reset(EMPTY);
  }

  function openEdit(row: WarehouseListDto) {
    setEditingId(row.warehouseId);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addBin() {
    const name = binInput.trim();
    if (!name) return;
    if (bins.some((b) => b.toLowerCase() === name.toLowerCase())) {
      toast.error(t("wh.binDuplicate", 'Bin "{name}" is already added.').replace("{name}", name));
      return;
    }
    setBins((current) => [...current, name]);
    setBinInput("");
  }

  function removeBin(name: string) {
    setBins((current) => current.filter((b) => b !== name));
  }

  async function onSubmit(values: FormValues) {
    const body: SaveWarehouseRequest = {
      warehouseName: values.warehouseName.trim(),
      address: values.address || null,
      bins,
      isActive: values.isActive,
    };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, body });
      else await create.mutateAsync(body);
      clear();
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const view = viewDetail.data;
  const codeField = editingId
    ? editDetail.data?.warehouseCode ?? "..."
    : nextCode.data?.code ?? (nextCode.isLoading ? "..." : t("wh.autoOnSave"));

  const columns: DataColumn<WarehouseListDto>[] = [
    {
      key: "code",
      header: t("wh.warehouseCode"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.warehouseCode}</span>,
      exportValue: (row) => row.warehouseCode,
    },
    {
      key: "name",
      header: t("wh.warehouseName"),
      sortable: true,
      cell: (row) => row.warehouseName,
      exportValue: (row) => row.warehouseName,
    },
    {
      key: "address",
      header: t("cust.address"),
      hideBelow: "md",
      cell: (row) => <span className="max-w-[280px] truncate">{row.address ?? "-"}</span>,
      exportValue: (row) => row.address ?? "",
    },
    {
      key: "bins",
      header: t("wh.bins"),
      align: "center",
      hideBelow: "sm",
      cell: (row) => <span className="tabular">{row.binCount}</span>,
      exportValue: (row) => row.binCount,
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
      header: t("common.actions"),
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setViewingId(row.warehouseId)}
            aria-label={`View ${row.warehouseName}`}
            title={t("common.view")}
          >
            <Eye className="size-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => openEdit(row)}
              aria-label={`Edit ${row.warehouseName}`}
              title={t("common.edit")}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${row.warehouseName}`}
              title={t("common.delete")}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4" ref={formTopRef}>
      {/* ------------------------------ form card ------------------------------ */}
      {canEdit && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingId ? t("wh.editTitle") : t("wh.createTitle")}
              </h3>
              {editingId && (
                <Button variant="ghost" size="icon" className="size-7" onClick={clear} title={t("wh.cancelEdit")}>
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGrid columns={4}>
                <Field label={t("wh.warehouseCode")} hint={editingId ? undefined : t("wh.autoGenerated")}>
                  <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium text-muted-foreground">
                    {codeField}
                  </div>
                </Field>
                <Field label={t("wh.warehouseName")} htmlFor="warehouseName" required error={form.formState.errors.warehouseName?.message}>
                  <Input id="warehouseName" placeholder={t("wh.warehouseNamePlaceholder")} {...form.register("warehouseName")} />
                </Field>
                <Field label={t("cust.address")} htmlFor="whAddress" className="sm:col-span-2" error={form.formState.errors.address?.message}>
                  <Input id="whAddress" placeholder={t("wh.addressPlaceholder")} {...form.register("address")} />
                </Field>
              </FieldGrid>

              {/* ----- bins ----- */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("wh.bins")}</label>
                <div className="flex gap-2">
                  <Input
                    value={binInput}
                    onChange={(e) => setBinInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBin();
                      }
                    }}
                    placeholder={t("wh.binPlaceholder")}
                    className="max-w-xs"
                    aria-label="Bin name"
                  />
                  <Button type="button" variant="neutral" onClick={addBin}>
                    <Plus className="mr-1.5 size-4" />
                    {t("common.add")}
                  </Button>
                </div>
                {bins.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {bins.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                      >
                        {b}
                        <button
                          type="button"
                          onClick={() => removeBin(b)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove bin ${b}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={clear}>
                  <X className="mr-1.5 size-4" />
                  {t("common.clear")}
                </Button>
                <Button type="submit" variant="success" disabled={create.isPending || update.isPending}>
                  <Save className="mr-1.5 size-4" />
                  {editingId ? t("common.update") : t("common.save")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------- grid --------------------------------- */}
      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={setQuery}
        getRowId={(row) => row.warehouseId}
        searchPlaceholder={t("wh.search")}
        emptyMessage={t("wh.empty")}
        exportFileName="warehouses"
        exportTitle="Warehouse master"
      />

      {/* ------------------------------ view modal ----------------------------- */}
      <Dialog open={viewingId != null} onOpenChange={(open) => !open && setViewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {view?.warehouseCode ? `${view.warehouseCode} · ` : ""}
              {view?.warehouseName ?? t("wh.warehouseWord")}
            </DialogTitle>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("cust.address")}</dt>
              <dd className="mt-0.5">{view?.address || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("wh.bins")}</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {view && view.bins.length > 0 ? (
                  view.bins.map((b) => (
                    <span key={b} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                      {b}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">{t("wh.noBins")}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("common.status")}</dt>
              <dd className="mt-0.5">{view?.isActive ? t("common.active") : t("common.inactive")}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- delete confirm -------------------------- */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("wh.deleteTitle")}
        description={
          <>
            <strong>{deleting?.warehouseCode}</strong> ({deleting?.warehouseName}) {t("wh.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.warehouseId);
            if (editingId === deleting.warehouseId) clear();
            setDeleting(null);
          } catch {
            /* toast shows the reason */
          }
        }}
      />
    </div>
  );
}
