"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Pencil, Save, Trash2, X } from "lucide-react";
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
import { shopHooks, useStates } from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { SaveShopRequest, ShopListDto } from "@/features/masters/types";
import type { QueryParameters } from "@/types/api";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const NONE = "none";

const schema = z.object({
  shopName: z.string().min(1, "Shop name is required.").max(150),
  ownerName: z.string().max(120),
  mobileNo: z.string().max(15),
  gstNo: z.string().max(15),
  city: z.string().max(80),
  stateId: z.number().nullable(),
  email: z.string().max(150),
  address: z.string().max(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  shopName: "",
  ownerName: "",
  mobileNo: "",
  gstNo: "",
  city: "",
  stateId: null,
  email: "",
  address: "",
  isActive: true,
};

export function ShopMasterTab() {
  const { can } = useAuth();
  const t = useT();
  const canEdit = can(Permissions.Settings.Edit);

  const [query, setQuery] = useState<QueryParameters>({ page: 1, pageSize: 25 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ShopListDto | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const list = shopHooks.useList(query);
  const editDetail = shopHooks.useOne(editingId);
  const viewDetail = shopHooks.useOne(viewingId);
  const states = useStates();
  const create = shopHooks.useCreate();
  const update = shopHooks.useUpdate();
  const remove = shopHooks.useRemove();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Load the full record into the form once an edit target's detail arrives.
  useEffect(() => {
    const d = editDetail.data;
    if (editingId && d && d.shopId === editingId) {
      form.reset({
        shopName: d.shopName,
        ownerName: d.ownerName ?? "",
        mobileNo: d.mobileNo ?? "",
        gstNo: d.gstNo ?? "",
        city: d.city ?? "",
        stateId: d.stateId ?? null,
        email: d.email ?? "",
        address: d.address ?? "",
        isActive: d.isActive,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDetail.data, editingId]);

  function clear() {
    setEditingId(null);
    form.reset(EMPTY);
  }

  function openEdit(row: ShopListDto) {
    setEditingId(row.shopId);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmit(values: FormValues) {
    const body: SaveShopRequest = {
      shopName: values.shopName.trim(),
      ownerName: values.ownerName || null,
      mobileNo: values.mobileNo || null,
      gstNo: values.gstNo || null,
      city: values.city || null,
      stateId: values.stateId,
      email: values.email || null,
      address: values.address || null,
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
  const stateId = form.watch("stateId");

  const columns: DataColumn<ShopListDto>[] = [
    {
      key: "name",
      header: t("shop.shopName"),
      sortable: true,
      cell: (row) => <span className="font-medium">{row.shopName}</span>,
      exportValue: (row) => row.shopName,
    },
    {
      key: "owner",
      header: t("shop.owner"),
      hideBelow: "sm",
      cell: (row) => row.ownerName ?? "-",
      exportValue: (row) => row.ownerName ?? "",
    },
    {
      key: "mobile",
      header: t("common.mobile"),
      hideBelow: "md",
      cell: (row) => row.mobileNo ?? "-",
      exportValue: (row) => row.mobileNo ?? "",
    },
    {
      key: "city",
      header: t("cust.city"),
      hideBelow: "md",
      cell: (row) => row.city ?? "-",
      exportValue: (row) => row.city ?? "",
    },
    {
      key: "state",
      header: t("cust.state"),
      hideBelow: "lg",
      cell: (row) => <span className="text-muted-foreground">{row.stateName ?? "-"}</span>,
      exportValue: (row) => row.stateName ?? "",
    },
    {
      key: "gst",
      header: t("shop.gstNo"),
      hideBelow: "lg",
      cell: (row) => row.gstNo ?? "-",
      exportValue: (row) => row.gstNo ?? "",
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
            onClick={() => setViewingId(row.shopId)}
            aria-label={`View ${row.shopName}`}
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
              aria-label={`Edit ${row.shopName}`}
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
              aria-label={`Delete ${row.shopName}`}
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
                {editingId ? t("shop.editTitle") : t("shop.createTitle")}
              </h3>
              {editingId && (
                <Button variant="ghost" size="icon" className="size-7" onClick={clear} title={t("shop.cancelEdit")}>
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGrid columns={4}>
                <Field label={t("shop.shopName")} htmlFor="shopName" required error={form.formState.errors.shopName?.message}>
                  <Input id="shopName" placeholder={t("shop.shopNamePlaceholder")} {...form.register("shopName")} />
                </Field>
                <Field label={t("shop.ownerName")} htmlFor="ownerName" error={form.formState.errors.ownerName?.message}>
                  <Input id="ownerName" placeholder={t("shop.ownerNamePlaceholder")} {...form.register("ownerName")} />
                </Field>
                <Field label={t("shop.mobileNoLabel")} htmlFor="mobileNo" error={form.formState.errors.mobileNo?.message}>
                  <Input id="mobileNo" inputMode="numeric" maxLength={15} placeholder={t("shop.mobilePlaceholder")} {...form.register("mobileNo")} />
                </Field>
                <Field label={t("shop.gstNo")} htmlFor="gstNo" error={form.formState.errors.gstNo?.message}>
                  <Input id="gstNo" className="uppercase" maxLength={15} placeholder={t("shop.gstPlaceholder")} {...form.register("gstNo")} />
                </Field>
                <Field label={t("cust.city")} htmlFor="city" error={form.formState.errors.city?.message}>
                  <Input id="city" placeholder={t("cust.city")} {...form.register("city")} />
                </Field>
                <Field label={t("cust.state")}>
                  <Select
                    value={stateId != null ? String(stateId) : NONE}
                    onValueChange={(v) => form.setValue("stateId", v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger aria-label="State">
                      <SelectValue placeholder={t("cust.selectState")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("cust.notSet")}</SelectItem>
                      {(states.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("shop.emailAddress")} htmlFor="email" error={form.formState.errors.email?.message}>
                  <Input id="email" type="email" placeholder="shop@example.com" {...form.register("email")} />
                </Field>
              </FieldGrid>

              <Field label={t("cust.address")} htmlFor="address" error={form.formState.errors.address?.message}>
                <Textarea id="address" rows={2} placeholder={t("shop.addressPlaceholder")} {...form.register("address")} />
              </Field>

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
        getRowId={(row) => row.shopId}
        searchPlaceholder={t("shop.search")}
        emptyMessage={t("shop.empty")}
        exportFileName="shops"
        exportTitle="Shop master"
      />

      {/* ------------------------------ view modal ----------------------------- */}
      <Dialog open={viewingId != null} onOpenChange={(open) => !open && setViewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{view?.shopName ?? t("shop.shopWord")}</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <ViewRow label={t("shop.owner")} value={view?.ownerName} />
            <ViewRow label={t("common.mobile")} value={view?.mobileNo} />
            <ViewRow label={t("shop.gstNo")} value={view?.gstNo} />
            <ViewRow label={t("cust.city")} value={view?.city} />
            <ViewRow label={t("cust.state")} value={view?.stateName} />
            <ViewRow label={t("shop.email")} value={view?.email} />
            <ViewRow label={t("cust.address")} value={view?.address} full />
            <ViewRow label={t("common.status")} value={view?.isActive ? t("common.active") : t("common.inactive")} />
          </dl>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- delete confirm -------------------------- */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("shop.deleteTitle")}
        description={
          <>
            <strong>{deleting?.shopName}</strong> {t("shop.deleteDesc")}
          </>
        }
        confirmLabel={t("common.delete")}
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.shopId);
            if (editingId === deleting.shopId) clear();
            setDeleting(null);
          } catch {
            /* toast shows the reason */
          }
        }}
      />
    </div>
  );
}

function ViewRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "-"}</dd>
    </div>
  );
}
