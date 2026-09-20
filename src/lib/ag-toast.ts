import { toast as sonnerToast } from "sonner";

/**
 * App toast shim — a drop-in for the parts of sonner's `toast` this app uses
 * (`success` / `error` / `info`). Inside the app shell it renders the SAME
 * indas-ui alert Indus 360 uses (an `<AlertBridge/>` registers indas-ui's
 * `showSuccess` / `showError` here), so success / error messages look identical
 * across both apps. On pre-auth pages that have no bridge (e.g. Login) it falls
 * back to sonner, so a message is never silently dropped.
 *
 * Call sites stay unchanged — only the import path swaps from "sonner" to
 * "@/lib/ag-toast".
 */

type AlertFn = (title: string, description: string, autoClose?: number) => void;

let successFn: AlertFn | null = null;
let errorFn: AlertFn | null = null;

/** Wired by <AlertBridge/> on mount, cleared on unmount. */
export function registerAlertHandlers(handlers: { success: AlertFn; error: AlertFn } | null) {
  successFn = handlers?.success ?? null;
  errorFn = handlers?.error ?? null;
}

const str = (v: unknown) => (v == null ? "" : String(v));

/** Success/info auto-dismiss like a toast; errors stay until dismissed (as in Indus 360). */
const SUCCESS_AUTOCLOSE_MS = 2500;

export const toast = {
  success(message: unknown, _opts?: unknown) {
    if (successFn) successFn(str(message), "", SUCCESS_AUTOCLOSE_MS);
    else sonnerToast.success(str(message));
  },
  info(message: unknown, _opts?: unknown) {
    if (successFn) successFn(str(message), "", SUCCESS_AUTOCLOSE_MS);
    else sonnerToast.info(str(message));
  },
  error(message: unknown, _opts?: unknown) {
    if (errorFn) errorFn(str(message), "");
    else sonnerToast.error(str(message));
  },
};
