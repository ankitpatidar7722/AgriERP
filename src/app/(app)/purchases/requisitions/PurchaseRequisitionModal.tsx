"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormDialog } from "@/components/common/form-dialog";
import {
  useCreatePurchaseRequisition,
  useNextRequisitionNumber,
  useUpdatePurchaseRequisition,
} from "@/features/transactions/hooks";
import { round2 } from "@/features/transactions/billing-math";
import type { ItemListDto } from "@/features/masters/types";
import type { PurchaseRequisitionDto } from "@/features/transactions/types";
import { ItemMasterPicker } from "@/features/transactions/item-master-picker";
import { formatCurrency, toIsoDate } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/** One item + how much of it the shop needs to buy. No supplier - that is the PO. */
export interface RequisitionSeed {
  itemId: number;
  itemName: string;
  unitId: number | null;
  unitCode: string;
  requiredQty: number;
  estimatedRate: number;
}

interface ReqLine extends RequisitionSeed {
  key: string;
  expectedDate: string;
  remarks: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled lines, e.g. from the Low Stock tab. Ignored when editing. */
  seed?: RequisitionSeed[];
  /** When set, the modal edits this requisition instead of creating a new one. */
  editModel?: PurchaseRequisitionDto | null;
}

export function PurchaseRequisitionModal({ open, onOpenChange, seed, editModel }: Props) {
  const t = useT();
  const router = useRouter();
  const create = useCreatePurchaseRequisition();
  const update = useUpdatePurchaseRequisition();

  const isEdit = !!editModel;
  // Preview the number a new requisition will get (only while creating).
  const nextNumber = useNextRequisitionNumber(open && !isEdit);

  const [requisitionDate, setRequisitionDate] = useState(toIsoDate(new Date()));
  const [lines, setLines] = useState<ReqLine[]>([]);
  const [remark, setRemark] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset / seed / load each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    if (editModel) {
      setRequisitionDate(editModel.requisitionDate.slice(0, 10));
      setRemark(editModel.remarks ?? "");
      setLines(
        editModel.lines.map((l) => ({
          key: `edit-${l.requisitionDetailId}`,
          itemId: l.itemId,
          itemName: l.itemName,
          unitId: l.unitId,
          unitCode: l.unitCode,
          requiredQty: l.requiredQty,
          estimatedRate: l.estimatedRate,
          expectedDate: l.expectedDate ? l.expectedDate.slice(0, 10) : "",
          remarks: l.remarks ?? "",
        })),
      );
      return;
    }
    setRequisitionDate(toIsoDate(new Date()));
    setRemark("");
    setLines(
      (seed ?? []).map((s) => ({
        ...s,
        key: `seed-${s.itemId}`,
        expectedDate: "",
        remarks: "",
      })),
    );
    // seed/editModel are captured on open; re-applying mid-edit would wipe work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalQty = useMemo(() => round2(lines.reduce((s, l) => s + l.requiredQty, 0)), [lines]);

  function addFromPicker(picked: ItemListDto[]) {
    setLines((current) => {
      const existing = new Set(current.map((l) => l.itemId));
      const additions = picked
        .filter((row) => !existing.has(row.itemId))
        .map((row) => ({
          key: `${row.itemId}-${Date.now()}`,
          itemId: row.itemId,
          itemName: row.itemName,
          unitId: row.unitId,
          unitCode: row.unitCode,
          requiredQty: 1,
          estimatedRate: row.purchaseRate > 0 ? row.purchaseRate : 0,
          expectedDate: "",
          remarks: "",
        }));
      return [...current, ...additions];
    });
  }

  function updateLine(key: string, patch: Partial<ReqLine>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((l) => l.key !== key));
  }

  async function save() {
    if (lines.length === 0) {
      toast.error(t("reqm.toastNeedItem"));
      return;
    }
    if (lines.some((l) => l.requiredQty <= 0)) {
      toast.error(t("reqm.toastNeedQty"));
      return;
    }
    const body = {
      requisitionDate,
      remarks: remark || null,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        requiredQty: l.requiredQty,
        unitId: l.unitId,
        expectedDate: l.expectedDate || null,
        estimatedRate: l.estimatedRate,
        remarks: l.remarks || null,
      })),
    };
    try {
      if (editModel) {
        const req = await update.mutateAsync({ id: editModel.requisitionId, body });
        toast.success(`${t("reqm.reqWord")} ${req.requisitionNumber} ${t("pur.updatedWord")}.`);
        onOpenChange(false);
        router.push(`/purchases/requisitions/${req.requisitionId}`);
        return;
      }
      const req = await create.mutateAsync(body);
      toast.success(`${t("reqm.reqWord")} ${req.requisitionNumber} ${t("pur.createdWord")}.`);
      onOpenChange(false);
      router.push(`/purchases/requisitions/${req.requisitionId}`);
    } catch {
      /* the hook surfaces the reason */
    }
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? `${t("reqm.editTitle")} ${editModel!.requisitionNumber}` : t("reqm.newTitle")}
        description={t("reqm.desc")}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        isPending={create.isPending || update.isPending}
        submitLabel={isEdit ? t("common.saveChanges") : t("req.createRequisition")}
        size="full"
      >
        {/* --------------------------- header strip --------------------------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("reqm.reqNo")} hint={isEdit ? undefined : t("reqm.assignedOnSave")}>
            <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium text-foreground">
              {isEdit
                ? editModel!.requisitionNumber
                : nextNumber.data?.number ?? (nextNumber.isLoading ? "…" : t("reqm.autoOnSave"))}
            </div>
          </Field>
          <Field label={t("reqm.reqDate")} htmlFor="requisitionDate">
            <Input
              id="requisitionDate"
              type="date"
              value={requisitionDate}
              onChange={(e) => setRequisitionDate(e.target.value)}
            />
          </Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <Button type="button" variant="neutral" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t("pur.addItem")}
            </Button>
          </div>
        </div>

        {/* ----------------------------- lines grid ---------------------------- */}
        {lines.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {t("reqm.emptyHint")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2 text-right font-medium">#</th>
                  <th className="min-w-[240px] px-3 py-2 text-left font-medium">{t("pur.item")}</th>
                  <th className="w-32 px-2 py-2 text-right font-medium">{t("reqm.requiredQty")}</th>
                  <th className="w-20 px-2 py-2 text-left font-medium">{t("req.unit")}</th>
                  <th className="w-32 px-2 py-2 text-right font-medium">{t("req.estRate")}</th>
                  <th className="w-40 px-2 py-2 text-left font-medium">{t("reqm.expectedDate")}</th>
                  <th className="min-w-[160px] px-2 py-2 text-left font-medium">{t("pur.remark")}</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">{t("reqm.estAmount")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.key} className="border-t align-top">
                    <td className="px-2 py-2 text-right tabular text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="min-w-[220px] truncate font-medium">{line.itemName}</div>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        value={line.requiredQty}
                        onChange={(e) => updateLine(line.key, { requiredQty: Number(e.target.value) })}
                        className="h-8 text-right tabular"
                        aria-label={`Required quantity for ${line.itemName}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{line.unitCode}</td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.estimatedRate}
                        onChange={(e) => updateLine(line.key, { estimatedRate: Number(e.target.value) })}
                        className="h-8 text-right tabular"
                        aria-label={`Estimated rate for ${line.itemName}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="date"
                        value={line.expectedDate}
                        onChange={(e) => updateLine(line.key, { expectedDate: e.target.value })}
                        className="h-8"
                        aria-label={`Expected date for ${line.itemName}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        value={line.remarks}
                        onChange={(e) => updateLine(line.key, { remarks: e.target.value })}
                        className="h-8"
                        placeholder={t("common.optional")}
                        aria-label={`Remark for ${line.itemName}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular font-medium">
                      {formatCurrency(round2(line.requiredQty * line.estimatedRate))}
                    </td>
                    <td className="px-1 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.itemName}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --------------------------- summary strip --------------------------- */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Field label={t("pur.remark")} htmlFor="remark">
            <Textarea
              id="remark"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={t("reqm.notePlaceholder")}
            />
          </Field>
          <div className="space-y-2 self-end text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("pur.totalItems")}</span>
              <span className="tabular">{lines.length}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>{t("pur.totalQuantity")}</span>
              <span className="tabular">{totalQty}</span>
            </div>
          </div>
        </div>
      </FormDialog>

      <ItemMasterPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        addedIds={lines.map((l) => l.itemId)}
        onConfirm={addFromPicker}
      />
    </>
  );
}
