import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
  },
});
