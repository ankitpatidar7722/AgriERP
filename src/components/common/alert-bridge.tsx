"use client";

import { useEffect } from "react";
import { useModalAlert } from "indas-ui";
import { registerAlertHandlers } from "@/lib/ag-toast";

/**
 * Makes the app's `toast` (see `@/lib/ag-toast`) render indas-ui's alert — the
 * SAME success / error popup Indus 360 uses (`useModalAlert().showSuccess/Error`).
 * We render this once inside the app shell: it owns one `<AlertComponent/>` and
 * registers its `showSuccess` / `showError` as the toast backend, so every
 * `toast.success(...)` / `toast.error(...)` across the app shows that popup.
 */
export function AlertBridge() {
  const { showSuccess, showError, AlertComponent } = useModalAlert();

  useEffect(() => {
    registerAlertHandlers({ success: showSuccess, error: showError });
    return () => registerAlertHandlers(null);
  }, [showSuccess, showError]);

  return <AlertComponent />;
}
