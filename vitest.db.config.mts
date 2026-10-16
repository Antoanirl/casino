import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database integration tests. Need DATABASE_URL_TEST pointing at a disposable
// PostgreSQL database with migrations applied. Run with `npm run test:db`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
