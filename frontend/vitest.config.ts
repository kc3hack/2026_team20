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
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", "tests/visual/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "y-supabase": path.resolve(
        __dirname,
        "./node_modules/y-supabase/dist/index.js",
      ),
    },
  },
});
