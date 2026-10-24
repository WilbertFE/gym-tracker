import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    // server-only throws outside a server bundle, so stub it in tests.
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)) },
  },
});
