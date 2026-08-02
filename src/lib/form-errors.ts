import type { FieldErrors, FieldValues } from "react-hook-form";

/**
 * The first validation message, for a summary line above a long form.
 *
 * react-hook-form already scrolls to and focuses the first invalid control, but
 * on a form tall enough to scroll, the operator can still press Save and see
 * nothing obvious change. A single line at the top says what happened before
 * they have to hunt for the red text.
 */
export function firstErrorMessage<T extends FieldValues>(
  errors: FieldErrors<T>,
): string | null {
  for (const error of Object.values(errors)) {
    const message = (error as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return null;
}
