import type { QueryParameters } from "@/types/api";

export type BalanceType = "DR" | "CR";
export type CustomerType = "Retail" | "Wholesale" | "Dealer";

/* ------------------------------- itemSubGroup ------------------------------- */

export interface ItemSubGroupListDto {
  /** Which item group this sub group sits under - the item form filters on it. */
  itemGroupId: number;
  itemGroupName?: string | null;
  itemSubGroupId: number;
  itemSubGroupCode: string;
  itemSubGroupName: string;
  parentItemSubGroupId?: number | null;
  parentItemSubGroupName?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
}

export interface SaveItemSubGroupRequest {
  itemSubGroupCode: string;
  itemSubGroupName: string;
  parentItemSubGroupId?: number | null;
  description?: string | null;
  iconName?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ItemSubGroupQuery extends QueryParameters {
  parentItemSubGroupId?: number | null;
  rootOnly?: boolean | null;
}

/* -------------------------------- company -------------------------------- */

export interface CompanyListDto {
  companyId: number;
  companyCode: string;
  companyName: string;
  gstNumber?: string | null;
  city?: string | null;
  stateName?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  isActive: boolean;
  itemCount: number;
}

export interface CompanyDto extends CompanyListDto {
  address?: string | null;
  stateId?: number | null;
  pincode?: string | null;
  email?: string | null;
  website?: string | null;
  remarks?: string | null;
}

export interface SaveCompanyRequest {
  companyCode: string;
  companyName: string;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  stateId?: number | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  contactPerson?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface CompanyQuery extends QueryParameters {
  stateId?: number | null;
}

/* ------------------------------- supplier -------------------------------- */

export interface SupplierListDto {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  gstNumber?: string | null;
  city?: string | null;
  stateName?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  paymentTermDays: number;
  creditLimit: number;
  isActive: boolean;
}

export interface SupplierDto extends SupplierListDto {
  panNumber?: string | null;
  address?: string | null;
  stateId?: number | null;
  pincode?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  openingBalance: number;
  openingBalanceType: BalanceType;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  remarks?: string | null;
  /** Derived from the outstanding view, never a stored column. */
  outstandingAmount: number;
}

export interface SaveSupplierRequest {
  supplierCode?: string | null;
  supplierName: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  address?: string | null;
  city?: string | null;
  stateId?: number | null;
  pincode?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  paymentTermDays: number;
  creditLimit: number;
  openingBalance: number;
  openingBalanceType: BalanceType;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface SupplierQuery extends QueryParameters {
  stateId?: number | null;
  city?: string | null;
  hasOutstanding?: boolean | null;
}

/* ------------------------------- customer -------------------------------- */

export interface CustomerListDto {
  customerId: number;
  customerCode: string;
  customerName: string;
  village?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  creditLimit: number;
  creditDays: number;
  isActive: boolean;
}

export interface CustomerDto extends CustomerListDto {
  fatherName?: string | null;
  alternateMobile?: string | null;
  address?: string | null;
  city?: string | null;
  stateId?: number | null;
  stateName?: string | null;
  pincode?: string | null;
  openingBalance: number;
  openingBalanceType: BalanceType;
  remarks?: string | null;
  outstandingAmount: number;
  lastInvoiceDate?: string | null;
  oldestUnpaidAgeDays?: number | null;
}

export interface SaveCustomerRequest {
  customerCode?: string | null;
  customerName: string;
  fatherName?: string | null;
  village?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  stateId?: number | null;
  pincode?: string | null;
  customerType: CustomerType;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  openingBalanceType: BalanceType;
  remarks?: string | null;
  isActive: boolean;
}

export interface CustomerQuery extends QueryParameters {
  village?: string | null;
  customerType?: CustomerType | null;
  hasOutstanding?: boolean | null;
}

/* --------------------------------- unit ---------------------------------- */

export interface UnitDto {
  unitId: number;
  unitCode: string;
  unitName: string;
  description?: string | null;
  allowDecimal: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface SaveUnitRequest {
  unitCode: string;
  unitName: string;
  description?: string | null;
  allowDecimal: boolean;
  displayOrder: number;
  isActive: boolean;
}

/* -------------------------------- item -------------------------------- */

export interface ItemListDto {
  itemId: number;
  itemCode: string;
  itemName: string;
  shortName?: string | null;
  technicalName?: string | null;
  itemSubGroupId: number;
  itemSubGroupName: string;
  /** Parent group name (Product/Fertilizers/Seed/Other Master) - shown in the item picker. */
  itemGroupName: string;
  companyId?: number | null;
  companyName?: string | null;
  brand?: string | null;
  packingSize?: number | null;
  packingUnitCode?: string | null;
  unitId: number;
  unitCode: string;
  hsnCode?: string | null;
  gstPercent: number;
  purchaseRate: number;
  sellingRate: number;
  /** Carried on the list row so the sales picker can build a bill line directly. */
  wholesaleRate: number;
  dealerRate: number;
  minSellingRate: number;
  mrp: number;
  minStockLevel: number;
  rackNumber?: string | null;
  barcode?: string | null;
  imagePath?: string | null;
  isActive: boolean;
  /** Rolled up from batches, not stored on the item. */
  currentStock: number;
  /** OutOfStock | LowStock | OverStock | Normal */
  stockStatus: string;
  nearestExpiryDate?: string | null;
}

export interface ItemBatchDto {
  batchId: number;
  batchNumber: string;
  locationId: number;
  locationName: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  inwardQty: number;
  outwardQty: number;
  currentQty: number;
  daysToExpiry?: number | null;
  /** NoExpiry | Expired | Critical | Warning | Safe */
  expiryStatus: string;
}

export interface ItemDto extends ItemListDto {
  /** Which group's form this item was entered on, and must be edited on. */
  itemGroupId: number;
  /** Group-specific answers, keyed by ItemGroupFieldId. */
  extraFields: Record<number, string | null>;
  packingUnitId?: number | null;
  purchaseUnitId?: number | null;
  stockUnitId?: number | null;
  hsnId?: number | null;
  gstSlabId: number;
  isRateInclusiveOfTax: boolean;
  maxStockLevel: number;
  reorderLevel: number;
  isBatchTracked: boolean;
  isExpiryTracked: boolean;
  allowNegativeStock: boolean;
  defaultLocationId?: number | null;
  description?: string | null;
  licenceNumber?: string | null;
  stockValueAtCost: number;
  batchCount: number;
  batches: ItemBatchDto[];
}

export interface SaveItemRequest {
  /** Checked against the sub-group's group by the API; 0 lets it be derived. */
  itemGroupId?: number;
  /** Values for fields the group defines that have no column of their own. */
  extraFields?: Record<number, string | null>;
  itemCode?: string | null;
  itemName: string;
  shortName?: string | null;
  technicalName?: string | null;
  itemSubGroupId: number;
  companyId?: number | null;
  brand?: string | null;
  packingSize?: number | null;
  packingUnitId?: number | null;
  unitId: number;
  purchaseUnitId?: number | null;
  stockUnitId?: number | null;
  hsnId?: number | null;
  gstSlabId: number;
  isRateInclusiveOfTax: boolean;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  wholesaleRate: number;
  dealerRate: number;
  minSellingRate: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  isBatchTracked: boolean;
  isExpiryTracked: boolean;
  allowNegativeStock: boolean;
  defaultLocationId?: number | null;
  isActive: boolean;
}

export interface ItemQuery extends QueryParameters {
  /** Restricts the list to one item group; the header dropdown drives it. */
  itemGroupId?: number | null;
  itemSubGroupId?: number | null;
  companyId?: number | null;
  gstSlabId?: number | null;
  barcode?: string | null;
  rackNumber?: string | null;
  stockStatus?: string | null;
  nearExpiryOnly?: boolean | null;
}

/* ------------------------------- shop master ------------------------------ */

export interface ShopListDto {
  shopId: number;
  shopName: string;
  city?: string | null;
  stateName?: string | null;
  gstNo?: string | null;
  ownerName?: string | null;
  mobileNo?: string | null;
  isActive: boolean;
}

export interface ShopDto extends ShopListDto {
  address?: string | null;
  stateId?: number | null;
  email?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SaveShopRequest {
  shopName: string;
  address?: string | null;
  city?: string | null;
  stateId?: number | null;
  gstNo?: string | null;
  ownerName?: string | null;
  mobileNo?: string | null;
  email?: string | null;
  isActive: boolean;
}

export interface ShopQuery extends QueryParameters {
  stateId?: number | null;
}

/* ---------------------------- warehouse master ---------------------------- */

export interface WarehouseListDto {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  address?: string | null;
  binCount: number;
  isActive: boolean;
}

export interface WarehouseDto extends WarehouseListDto {
  /** Bin names, in the order they were added. */
  bins: string[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface SaveWarehouseRequest {
  warehouseName: string;
  address?: string | null;
  bins: string[];
  isActive: boolean;
}

export type WarehouseQuery = QueryParameters;

/* ---------------------------- customer ledger ----------------------------- */

export interface CustomerLedgerRow {
  seq: number;
  transactionDate: string;
  voucherType: string;
  voucherNumber?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  narration?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  createdByName?: string | null;
}

export interface CustomerLedgerDto {
  customerId: number;
  customerCode: string;
  customerName: string;
  fromDate?: string | null;
  toDate?: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  rows: CustomerLedgerRow[];
}

export interface CustomerProfileDto {
  customerId: number;
  customerCode: string;
  customerName: string;
  mobile?: string | null;
  village?: string | null;
  customerType: string;
  isActive: boolean;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  outstanding: number;
  totalPurchases: number;
  totalPayments: number;
  lastPurchaseDate?: string | null;
  lastPaymentDate?: string | null;
  nextDueDate?: string | null;
  overCreditLimit: boolean;
}

export interface ReceivablesSummaryDto {
  totalOutstanding: number;
  overdueCustomerCount: number;
  overdueAmount: number;
  todayCollection: number;
  nearDueCount: number;
}

export interface CustomerOutstandingRow {
  customerId: number;
  customerCode: string;
  customerName: string;
  village?: string | null;
  mobile?: string | null;
  customerType: string;
  creditLimit: number;
  creditDays: number;
  outstandingAmount: number;
  lastInvoiceDate?: string | null;
  oldestUnpaidDate?: string | null;
  oldestUnpaidAgeDays?: number | null;
}

/** Per-supplier payables, derived from vw_SupplierOutstanding. */
export interface SupplierOutstandingRow {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  city?: string | null;
  phone?: string | null;
  paymentTermDays: number;
  creditLimit: number;
  isActive: boolean;
  openingBalance: number;
  billCount: number;
  totalPurchased: number;
  totalPaid: number;
  unpaidBalance: number;
  returnValue: number;
  onAccountAdvance: number;
  outstandingAmount: number;
}
