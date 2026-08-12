import { redirect } from "next/navigation";

/** The dashboard split into Sales / Purchase pages; land on Sales by default. */
export default function DashboardIndex() {
  redirect("/dashboard/sales");
}
