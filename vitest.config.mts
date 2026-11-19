import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    environment: "node",
    // Loads .env, .env.local, .env.test and .env.test.local (all prefixes).
    env: loadEnv(mode, process.cwd(), ""),
    // Integration tests talk to Supabase over the network.
    testTimeout: 20_000,
  },
}));
