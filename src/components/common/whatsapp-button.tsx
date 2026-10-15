"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/ag-toast";
import { useT } from "@/features/i18n/provider";
import { normalizeIndianMobile, openWhatsApp } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  /** Raw mobile as stored (any format); it is normalized to wa.me digits here. */
  phone?: string | null;
  /** The full, already-localized message to pre-fill. Build it with the helpers
   *  in src/lib/whatsapp.ts (buildUdhaarMessage / buildBillMessage). */
  message: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

/**
 * "Send on WhatsApp" - opens WhatsApp with the chat + pre-filled message so the
 * shopkeeper just taps Send. Disabled (with a hint) when there is no usable
 * mobile number. Free, no API - see src/lib/whatsapp.ts.
 */
export function WhatsAppButton({
  phone,
  message,
  label,
  size = "sm",
  variant = "outline",
  className,
}: WhatsAppButtonProps) {
  const t = useT();
  const hasPhone = !!normalizeIndianMobile(phone);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={!hasPhone}
      title={hasPhone ? undefined : t("wa.noMobile")}
      className={cn(
        "border-[#25D366]/50 text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E] dark:text-[#25D366] dark:hover:text-[#25D366]",
        className,
      )}
      onClick={() => {
        if (!openWhatsApp(phone, message)) toast.error(t("wa.noMobile"));
      }}
    >
      <MessageCircle className={cn("size-4", label && "mr-1.5")} />
      {label ?? t("wa.send")}
    </Button>
  );
}
