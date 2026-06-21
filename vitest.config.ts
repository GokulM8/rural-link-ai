import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // lib/supabase.ts constructs its client at module load time, so merely
    // importing a module that re-exports it (e.g. lib/schemes.ts) throws
    // without these — even for tests that never call Supabase at all.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
    },
  },
});
