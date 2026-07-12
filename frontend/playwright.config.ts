import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "..",
      port: 4000,
      reuseExistingServer: true,
      timeout: 20_000
    },
    {
      command: "npm run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 20_000
    }
  ],
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 920 }
      }
    },
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 }
      }
    }
  ]
});
