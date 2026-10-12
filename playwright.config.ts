import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/ui",
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { channel: "chrome" },
  },
  workers: 1,
  reporter: "list",
  webServer: {
    command: "npm.cmd run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
