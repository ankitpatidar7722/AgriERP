"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsPhone } from "@/hooks/use-is-phone";

/**
 * The dashboard split into Sales / Purchase pages; land on Sales by default. On a phone the landing
 * screen is the app Home instead (greeting, today's figures, quick actions — components/phone/HomePhone).
 */
export default function DashboardIndex() {
  const router = useRouter();
  const isPhone = useIsPhone();

  useEffect(() => {
    if (isPhone === null) return;
    router.replace(isPhone ? "/home" : "/dashboard/sales");
  }, [isPhone, router]);

  return null;
}
