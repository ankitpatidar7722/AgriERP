import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // The datagrid/ directory is a vendored, generics-heavy grid component
    // ported in from another app; it intentionally leans on `any` for arbitrary
    // row/column shapes, so it is exempt from lint. The rest of the app stays
    // fully linted (type-checking still applies to these files via tsc).
    ignores: ["src/components/datagrid/**"],
  },
];

export default eslintConfig;
