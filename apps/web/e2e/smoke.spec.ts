import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test("login validation and mock success", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText("Enter a valid email address", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview/);
  await expect(
    page.getByRole("heading", { name: "Workflow health" }),
  ).toBeVisible();
});

test("navigate analytics and inspect a violation", async ({ page }) => {
  await page.goto("/overview");
  const navigationButton = page.getByRole("button", {
    name: "Open navigation",
  });
  if (await navigationButton.isVisible()) await navigationButton.click();
  await page.getByRole("link", { name: "Violations" }).first().click();
  await expect(page.getByRole("heading", { name: "Violations" })).toBeVisible();
  await page.getByText("Decision issued was not observed").first().click();
  await expect(page.getByText("Supporting technical evidence")).toBeVisible();
});

test("create an inline event without losing the rule draft", async ({
  page,
}) => {
  await page.goto("/explore");
  const propertiesPane = page.getByRole("button", { name: "properties" });
  if (await propertiesPane.isVisible()) await propertiesPane.click();
  await page.getByLabel("Rule name").fill("Invoice reconciliation policy");
  const cataloguePane = page.getByRole("button", { name: "catalogue" });
  if (await cataloguePane.isVisible()) await cataloguePane.click();
  await page.getByRole("button", { name: "Trigger" }).click();
  const search = page.getByPlaceholder(
    "Search canonical name, domain, service, attribute…",
  );
  await search.fill("invoice.created");
  await page.getByRole("button", { name: /Create invoice.created/ }).click();
  const eventDialog = page.getByRole("dialog");
  await eventDialog
    .getByLabel("Description")
    .fill("An invoice record was created.");
  await eventDialog.getByLabel("Source service").fill("billing-api");
  await eventDialog
    .getByRole("button", { name: "Create and select" })
    .click();
  if (await propertiesPane.isVisible()) await propertiesPane.click();
  await expect(page.getByLabel("Rule name")).toHaveValue(
    "Invoice reconciliation policy",
  );
  await expect(page.getByText("invoice.created").first()).toBeVisible();
});

const responsiveViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

for (const viewport of responsiveViewports) {
  for (const theme of ["light", "dark"] as const) {
    test(`${viewport.name} overview renders in ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem("theme", selectedTheme);
      }, theme);
      await page.goto("/overview");
      await expect(
        page.getByRole("heading", { name: "Workflow health" }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  }
}
