"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomePhone from "@/components/phone/HomePhone";
import { useIsPhone } from "@/hooks/use-is-phone";

/**
 * The phone app's Home (bottom bar → Home). It is a phone screen: on a wider viewport it hands over
 * to the desktop dashboard, so a shared link or a rotated tablet never shows a phone layout on a PC.
 */
export default function HomeScreen() {
  const router = useRouter();
  const isPhone = useIsPhone();

  useEffect(() => {
    if (isPhone === false) router.replace("/dashboard/sales");
  }, [isPhone, router]);

  return isPhone ? <HomePhone /> : null;
}
