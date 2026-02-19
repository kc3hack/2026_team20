import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    passWithNoTests: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/*.{test,spec}.ts",
      "src/**/*.{test,spec}.tsx",
    ],
    exclude: ["node_modules/**", "tests/visual/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
