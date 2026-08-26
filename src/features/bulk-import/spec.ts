import type { LookupDto } from "@/types/api";
import type {
  BalanceType,
  CustomerType,
  SaveCustomerRequest,
  SaveSupplierRequest,
} from "@/features/masters/types";

/**
 * Bulk-import column specs. Each master defines the Excel headers and a builder
 * that turns one parsed row (keyed by header text) into the SAME create-DTO the
 * manual form posts — so bulk rows land in the identical table with the same
 * code-series and validation. Names (State, later Sub-group/Unit/GST) are
 * resolved to ids here on the client from the app's lookups.
 */

export type MasterKey = "customer" | "supplier" | "item";

export interface BulkImportError {
  row: number;
  message: string;
}
export interface BulkImportResult {
  imported: number;
  failed: number;
  errors: BulkImportError[];
}

// ---- cell parse helpers (raw row is keyed by the header text) ---------------
function s(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}
function num(raw: Record<string, unknown>, key: string): number {
  const v = raw[key];
  if (v === undefined || v === null || String(v).trim() === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
function resolveState(name: string | null, states: LookupDto[]): { id: number | null; error?: string } {
  if (!name) return { id: null };
  const hit = states.find((st) => st.name.toLowerCase() === name.toLowerCase());
  return hit ? { id: hit.id } : { id: null, error: `Unknown state: "${name}"` };
}
function pickEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): { value: T; error?: string } {
  if (!value) return { value: fallback };
  const hit = allowed.find((a) => a.toLowerCase() === value.toLowerCase());
  return hit ? { value: hit } : { value: fallback, error: `Invalid "${value}" (allowed: ${allowed.join(", ")})` };
}

// ---- the generic spec shape -------------------------------------------------
export interface MasterSpec<T> {
  key: MasterKey;
  label: string;
  /** Excel header row + the order rows are read in. */
  columns: string[];
  /** Which columns are mandatory (shown with * in the UI). */
  required: string[];
  endpoint: string;
  build: (raw: Record<string, unknown>, states: LookupDto[]) => { dto?: T; error?: string };
}

// ---- Customer ---------------------------------------------------------------
const CUSTOMER_COLUMNS = [
  "Customer Name", "Father Name", "Village", "Mobile", "Alternate Mobile",
  "GST Number", "Address", "City", "State", "Pincode",
  "Customer Type", "Credit Limit", "Credit Days",
  "Opening Balance", "Opening Balance Type", "Remarks",
];

export const CUSTOMER_SPEC: MasterSpec<SaveCustomerRequest> = {
  key: "customer",
  label: "Customer",
  columns: CUSTOMER_COLUMNS,
  required: ["Customer Name"],
  endpoint: "/customers/bulk-import",
  build(raw, states) {
    const name = s(raw, "Customer Name");
    if (!name) return { error: "Customer Name is required" };
    const st = resolveState(s(raw, "State"), states);
    if (st.error) return { error: st.error };
    const type = pickEnum<CustomerType>(s(raw, "Customer Type"), ["Retail", "Wholesale", "Dealer"], "Retail");
    if (type.error) return { error: type.error };
    const bal = pickEnum<BalanceType>(s(raw, "Opening Balance Type"), ["DR", "CR"], "DR");
    if (bal.error) return { error: bal.error };
    return {
      dto: {
        customerCode: null,
        customerName: name,
        fatherName: s(raw, "Father Name"),
        village: s(raw, "Village"),
        mobile: s(raw, "Mobile"),
        alternateMobile: s(raw, "Alternate Mobile"),
        gstNumber: s(raw, "GST Number"),
        address: s(raw, "Address"),
        city: s(raw, "City"),
        stateId: st.id,
        pincode: s(raw, "Pincode"),
        customerType: type.value,
        creditLimit: num(raw, "Credit Limit"),
        creditDays: num(raw, "Credit Days"),
        openingBalance: num(raw, "Opening Balance"),
        openingBalanceType: bal.value,
        remarks: s(raw, "Remarks"),
        isActive: true,
      },
    };
  },
};

// ---- Supplier ---------------------------------------------------------------
const SUPPLIER_COLUMNS = [
  "Supplier Name", "GST Number", "PAN Number", "Address", "City", "State", "Pincode",
  "Phone", "Alternate Phone", "Email", "Contact Person",
  "Payment Term Days", "Credit Limit",
  "Opening Balance", "Opening Balance Type",
  "Bank Name", "Bank Account Number", "Bank IFSC", "Remarks",
];

export const SUPPLIER_SPEC: MasterSpec<SaveSupplierRequest> = {
  key: "supplier",
  label: "Supplier",
  columns: SUPPLIER_COLUMNS,
  required: ["Supplier Name"],
  endpoint: "/suppliers/bulk-import",
  build(raw, states) {
    const name = s(raw, "Supplier Name");
    if (!name) return { error: "Supplier Name is required" };
    const st = resolveState(s(raw, "State"), states);
    if (st.error) return { error: st.error };
    const bal = pickEnum<BalanceType>(s(raw, "Opening Balance Type"), ["DR", "CR"], "CR");
    if (bal.error) return { error: bal.error };
    return {
      dto: {
        supplierCode: null,
        supplierName: name,
        gstNumber: s(raw, "GST Number"),
        panNumber: s(raw, "PAN Number"),
        address: s(raw, "Address"),
        city: s(raw, "City"),
        stateId: st.id,
        pincode: s(raw, "Pincode"),
        phone: s(raw, "Phone"),
        alternatePhone: s(raw, "Alternate Phone"),
        email: s(raw, "Email"),
        contactPerson: s(raw, "Contact Person"),
        paymentTermDays: num(raw, "Payment Term Days"),
        creditLimit: num(raw, "Credit Limit"),
        openingBalance: num(raw, "Opening Balance"),
        openingBalanceType: bal.value,
        bankName: s(raw, "Bank Name"),
        bankAccountNumber: s(raw, "Bank Account Number"),
        bankIfsc: s(raw, "Bank IFSC"),
        remarks: s(raw, "Remarks"),
        isActive: true,
      },
    };
  },
};

// ---- driver: parsed rows -> DTOs + client-side errors -----------------------
export function buildRows<T>(
  spec: MasterSpec<T>,
  rawRows: Record<string, unknown>[],
  states: LookupDto[],
): { dtos: T[]; sentRows: number[]; clientErrors: BulkImportError[] } {
  const dtos: T[] = [];
  const sentRows: number[] = []; // Excel row number for each sent dto
  const clientErrors: BulkImportError[] = [];
  rawRows.forEach((raw, i) => {
    const excelRow = i + 2; // header is Excel row 1, data starts at 2
    const { dto, error } = spec.build(raw, states);
    if (dto) {
      dtos.push(dto);
      sentRows.push(excelRow);
    } else {
      clientErrors.push({ row: excelRow, message: error ?? "Invalid row" });
    }
  });
  return { dtos, sentRows, clientErrors };
}

/** Merge client-side (mapping) errors with the server result, mapping server row indexes back to Excel rows. */
export function mergeResult(
  clientErrors: BulkImportError[],
  sentRows: number[],
  server: BulkImportResult,
): BulkImportResult {
  const serverErrors = server.errors.map((e) => ({
    row: sentRows[e.row - 1] ?? e.row,
    message: e.message,
  }));
  const errors = [...clientErrors, ...serverErrors].sort((a, b) => a.row - b.row);
  return { imported: server.imported, failed: errors.length, errors };
}
