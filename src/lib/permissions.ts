/**
 * Mirrors AgriERP.Shared.Constants.Permissions.
 *
 * The UI uses these to decide what to show. The API enforces the same codes on
 * every endpoint - hiding a button is a courtesy, not a control.
 */
export const Permissions = {
  Dashboard: {
    View: "Dashboard.View",
    ViewProfit: "Dashboard.ViewProfit",
  },
  ItemSubGroup: {
    View: "Category.View",
    Create: "Category.Create",
    Edit: "Category.Edit",
    Delete: "Category.Delete",
  },
  Company: {
    View: "Company.View",
    Create: "Company.Create",
    Edit: "Company.Edit",
    Delete: "Company.Delete",
  },
  Supplier: {
    View: "Supplier.View",
    Create: "Supplier.Create",
    Edit: "Supplier.Edit",
    Delete: "Supplier.Delete",
  },
  Customer: {
    View: "Customer.View",
    Create: "Customer.Create",
    Edit: "Customer.Edit",
    Delete: "Customer.Delete",
  },
  Item: {
    View: "Product.View",
    Create: "Product.Create",
    Edit: "Product.Edit",
    Delete: "Product.Delete",
    Import: "Product.Import",
    Export: "Product.Export",
    EditRate: "Product.EditRate",
  },
  Stock: {
    View: "Stock.View",
    Adjust: "Stock.Adjust",
    Transfer: "Stock.Transfer",
    Post: "Stock.Post",
    Opening: "Stock.Opening",
  },
  Purchase: {
    View: "Purchase.View",
    Create: "Purchase.Create",
    Edit: "Purchase.Edit",
    Post: "Purchase.Post",
    Cancel: "Purchase.Cancel",
    Return: "Purchase.Return",
    Order: "Purchase.Order",
  },
  Sales: {
    View: "Sales.View",
    Create: "Sales.Create",
    Edit: "Sales.Edit",
    Post: "Sales.Post",
    Cancel: "Sales.Cancel",
    Return: "Sales.Return",
    Print: "Sales.Print",
    Discount: "Sales.Discount",
    OverrideMinRate: "Sales.OverrideMinRate",
    CreditSale: "Sales.CreditSale",
  },
  Payment: {
    View: "Payment.View",
    Create: "Payment.Create",
    Cancel: "Payment.Cancel",
    ExpenseView: "Expense.View",
    ExpenseCreate: "Expense.Create",
  },
  Report: {
    Sales: "Report.Sales",
    Purchase: "Report.Purchase",
    Stock: "Report.Stock",
    Profit: "Report.Profit",
    Gst: "Report.Gst",
    Party: "Report.Party",
    Export: "Report.Export",
  },
  User: {
    View: "User.View",
    Create: "User.Create",
    Edit: "User.Edit",
    Delete: "User.Delete",
    ResetPassword: "User.ResetPassword",
    RoleView: "Role.View",
    RoleManage: "Role.Manage",
  },
  Settings: {
    View: "Settings.View",
    Edit: "Settings.Edit",
    Audit: "Settings.Audit",
    YearEnd: "Settings.YearEnd",
  },
} as const;
