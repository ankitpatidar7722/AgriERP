"use client";

import { useEffect, useMemo, useState } from "react";
import { DataGrid, useDevice } from "indas-ui";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { itemHooks } from "@/features/masters/hooks";
import type { ItemListDto } from "@/features/masters/types";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/** One fetch covers a shop's catalogue; the API caps a page here anyway. */
const PAGE_SIZE = 200;

interface ItemMasterPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item ids already on the bill - kept out of the picker so they aren't re-added. */
  addedIds?: number[];
  /** Fired with the chosen rows when the operator clicks Add. */
  onConfirm: (items: ItemListDto[]) => void;
}

/**
 * The "Select from item master" dialog behind a sales screen's Add item button.
 *
 * It renders the same indas-ui DataGrid the rest of the app uses - so it comes
 * with per-column search, sort and the shop's grey theme for free - with row
 * checkboxes turned on. Every item across all groups is listed (group, sub
 * group, name, selling rate and live stock); the operator ticks as many as they
 * like and Add drops them onto the bill in one go, carrying enough of each row
 * (rates, unit, gst) to build a line without a second lookup.
 */
export function ItemMasterPicker({
  open,
  onOpenChange,
  addedIds = [],
  onConfirm,
}: ItemMasterPickerProps) {
  const t = useT();
  const { isMobile } = useDevice();
  const [selected, setSelected] = useState<ItemListDto[]>([]);
  const [query, setQuery] = useState("");
  const list = itemHooks.useList({ page: 1, pageSize: PAGE_SIZE });

  // A fresh open starts with nothing ticked and no search.
  useEffect(() => {
    if (open) {
      setSelected([]);
      setQuery("");
    }
  }, [open]);

  const addedSet = useMemo(() => new Set(addedIds), [addedIds]);
  const rows = useMemo(
    () => (list.data?.items ?? []).filter((row) => !addedSet.has(row.itemId)),
    [list.data, addedSet],
  );

  // Mobile: a plain tap-to-select list instead of the wide grid. Filter by name,
  // code, group or sub-group; toggle a row in/out of the selection on tap.
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.itemId)), [selected]);
  const mobileRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.itemName} ${r.itemCode} ${r.itemGroupName} ${r.itemSubGroupName}`.toLowerCase().includes(term),
    );
  }, [rows, query]);
  const toggle = (row: ItemListDto) =>
    setSelected((cur) =>
      cur.some((s) => s.itemId === row.itemId) ? cur.filter((s) => s.itemId !== row.itemId) : [...cur, row],
    );

  const columns = useMemo<ColumnDef<ItemListDto>[]>(
    () => [
      {
        id: "group",
        header: t("picker.itemGroup"),
        accessorFn: (row) => row.itemGroupName,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.itemGroupName}</span>,
      },
      {
        id: "subgroup",
        header: t("picker.subGroup"),
        accessorFn: (row) => row.itemSubGroupName,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.itemSubGroupName}</span>
        ),
      },
      {
        id: "name",
        header: t("picker.itemName"),
        accessorFn: (row) => `${row.itemName} ${row.itemCode}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.itemName}</div>
            <div className="text-xs text-muted-foreground">{row.original.itemCode}</div>
          </div>
        ),
      },
      {
        id: "rate",
        header: t("picker.sellingRate"),
        accessorFn: (row) => row.sellingRate,
        cell: ({ row }) => (
          <span className="tabular">{formatCurrency(row.original.sellingRate)}</span>
        ),
        meta: { align: "right" },
      },
      {
        id: "stock",
        header: t("picker.currentStock"),
        accessorFn: (row) => row.currentStock,
        cell: ({ row }) => (
          <span className={cn("tabular", row.original.currentStock <= 0 && "text-destructive")}>
            {formatQuantity(row.original.currentStock)} {row.original.unitCode}
          </span>
        ),
        meta: { align: "right" },
      },
    ],
    [t],
  );

  function confirm() {
    if (selected.length === 0) return;
    onConfirm(selected);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[94vw] max-w-[1200px] flex-col gap-4 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{t("picker.title")}</DialogTitle>
        </DialogHeader>

        {isMobile ? (
          /* Phone: a dead-simple search + tap-to-select list. */
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("picker.searchPlaceholder", "Search item, code or group")}
                className="pl-8"
                inputMode="search"
                autoFocus
              />
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {list.isLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">…</div>
              ) : mobileRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{t("picker.noItems", "No items found")}</div>
              ) : (
                <ul className="space-y-1.5 pb-1">
                  {mobileRows.map((row) => {
                    const on = selectedIds.has(row.itemId);
                    return (
                      <li key={row.itemId}>
                        <button
                          type="button"
                          onClick={() => toggle(row)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                            on ? "border-primary bg-primary/5" : "bg-card active:bg-accent/50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-md border",
                              on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                            )}
                          >
                            {on && <Check className="size-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{row.itemName}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[row.itemGroupName, row.itemSubGroupName, row.itemCode].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-xs leading-tight">
                            <span className="block tabular font-medium">{formatCurrency(row.sellingRate)}</span>
                            <span className={cn("block tabular", row.currentStock <= 0 && "text-destructive")}>
                              {formatQuantity(row.currentStock)} {row.unitCode}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden px-5">
            <DataGrid<ItemListDto>
              data={rows}
              columns={columns}
              getRowId={(row) => String(row.itemId)}
              onRowSelect={(items: ItemListDto[]) => setSelected(items)}
              loading={list.isLoading}
              enableRowSelection
              rowSelectionMode="multi"
              enableSearch
              enableSorting
              enableFiltering
              enableFilterRow
              enableColumnVisibility={false}
              enableExport={false}
              pageSize={25}
              stickyHeader
              maxHeight="60vh"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t px-5 py-4">
          <span className="text-sm text-muted-foreground">
            {selected.length} {selected.length === 1 ? t("picker.item") : t("picker.items")}{" "}
            {t("picker.selected")}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirm} disabled={selected.length === 0}>
              {t("common.add")} {selected.length > 0 ? selected.length : ""}{" "}
              {selected.length === 1 ? t("picker.item") : t("picker.items")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
