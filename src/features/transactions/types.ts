import type { QueryParameters } from "@/types/api";

export type DocumentStatus = "Draft" | "Posted" | "Cancelled";
export type SaleType = "Retail" | "Wholesale" | "Dealer";
export type SalePaymentType = "Cash" | "Credit";
export type PartyType = "Customer" | "Supplier";
export type PaymentDirection = "Receipt" | "Payment";
export type RefundMode = "Cash" | "Adjust" | "Bank" | "Replacement";
export type AdjustmentType = "Physical" | "Damage" | "Expiry" | "Opening" | "Other";
export type PurchaseOrderStatus = "Draft" | "Open" | "Partial" | "Received" | "Cancelled";

/** Billing type-ahead payload: rates, GST and live stock in one row. */
export interface ItemLookupDto {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
  barcode?: string | null;
  itemGroupName?: string | null;
  itemSubGroupName?: string | null;
  unitId: number;
  unitCode: string;
  sellingRate: number;
  wholesaleRate: number;
  dealerRate: number;
  mrp: number;
  minSellingRate: number;
  gstPercent: number;
  hsnCode?: string | null;
  currentStock: number;
  isActive: boolean;
}

/* --------------------------------- sales --------------------------------- */

export interface SaleLineRequest {
  itemId: number;
  /** Null lets the server pick batches by FEFO, splitting the line if needed. */
  batchId?: number | null;
  quantity: number;
  freeQuantity: number;
  rate?: number | null;
  discountPercent: number;
  discountAmount: number;
  remarks?: string | null;
}

export interface SalePaymentRequest {
  paymentModeId: number;
  amount: number;
  referenceNumber?: string | null;
  bankName?: string | null;
  chequeDate?: string | null;
}

export interface SaveSaleRequest {
  invoiceDate: string;
  customerId?: number | null;
  walkInCustomerName?: string | null;
  walkInMobile?: string | null;
  saleType: SaleType;
  paymentType: SalePaymentType;
  locationId?: number | null;
  salesmanId?: number | null;
  otherCharges: number;
  remarks?: string | null;
  /** Credit term for a balance; null uses the customer's default. */
  creditDays?: number | null;
  lines: SaleLineRequest[];
  payments: SalePaymentRequest[];
}

export interface SaleLineDto {
  salesDetailId: number;
  lineNumber: number;
  itemId: number;
  itemName: string;
  unitCode: string;
  batchId: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  freeQuantity: number;
  totalQuantity: number;
  mrp: number;
  rate: number;
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  hsnCode?: string | null;
  /** Null unless the viewer holds Report.Profit. */
  costRate?: number | null;
  lineProfit?: number | null;
}

export interface SalePaymentDto {
  salePaymentId: number;
  paymentModeId: number;
  paymentModeName: string;
  amount: number;
  referenceNumber?: string | null;
}

export interface SaleListDto {
  saleId: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerId?: number | null;
  customerName: string;
  village?: string | null;
  saleType: SaleType;
  paymentType: SalePaymentType;
  taxableAmount: number;
  grandTotal: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  status: DocumentStatus;
  lineCount: number;
}

export interface SaleDto extends SaleListDto {
  walkInCustomerName?: string | null;
  walkInMobile?: string | null;
  locationId: number;
  locationName: string;
  salesmanId?: number | null;
  salesmanName?: string | null;
  isInterState: boolean;
  grossAmount: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  otherCharges: number;
  roundOff: number;
  dueDate?: string | null;
  remarks?: string | null;
  postedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  printCount: number;
  createdAt: string;
  totalCostAmount?: number | null;
  grossProfit?: number | null;
  lines: SaleLineDto[];
  payments: SalePaymentDto[];
}

export interface SaleQuery extends QueryParameters {
  customerId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  status?: DocumentStatus | null;
  saleType?: SaleType | null;
  paymentType?: SalePaymentType | null;
  unpaidOnly?: boolean | null;
}

export interface ShopHeaderDto {
  shopName: string;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  stateName?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  pesticideLicenceNo?: string | null;
  seedLicenceNo?: string | null;
  fertilizerLicenceNo?: string | null;
  invoiceTerms?: string | null;
  invoiceFooterNote?: string | null;
  upiId?: string | null;
}

export interface InvoiceTaxSummaryDto {
  hsnCode?: string | null;
  gstPercent: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface InvoicePrintDto {
  shop: ShopHeaderDto;
  invoice: SaleDto;
  taxSummary: InvoiceTaxSummaryDto[];
  amountInWords: string;
}

export interface SalesOrderCustomerDto {
  name: string;
  village?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
}

/** The sales-order print payload; shop head from ShopMaster, real sale totals. */
export interface SalesOrderPrintDto {
  shop: ShopHeaderDto;
  sale: SaleDto;
  customer: SalesOrderCustomerDto;
  taxSummary: InvoiceTaxSummaryDto[];
  amountInWords: string;
}

/* ------------------------------- purchases ------------------------------- */

export interface PurchaseLineRequest {
  itemId: number;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  mrp: number;
  sellingRate: number;
  remarks?: string | null;
}

export interface SavePurchaseRequest {
  purchaseDate: string;
  supplierId: number;
  /** Links this goods-receipt (GRN) back to the order it fulfils, if any. */
  purchaseOrderId?: number | null;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  locationId?: number | null;
  /** The warehouse the goods were received into (WarehouseMaster). Optional. */
  warehouseId?: number | null;
  freightCharges: number;
  otherCharges: number;
  paidAmount: number;
  remarks?: string | null;
  /** Credit term for the supplier balance; null uses the supplier's default. */
  creditDays?: number | null;
  lines: PurchaseLineRequest[];
}

export interface PurchaseLineDto {
  purchaseDetailId: number;
  lineNumber: number;
  itemId: number;
  itemName: string;
  unitCode: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  freeQuantity: number;
  totalQuantity: number;
  rate: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  /** Cost per unit after freight share and free goods. */
  landedRate: number;
  mrp: number;
  sellingRate: number;
  hsnCode?: string | null;
}

export interface PurchasePrintDto {
  shop: ShopHeaderDto;
  purchase: PurchaseDto;
  taxSummary: InvoiceTaxSummaryDto[];
  amountInWords: string;
}

export interface PurchaseListDto {
  purchaseId: number;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: number;
  supplierName: string;
  supplierInvoiceNumber?: string | null;
  taxableAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  status: DocumentStatus;
  dueDate?: string | null;
  lineCount: number;
  warehouseName?: string | null;
}

export interface PurchaseDto extends PurchaseListDto {
  supplierInvoiceDate?: string | null;
  /** The purchase order this GRN receives against, if any. */
  purchaseOrderId?: number | null;
  locationId: number;
  locationName: string;
  /** The warehouse this GRN was received into (WarehouseMaster), if any. */
  warehouseId?: number | null;
  isInterState: boolean;
  grossAmount: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  freightCharges: number;
  otherCharges: number;
  roundOff: number;
  remarks?: string | null;
  postedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  lines: PurchaseLineDto[];
}

export interface PurchaseQuery extends QueryParameters {
  supplierId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  status?: DocumentStatus | null;
  unpaidOnly?: boolean | null;
}

/* ----------------------------- purchase orders ---------------------------- */

/** A booking line: how much of an item was ordered, and how much has arrived. */
export interface PurchaseOrderLineDto {
  purchaseOrderDetailId: number;
  itemId: number;
  itemCode: string;
  itemGroupName: string;
  itemSubGroupName: string;
  itemName: string;
  unitId: number;
  unitCode: string;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  rate: number;
  estimatedAmount: number;
  /** Pack breakdown that produced orderedQty, plus the requisition snapshot. */
  noOfPacks: number;
  qtyPerPack: number;
  requiredQty?: number | null;
  remarks?: string | null;
  itemRemark?: string | null;
  /** The requisition line this order line drew on, preserved across edits. */
  requisitionDetailId?: number | null;
  gstPercent: number;
  hsnCode?: string | null;
  mrp: number;
  sellingRate: number;
}

export interface PurchaseOrderDto {
  purchaseOrderId: number;
  orderNumber: string;
  orderDate: string;
  expectedDate?: string | null;
  supplierId: number;
  supplierName: string;
  totalQty: number;
  estimatedValue: number;
  status: PurchaseOrderStatus;
  remarks?: string | null;
  lines: PurchaseOrderLineDto[];
}

/** One PO line flattened with its parent order's header, for the item-wise list. */
export interface PurchaseOrderItemRow {
  purchaseOrderId: number;
  orderNumber: string;
  orderDate: string;
  expectedDate?: string | null;
  supplierId: number;
  supplierName: string;
  status: PurchaseOrderStatus;
  purchaseOrderDetailId: number;
  itemCode: string;
  itemName: string;
  itemGroupName: string;
  itemSubGroupName: string;
  unitCode: string;
  orderedQty: number;
  rate: number;
  estimatedAmount: number;
}

/** One GRN (purchase) line flattened with its parent header, for the item-wise list. */
export interface PurchaseItemRow {
  purchaseId: number;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: number;
  supplierName: string;
  warehouseName?: string | null;
  status: DocumentStatus;
  purchaseDetailId: number;
  itemCode: string;
  itemName: string;
  itemGroupName: string;
  itemSubGroupName: string;
  unitCode: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  quantity: number;
  freeQuantity: number;
  rate: number;
  lineTotal: number;
}

export interface PurchaseOrderSupplierDto {
  supplierCode: string;
  supplierName: string;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  stateName?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  paymentTermDays: number;
}

/** Everything the printable purchase order renders; shop head from ShopMaster. */
export interface PurchaseOrderPrintDto {
  shop: ShopHeaderDto;
  order: PurchaseOrderDto;
  supplier: PurchaseOrderSupplierDto;
  deliveryLocationName?: string | null;
  isInterState: boolean;
  taxSummary: InvoiceTaxSummaryDto[];
  totalPacks: number;
  subTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export interface PurchaseOrderLineRequest {
  itemId: number;
  /** The P.O. qty in purchase units = noOfPacks x qtyPerPack. */
  orderedQty: number;
  unitId?: number | null;
  rate: number;
  noOfPacks: number;
  qtyPerPack: number;
  /** Snapshot of the requisition's required qty; null for a direct order. */
  requiredQty?: number | null;
  remarks?: string | null;
  itemRemark?: string | null;
  /** Set when this PO line is raised from a requisition line. */
  requisitionDetailId?: number | null;
}

export interface SavePurchaseOrderRequest {
  orderDate: string;
  expectedDate?: string | null;
  supplierId: number;
  locationId?: number | null;
  remarks?: string | null;
  lines: PurchaseOrderLineRequest[];
}

export interface PurchaseOrderQuery extends QueryParameters {
  supplierId?: number | null;
  status?: PurchaseOrderStatus | null;
  fromDate?: string | null;
  toDate?: string | null;
  /** True returns only orders still awaiting goods (Open or Partial). */
  pendingOnly?: boolean | null;
}

/* ------------------------- purchase requisitions -------------------------- */

export type PurchaseRequisitionStatus =
  | "Draft"
  | "Open"
  | "Partial"
  | "Converted"
  | "Cancelled";

export interface PurchaseRequisitionLineDto {
  requisitionDetailId: number;
  itemId: number;
  itemCode: string;
  itemGroupName: string;
  itemSubGroupName: string;
  itemName: string;
  unitId: number;
  unitCode: string;
  requiredQty: number;
  orderedQty: number;
  pendingQty: number;
  expectedDate?: string | null;
  estimatedRate: number;
  remarks?: string | null;
  gstPercent: number;
  hsnCode?: string | null;
  mrp: number;
  sellingRate: number;
}

export interface PurchaseRequisitionDto {
  requisitionId: number;
  requisitionNumber: string;
  requisitionDate: string;
  locationId: number;
  locationName: string;
  totalQty: number;
  status: PurchaseRequisitionStatus;
  remarks?: string | null;
  /** Item names on the requisition, for the list grid. */
  itemNames: string[];
  lines: PurchaseRequisitionLineDto[];
}

/** One requisition line flattened with its parent header, for the item-wise list. */
export interface PurchaseRequisitionItemRow {
  requisitionId: number;
  requisitionNumber: string;
  requisitionDate: string;
  locationId: number;
  locationName: string;
  status: PurchaseRequisitionStatus;
  requisitionDetailId: number;
  itemCode: string;
  itemName: string;
  itemGroupName: string;
  itemSubGroupName: string;
  unitCode: string;
  requiredQty: number;
  pendingQty: number;
  estimatedRate: number;
  estimatedAmount: number;
}

export interface PurchaseRequisitionLineRequest {
  itemId: number;
  requiredQty: number;
  unitId?: number | null;
  expectedDate?: string | null;
  estimatedRate: number;
  remarks?: string | null;
}

export interface SavePurchaseRequisitionRequest {
  requisitionDate: string;
  locationId?: number | null;
  remarks?: string | null;
  lines: PurchaseRequisitionLineRequest[];
}

export interface PurchaseRequisitionQuery extends QueryParameters {
  status?: PurchaseRequisitionStatus | null;
  fromDate?: string | null;
  toDate?: string | null;
  /** True returns only requisitions still awaiting a purchase order (Open or Partial). */
  pendingOnly?: boolean | null;
}

/* --------------------------------- stock --------------------------------- */

export interface StockLedgerLineDto {
  stockTransactionId: number;
  transactionDate: string;
  transactionTypeName: string;
  itemId: number;
  itemName: string;
  batchNumber: string;
  expiryDate?: string | null;
  locationName: string;
  unitCode: string;
  inwardQty: number;
  outwardQty: number;
  rate: number;
  value: number;
  runningBalance: number;
  referenceType?: string | null;
  referenceNumber?: string | null;
  remarks?: string | null;
}

export interface StockLedgerQuery extends QueryParameters {
  itemId?: number | null;
  batchId?: number | null;
  locationId?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface BatchStockView {
  batchId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemSubGroupName: string;
  companyName?: string | null;
  batchNumber: string;
  locationId: number;
  locationName: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  currentQty: number;
  stockValueAtCost: number;
  unitCode: string;
  daysToExpiry?: number | null;
  expiryStatus: string;
}

export interface StockAdjustmentLineDto {
  adjustmentDetailId: number;
  itemId: number;
  itemName: string;
  batchId: number;
  batchNumber: string;
  expiryDate?: string | null;
  systemQty: number;
  physicalQty: number;
  differenceQty: number;
  rate: number;
  valueImpact: number;
  warehouseId?: number | null;
  warehouseName?: string | null;
  binName?: string | null;
  reason?: string | null;
}

export interface StockAdjustmentDto {
  adjustmentId: number;
  adjustmentNumber: string;
  adjustmentDate: string;
  adjustmentType: AdjustmentType;
  locationId: number;
  locationName: string;
  reason?: string | null;
  remarks?: string | null;
  totalIncreaseQty: number;
  totalDecreaseQty: number;
  totalValueImpact: number;
  status: DocumentStatus;
  postedAt?: string | null;
  createdAt: string;
  lines: StockAdjustmentLineDto[];
}

export interface SaveStockAdjustmentLine {
  /** Existing batch to count; null = new-stock line (batch created from fields below). */
  batchId?: number | null;
  physicalQty: number;
  reason?: string | null;
  // New-stock line fields:
  itemId?: number | null;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  rate?: number | null;
  mrp?: number | null;
  sellingRate?: number | null;
  // Warehouse/Bin label:
  warehouseId?: number | null;
  binName?: string | null;
}

export interface SaveStockAdjustmentRequest {
  adjustmentDate: string;
  adjustmentType: AdjustmentType;
  locationId?: number | null;
  reason?: string | null;
  remarks?: string | null;
  lines: SaveStockAdjustmentLine[];
}

export interface OpeningStockRequest {
  entryDate: string;
  locationId?: number | null;
  remarks?: string | null;
  lines: {
    itemId: number;
    batchNumber?: string | null;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    quantity: number;
    purchaseRate: number;
    mrp: number;
    sellingRate: number;
  }[];
}

export interface StockTransferLineDto {
  transferDetailId: number;
  itemId: number;
  itemName: string;
  fromBatchId: number;
  toBatchId?: number | null;
  batchNumber: string;
  quantity: number;
  rate: number;
  lineValue: number;
}

export interface StockTransferDto {
  transferId: number;
  transferNumber: string;
  transferDate: string;
  fromLocationId: number;
  fromLocationName: string;
  toLocationId: number;
  toLocationName: string;
  totalQty: number;
  totalValue: number;
  status: DocumentStatus;
  postedAt?: string | null;
  remarks?: string | null;
  lines: StockTransferLineDto[];
}

export interface SaveStockTransferRequest {
  transferDate: string;
  fromLocationId: number;
  toLocationId: number;
  remarks?: string | null;
  lines: { fromBatchId: number; quantity: number; remarks?: string | null }[];
}

export interface StockDocumentQuery extends QueryParameters {
  fromDate?: string | null;
  toDate?: string | null;
  status?: DocumentStatus | null;
  locationId?: number | null;
}

/* -------------------------------- payments -------------------------------- */

export interface OpenBillDto {
  referenceType: "Sale" | "Purchase" | "SalesReturn" | "PurchaseReturn";
  referenceId: number;
  documentNumber: string;
  documentDate: string;
  dueDate?: string | null;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  ageDays: number;
}

export interface PaymentAllocationDto {
  paymentAllocationId: number;
  referenceType: string;
  referenceId: number;
  referenceNumber?: string | null;
  allocatedAmount: number;
}

export interface PaymentDto {
  paymentId: number;
  voucherNumber: string;
  paymentDate: string;
  partyType: PartyType;
  customerId?: number | null;
  supplierId?: number | null;
  partyName: string;
  paymentType: PaymentDirection;
  paymentModeId: number;
  paymentModeName: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  referenceNumber?: string | null;
  clearanceStatus: string;
  status: string;
  remarks?: string | null;
  allocations: PaymentAllocationDto[];
}

export interface SavePaymentRequest {
  paymentDate: string;
  partyType: PartyType;
  customerId?: number | null;
  supplierId?: number | null;
  paymentType: PaymentDirection;
  paymentModeId: number;
  amount: number;
  referenceNumber?: string | null;
  bankName?: string | null;
  chequeDate?: string | null;
  clearanceStatus: string;
  remarks?: string | null;
  allocations: { referenceType: string; referenceId: number; allocatedAmount: number }[];
}

export interface ReceiptPrint {
  shop: ShopHeaderDto;
  payment: PaymentDto;
  amountInWords: string;
}

export interface PaymentQuery extends QueryParameters {
  partyType?: PartyType | null;
  customerId?: number | null;
  supplierId?: number | null;
  paymentType?: PaymentDirection | null;
  fromDate?: string | null;
  toDate?: string | null;
}

/* -------------------------------- reports -------------------------------- */

export interface ItemStockView {
  itemId: number;
  itemCode: string;
  itemName: string;
  itemSubGroupName: string;
  companyName?: string | null;
  unitCode: string;
  minStockLevel: number;
  maxStockLevel: number;
  purchaseRate: number;
  sellingRate: number;
  mrp: number;
  rackNumber?: string | null;
  currentStock: number;
  batchCount: number;
  stockValueAtCost: number;
  stockValueAtMrp: number;
  nearestExpiryDate?: string | null;
  stockStatus: string;
}

export interface SalesReportRow {
  invoiceDate: string;
  invoiceCount: number;
  taxableAmount: number;
  taxAmount: number;
  totalSales: number;
  amountReceived: number;
  creditGiven: number;
  cashInvoiceCount: number;
  creditInvoiceCount: number;
}

export interface CustomerSalesRow {
  customerId?: number | null;
  customerName: string;
  village?: string | null;
  invoiceCount: number;
  taxableAmount: number;
  taxAmount: number;
  totalSales: number;
  amountReceived: number;
  balanceAmount: number;
}

export interface SupplierPurchaseRow {
  supplierId: number;
  supplierName: string;
  city?: string | null;
  billCount: number;
  taxableAmount: number;
  taxAmount: number;
  totalPurchase: number;
  amountPaid: number;
  balanceAmount: number;
}

export interface PurchaseReportRow {
  purchaseDate: string;
  billCount: number;
  taxableAmount: number;
  taxAmount: number;
  totalPurchase: number;
  amountPaid: number;
  amountDue: number;
}

export interface ProfitReportRow {
  invoiceDate: string;
  taxableAmount: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
}

export interface GstSummaryRow {
  hsnCode?: string | null;
  gstPercent: number;
  isInterState: boolean;
  documentCount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface GstReturnDto {
  period: { fromDate: string; toDate: string };
  outwardSupplies: GstSummaryRow[];
  inwardSupplies: GstSummaryRow[];
  netTaxPayable: number;
}

export interface StockValuationDto {
  itemCount: number;
  totalQuantity: number;
  valueAtCost: number;
  valueAtMrp: number;
  potentialMargin: number;
}
