import { defineConfig, devices } from "@playwright/test";

// Local-only (no CI): run by hand with `pnpm test:e2e`, see CLAUDE.md Testing.
export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
