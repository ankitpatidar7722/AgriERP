import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Pure logic only - formatting, money arithmetic, allocation previews.
    // Anything needing a browser is covered by the Playwright scripts in
    // scripts/, which exercise the real app against the real API.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
