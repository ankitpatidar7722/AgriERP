import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones.
 *
 * Plain string concatenation would leave `px-2 px-4` both in the markup, and
 * which one applies then depends on stylesheet order rather than call order -
 * so a component prop could not reliably override a default.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Human-friendly ("natural") ordering used by the owned DataGrid's sort: numbers
 * inside strings compare by value, so "Bag 2" sorts before "Bag 10", and case is
 * ignored. Backs `naturalCompare` imported by `@/components/datagrid`.
 */
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function naturalCompare(a: unknown, b: unknown): number {
  return naturalCollator.compare(String(a ?? ""), String(b ?? ""));
}
