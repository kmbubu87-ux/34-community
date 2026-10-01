import { expect, test } from "@playwright/test";
import { login, expectNoOverflow } from "./helpers";

test("community is private and is immediately above notices", async ({ page, request }) => {
  test.skip(process.env.E2E_DATABASE_READY !== "1", "Requires disposable CI DB");
  expect((await request.get("/api/community/folders")).status()).toBe(401);
  await login(page);
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "커뮤니티", exact: true })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "34사랑 메뉴" });
  const labels = await menu.locator("a").allTextContents();
  expect(labels.findIndex(x => x.includes("커뮤니티"))).toBe(labels.findIndex(x => x.includes("공지")) - 1);
  const folders = await page.request.get("/api/community/folders");
  expect(folders.ok()).toBe(true);
  expect((await folders.json()).folders.length).toBeGreaterThan(0);
  expect((await page.request.post("/api/community/folders", { data: { name: "회원이 생성하면 안 됨" } })).status()).toBe(403);
  await page.setViewportSize({ width: 360, height: 800 });
  await expectNoOverflow(page);
});
