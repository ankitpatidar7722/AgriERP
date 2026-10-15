/** One inward/outward movement of a regulated input for the inspection register. */
export interface ComplianceRegisterRow {
  date: string;
  direction: string; // "Inward" | "Outward"
  voucherType: string;
  voucherNumber: string;
  supplierInvoiceNumber?: string | null;
  partyName: string;
  partyGst?: string | null;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemGroupCode: string;
  itemGroupName: string;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  inwardQty: number;
  outwardQty: number;
  unitCode?: string | null;
}

export interface ComplianceRegisterQuery {
  fromDate: string;
  toDate: string;
  /** PRDGRP / SEDGRP / FRTGRP, or empty for all regulated groups. */
  groupCode?: string | null;
  /** "Inward" / "Outward", or empty for both. */
  direction?: string | null;
}
