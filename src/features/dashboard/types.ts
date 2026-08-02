export interface DashboardHeadline {
  asOnDate: string;
  todaySales: number;
  todayInvoiceCount: number;
  todayProfit: number;
  monthSales: number;
  monthProfit: number;
  todayPurchase: number;
  monthPurchase: number;
  stockValueAtCost: number;
  stockValueAtMrp: number;
  customerDue: number;
  supplierDue: number;
  monthExpenses: number;
}

export interface DashboardAlerts {
  lowStockCount: number;
  outOfStockCount: number;
  expiredBatchCount: number;
  nearExpiryBatchCount: number;
  expiredStockValue: number;
  activeItemCount: number;
}

export interface DashboardRecentBill {
  saleId: number;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  village: string;
  saleType: string;
  paymentType: string;
  grandTotal: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

export interface DashboardTopItem {
  itemId: number;
  itemCode: string;
  itemName: string;
  itemSubGroupName: string;
  companyName: string;
  unitCode: string;
  quantitySold: number;
  salesValue: number;
  profit: number;
}

export interface DashboardMonthPoint {
  monthStart: string;
  monthLabel: string;
  salesAmount: number;
  profitAmount: number;
  purchaseAmount: number;
  expenseAmount: number;
}

export interface DashboardItemSubGroupStock {
  itemSubGroupId: number;
  itemSubGroupName: string;
  itemCount: number;
  inStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalQuantity: number;
  stockValueAtCost: number;
  stockValueAtMrp: number;
}

export interface Dashboard {
  headline: DashboardHeadline;
  alerts: DashboardAlerts;
  recentBills: DashboardRecentBill[];
  topItems: DashboardTopItem[];
  monthlyTrend: DashboardMonthPoint[];
  itemSubGroupStock: DashboardItemSubGroupStock[];
}
