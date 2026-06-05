import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true
  },
  webServer: {
    command:
      "corepack pnpm --filter @airp/web build && corepack pnpm --filter @airp/web exec next start -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8081/api/v1",
      NEXT_PUBLIC_APP_ENV: "local",
      NEXT_PUBLIC_ENABLE_MSW: "1"
    }
  }
});
