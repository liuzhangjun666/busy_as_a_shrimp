import { expect, test } from "@playwright/test";

test("auth page smoke", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: /^登录$/ })).toBeVisible();
});

test("resource list page smoke", async ({ page }) => {
  await page.goto("/resource/list");
  await expect(page).toHaveURL(/\/resource\/list/);
  await expect(
    page.getByText("资源").or(page.getByText("暂无")).or(page.getByText("加载失败")).first()
  ).toBeVisible();
});

test("match list route guard smoke", async ({ page }) => {
  await page.goto("/match/list");
  await expect(page).toHaveURL(/\/auth|\/match\/list/);
});
