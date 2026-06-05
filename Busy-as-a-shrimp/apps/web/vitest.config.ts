import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**"],
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8081/api/v1",
      NEXT_PUBLIC_APP_ENV: "local",
      NODE_ENV: "test"
    }
  }
});
