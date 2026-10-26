import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("explore renders the canvas map, legend and controls", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore counties" })).toBeAttached();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      canvas.evaluate((element) => {
        const el = element as HTMLCanvasElement;
        const ctx = el.getContext("2d");
        if (!ctx || el.width === 0 || el.height === 0) return 0;
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        let painted = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted += 1;
        return painted;
      }),
    )
    .toBeGreaterThan(100);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset map zoom" }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Legend" }).click();
  }
  await expect(page.getByRole("region", { name: /map legend/i }).filter({ visible: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("map layer and legend breaks remain operable", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const layer = page.getByRole("combobox", { name: "Map layer" });
    await expect(layer).toBeVisible();
    await layer.selectOption("need");
  } else {
    const group = page.getByRole("radiogroup", { name: "Map layer" });
    await expect(group).toBeVisible();
    await group.getByRole("radio", { name: "Need" }).click();
  }
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Legend" }).click();
  }
  await expect(page.getByRole("region", { name: /Need map legend/i }).filter({ visible: true })).toBeVisible();

  const firstBreak = page.getByRole("slider", { name: "Class break 1" }).first();
  await firstBreak.focus();
  const before = await firstBreak.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowRight");
  await expect(firstBreak).not.toHaveAttribute("aria-valuenow", before ?? "");
});

test("rankings defaults to cards on mobile and table on desktop", async ({ page }, testInfo) => {
  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "Rankings" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible();
    await expect(page.getByRole("grid", { name: "County rankings" })).toHaveCount(0);
  } else {
    await expect(page.getByRole("grid", { name: "County rankings" })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
});

test("direct routes and responsive shells do not overflow", async ({ page }) => {
  for (const path of ["/methodology", "/compare", "/scatter", "/print/06037"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
