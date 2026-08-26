import type { GstSlabLookupDto } from "@/types/api";
import type { SaveItemRequest } from "@/features/masters/types";
import type { BulkImportError } from "./spec";

/**
 * Item bulk-import column spec + row builder. Items are group-driven: the fixed
 * columns map to ItemMaster fields, and each group's non-stored (details) fields
 * become extra columns saved to ItemMasterDetails via extraFields[fieldId]. All
 * names (Sub Group, Unit, GST %, HSN, Company) are resolved to ids here from the
 * item-form lookups, then posted as the SAME SaveItemRequest the manual form
 * uses — so bulk items land in the identical tables with the same code series.
 */

/** A resolvable lookup (sub-group / unit / hsn / company). */
export interface NamedRef {
  id: number;
  code: string;
  name: string;
}

export interface ItemImportCtx {
  itemGroupId: number;
  subGroups: NamedRef[]; // already filtered to the selected group
  units: NamedRef[];
  gstSlabs: GstSlabLookupDto[];
  hsnCodes: NamedRef[];
  companies: NamedRef[];
  dynamicFields: { itemGroupFieldId: number; fieldDisplayName: string }[];
}

export const FIXED_ITEM_COLUMNS = [
  "Item Name", "Sub Group", "Unit", "GST %", "HSN Code", "Company", "Brand",
  "Short Name", "Technical Name", "Packing Size", "Packing Unit",
  "Purchase Unit", "Stock Unit",
  "Purchase Rate", "Selling Rate", "MRP", "Wholesale Rate", "Dealer Rate", "Min Selling Rate",
  "Min Stock", "Max Stock", "Reorder Level",
  "Rate Inclusive Of Tax", "Batch Tracked", "Expiry Tracked", "Allow Negative Stock",
];

export const ITEM_REQUIRED = ["Item Name", "Sub Group", "Unit", "GST %"];

/** Fixed columns + the selected group's dynamic (details) field labels. */
export function buildItemColumns(dynamicFields: { fieldDisplayName: string }[]): string[] {
  return [...FIXED_ITEM_COLUMNS, ...dynamicFields.map((f) => f.fieldDisplayName)];
}

// ---- cell helpers -----------------------------------------------------------
function s(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}
function num(raw: Record<string, unknown>, key: string): number {
  const v = s(raw, key);
  if (v === null) return 0;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(raw: Record<string, unknown>, key: string): number | null {
  const v = s(raw, key);
  if (v === null) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function bool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = s(raw, key);
  if (v === null) return fallback;
  return ["y", "yes", "true", "1", "haan", "ha"].includes(v.toLowerCase());
}
function matchRef(list: NamedRef[], value: string): NamedRef | undefined {
  const v = value.toLowerCase();
  return list.find((x) => x.name.toLowerCase() === v || x.code.toLowerCase() === v);
}

export function buildItemRow(
  raw: Record<string, unknown>,
  ctx: ItemImportCtx,
): { dto?: SaveItemRequest; error?: string } {
  const name = s(raw, "Item Name");
  if (!name) return { error: "Item Name is required" };

  const sgName = s(raw, "Sub Group");
  if (!sgName) return { error: "Sub Group is required" };
  const sg = matchRef(ctx.subGroups, sgName);
  if (!sg) return { error: `Unknown Sub Group "${sgName}" for this group` };

  const unitName = s(raw, "Unit");
  if (!unitName) return { error: "Unit is required" };
  const unit = matchRef(ctx.units, unitName);
  if (!unit) return { error: `Unknown Unit "${unitName}"` };

  const gstRaw = s(raw, "GST %");
  if (!gstRaw) return { error: "GST % is required" };
  const gstPct = Number(gstRaw.replace("%", "").trim());
  const gst =
    ctx.gstSlabs.find((g) => g.totalRate === gstPct) ??
    ctx.gstSlabs.find((g) => g.name.toLowerCase() === gstRaw.toLowerCase());
  if (!gst) return { error: `Unknown GST % "${gstRaw}"` };

  // optional lookups — blank is fine, a wrong name is a row error.
  const opt = (col: string, list: NamedRef[]): { id: number | null; error?: string } => {
    const v = s(raw, col);
    if (v === null) return { id: null };
    const hit = matchRef(list, v);
    return hit ? { id: hit.id } : { id: null, error: `Unknown ${col} "${v}"` };
  };
  const company = opt("Company", ctx.companies);
  if (company.error) return { error: company.error };
  const hsn = opt("HSN Code", ctx.hsnCodes);
  if (hsn.error) return { error: hsn.error };
  const packingUnit = opt("Packing Unit", ctx.units);
  if (packingUnit.error) return { error: packingUnit.error };
  const purchaseUnit = opt("Purchase Unit", ctx.units);
  if (purchaseUnit.error) return { error: purchaseUnit.error };
  const stockUnit = opt("Stock Unit", ctx.units);
  if (stockUnit.error) return { error: stockUnit.error };

  const extraFields: Record<number, string | null> = {};
  for (const f of ctx.dynamicFields) extraFields[f.itemGroupFieldId] = s(raw, f.fieldDisplayName);

  return {
    dto: {
      itemGroupId: ctx.itemGroupId,
      itemSubGroupId: sg.id,
      extraFields,
      itemCode: null,
      itemName: name,
      shortName: s(raw, "Short Name"),
      technicalName: s(raw, "Technical Name"),
      companyId: company.id,
      brand: s(raw, "Brand"),
      packingSize: numOrNull(raw, "Packing Size"),
      packingUnitId: packingUnit.id,
      unitId: unit.id,
      purchaseUnitId: purchaseUnit.id,
      stockUnitId: stockUnit.id,
      hsnId: hsn.id,
      gstSlabId: gst.id,
      isRateInclusiveOfTax: bool(raw, "Rate Inclusive Of Tax", false),
      purchaseRate: num(raw, "Purchase Rate"),
      sellingRate: num(raw, "Selling Rate"),
      mrp: num(raw, "MRP"),
      wholesaleRate: num(raw, "Wholesale Rate"),
      dealerRate: num(raw, "Dealer Rate"),
      minSellingRate: num(raw, "Min Selling Rate"),
      minStockLevel: num(raw, "Min Stock"),
      maxStockLevel: num(raw, "Max Stock"),
      reorderLevel: num(raw, "Reorder Level"),
      isBatchTracked: bool(raw, "Batch Tracked", true),
      isExpiryTracked: bool(raw, "Expiry Tracked", true),
      allowNegativeStock: bool(raw, "Allow Negative Stock", false),
      defaultLocationId: null,
      isActive: true,
    },
  };
}

/** Parsed rows -> item DTOs + client-side (mapping) errors. Mirrors buildRows in spec.ts. */
export function buildItemRows(
  rawRows: Record<string, unknown>[],
  ctx: ItemImportCtx,
): { dtos: SaveItemRequest[]; sentRows: number[]; clientErrors: BulkImportError[] } {
  const dtos: SaveItemRequest[] = [];
  const sentRows: number[] = [];
  const clientErrors: BulkImportError[] = [];
  rawRows.forEach((raw, i) => {
    const excelRow = i + 2; // header is Excel row 1
    const { dto, error } = buildItemRow(raw, ctx);
    if (dto) {
      dtos.push(dto);
      sentRows.push(excelRow);
    } else {
      clientErrors.push({ row: excelRow, message: error ?? "Invalid row" });
    }
  });
  return { dtos, sentRows, clientErrors };
}
