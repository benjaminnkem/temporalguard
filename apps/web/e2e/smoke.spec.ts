import { expect, test } from "@playwright/test";

const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    firstName: "Ada",
    lastName: "Okafor",
    email: "ada@example.com",
  },
  workspace: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Northstar Labs",
  },
};

const violationSummary = {
  id: "00000000-0000-4000-8000-000000000010",
  workflowId: "00000000-0000-4000-8000-000000000020",
  ruleId: "00000000-0000-4000-8000-000000000030",
  ruleName: "Decision issued within 4h",
  type: "missing_expected_event",
  severity: "critical",
  status: "open",
  explanation: "Decision issued was not observed before the deadline.",
  triggerEventName: "application.submitted",
  affectedEventNames: ["decision.issued"],
  occurredAt: "2026-07-24T05:15:00.000Z",
  overdueMs: 9_000_000,
  environment: "production",
};

const dashboard = {
  health: "degraded",
  metrics: [
    {
      id: "completion",
      label: "Completion rate",
      value: "96.8%",
      delta: 1.4,
      favorable: "up",
      description: "Completed workflows divided by started workflows.",
    },
  ],
  reliabilitySeries: Array.from({ length: 12 }, (_, index) => ({
    timestamp: `2026-07-24T${String(index * 2).padStart(2, "0")}:00:00.000Z`,
    volume: index + 1,
    completionRate: 95 + index / 10,
    violations: index % 3,
    duration: 180 + index,
  })),
  deadlineBuckets: [
    { bucket: "< 5m", count: 2 },
    { bucket: "5–15m", count: 3 },
    { bucket: "15–60m", count: 4 },
    { bucket: "Overdue", count: 1 },
  ],
  recentViolations: [violationSummary],
};

async function mockApi(page: import("@playwright/test").Page) {
  let ruleEnabled = true;
  let ruleDeleted = false;
  let ruleCorrelationKey = "payment.id";
  let ruleEnvironments = ["production"];
  let ruleTriggerFilters: Array<Record<string, unknown>> = [];
  const rule = {
    id: "00000000-0000-4000-8000-000000000030",
    name: "Payment completion within 15m",
    description: "Payment must complete before its deadline.",
    triggerEvent: "payment.authorized",
    expectedEvents: ["payment.completed"],
    operator: "all",
    severity: "high",
    timeoutValue: 15,
    timeoutUnit: "minutes",
    updatedAt: "2026-07-24T08:00:00.000Z",
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/login" && request.method() === "POST") {
      await page.context().addCookies([
        {
          name: "tg_access",
          value: "playwright-session",
          domain: "localhost",
          path: "/",
        },
      ]);
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (path === "/auth/me") {
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (path === "/dashboard/overview") {
      await route.fulfill({ status: 200, json: dashboard });
      return;
    }
    if (path === "/dashboard/violations") {
      await route.fulfill({ status: 200, json: [violationSummary] });
      return;
    }
    if (path.startsWith("/violations/")) {
      await route.fulfill({
        status: 200,
        json: {
          id: violationSummary.id,
          workflowId: violationSummary.workflowId,
          ruleId: violationSummary.ruleId,
          severity: "critical",
          reason: violationSummary.explanation,
          occurredAt: violationSummary.occurredAt,
          details: { type: violationSummary.type },
          rule: {
            id: violationSummary.ruleId,
            name: violationSummary.ruleName,
            triggerEvent: violationSummary.triggerEventName,
            expectedEvents: violationSummary.affectedEventNames,
            operator: "all",
          },
        },
      });
      return;
    }
    if (path === "/events" && request.method() === "POST") {
      const input = request.postDataJSON() as {
        name: string;
        description: string;
        metadata: Record<string, unknown>;
      };
      await route.fulfill({
        status: 201,
        json: {
          id: "00000000-0000-4000-8000-000000000040",
          name: input.name,
          description: input.description,
          metadata: input.metadata,
          createdAt: "2026-07-24T08:00:00.000Z",
          updatedAt: "2026-07-24T08:00:00.000Z",
        },
      });
      return;
    }
    if (path === "/events") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (path === `/rules/${rule.id}/status` && request.method() === "PATCH") {
      const input = request.postDataJSON() as { enabled: boolean };
      ruleEnabled = input.enabled;
      await route.fulfill({
        status: 200,
        json: { ...rule, enabled: ruleEnabled },
      });
      return;
    }
    if (path === `/rules/${rule.id}` && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        json: {
          ...rule,
          enabled: ruleEnabled,
          correlationKey: ruleCorrelationKey,
          environments: ruleEnvironments,
          triggerFilters: ruleTriggerFilters,
          triggerEventDefinition: {
            id: "00000000-0000-4000-8000-000000000041",
            name: rule.triggerEvent,
            metadata: { displayName: "Payment authorized" },
          },
          expectedEventDefinitions: [
            {
              id: "00000000-0000-4000-8000-000000000042",
              name: rule.expectedEvents[0],
              metadata: { displayName: "Payment completed" },
            },
          ],
        },
      });
      return;
    }
    if (path === `/rules/${rule.id}` && request.method() === "PATCH") {
      const input = request.postDataJSON() as {
        name: string;
        description?: string;
        triggerEvent: string;
        expectedEvents: string[];
        triggerFilters: Array<Record<string, unknown>>;
        correlationKey: string;
        environments: string[];
        operator: "any" | "all" | "sequence" | "forbid";
        severity: "low" | "medium" | "high" | "critical";
        timeoutValue: number;
        timeoutUnit: "seconds" | "minutes" | "hours" | "days";
        enabled: boolean;
      };
      rule.name = input.name;
      rule.description = input.description ?? "";
      rule.triggerEvent = input.triggerEvent;
      rule.expectedEvents = input.expectedEvents;
      rule.operator = input.operator;
      rule.severity = input.severity;
      rule.timeoutValue = input.timeoutValue;
      rule.timeoutUnit = input.timeoutUnit;
      ruleEnabled = input.enabled;
      ruleCorrelationKey = input.correlationKey;
      ruleEnvironments = input.environments;
      ruleTriggerFilters = input.triggerFilters;
      await route.fulfill({
        status: 200,
        json: {
          ...rule,
          enabled: ruleEnabled,
          correlationKey: ruleCorrelationKey,
          environments: ruleEnvironments,
          triggerFilters: ruleTriggerFilters,
        },
      });
      return;
    }
    if (path === `/rules/${rule.id}` && request.method() === "DELETE") {
      ruleEnabled = false;
      ruleDeleted = true;
      await route.fulfill({ status: 204 });
      return;
    }
    if (path === "/rules") {
      await route.fulfill({
        status: 200,
        json: ruleDeleted ? [] : [{ ...rule, enabled: ruleEnabled }],
      });
      return;
    }
    if (path === "/workflows") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (path === "/workflows/stream") {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "heartbeat" })}\n\n`,
      });
      return;
    }
    if (path === "/investigations") {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: "00000000-0000-4000-8000-000000000050",
            violationId: violationSummary.id,
            workflowId: violationSummary.workflowId,
            ruleId: violationSummary.ruleId,
            status: "completed",
            summary: "Decision worker latency increased.",
            confidence: "high",
            topContributor: "decision-worker",
            dataGapCount: 0,
            evidenceCount: 1,
            report: null,
            createdAt: "2026-07-24T07:00:00.000Z",
            updatedAt: "2026-07-24T07:05:00.000Z",
          },
        ],
      });
      return;
    }
    if (path === "/comparisons") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (path === "/platform-health") {
      await route.fulfill({
        status: 200,
        json: {
          status: "healthy",
          generatedAt: "2026-07-24T08:00:00.000Z",
          metrics: {
            eventsIngested: 120,
            queueBacklog: 0,
            investigationFailures: 0,
          },
          connections: [],
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { message: "Not mocked" } });
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.clear());
  await mockApi(page);
  if (!testInfo.title.startsWith("login validation")) {
    await page.context().addCookies([
      {
        name: "tg_access",
        value: "playwright-session",
        domain: "localhost",
        path: "/",
      },
    ]);
  }
});

test("login validation and API success", async ({ page }) => {
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
  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/events") && request.method() === "POST",
  );
  await eventDialog.getByRole("button", { name: "Create and select" }).click();
  expect((await createRequest).postDataJSON()).toMatchObject({
    name: "invoice.created",
  });
  if (await propertiesPane.isVisible()) await propertiesPane.click();
  await expect(page.getByLabel("Rule name")).toHaveValue(
    "Invoice reconciliation policy",
  );
});

test("disable, enable, and soft delete a rule", async ({ page }) => {
  await page.goto("/rules");
  await expect(
    page.getByText("Payment completion within 15m", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Disable Payment completion within 15m",
    })
    .click();
  await expect(page.getByText("paused", { exact: true })).toBeVisible();

  await page
    .getByRole("button", {
      name: "Enable Payment completion within 15m",
    })
    .click();
  await expect(page.getByText("active", { exact: true })).toBeVisible();

  await page
    .getByRole("button", {
      name: "Delete Payment completion within 15m",
    })
    .click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete rule?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete rule" }).click();
  await expect(
    page.getByText("Payment completion within 15m", { exact: true }),
  ).not.toBeVisible();
});

test("edit mode updates an existing rule instead of creating one", async ({
  page,
}) => {
  const ruleId = "00000000-0000-4000-8000-000000000030";
  await page.goto(`/explore?rule=${ruleId}`);

  await expect(page.getByRole("heading", { name: "Edit rule" })).toBeVisible();
  const propertiesPane = page.getByRole("button", { name: "properties" });
  if (await propertiesPane.isVisible()) await propertiesPane.click();
  await expect(page.getByLabel("Rule name")).toHaveValue(
    "Payment completion within 15m",
  );
  await page.getByLabel("Rule name").fill("Updated payment completion");

  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/api/rules/${ruleId}`) &&
      request.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Update rule" }).click();
  expect((await updateRequest).postDataJSON()).toMatchObject({
    name: "Updated payment completion",
    correlationKey: "payment.id",
  });
  await expect(page.getByText("Rule updated.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`rule=${ruleId}`));
});

test("investigations render persisted records without mock mode", async ({
  page,
}) => {
  await page.goto("/investigations");
  await expect(
    page.getByRole("heading", { name: "Investigations" }),
  ).toBeVisible();
  await expect(
    page.getByText("Decision worker latency increased."),
  ).toBeVisible();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
});

test("platform health renders live API metrics", async ({ page }) => {
  await page.goto("/observability?view=health");
  await expect(
    page.getByRole("heading", { name: "Observability" }),
  ).toBeVisible();
  await expect(page.getByText("healthy", { exact: true })).toBeVisible();
  await expect(page.getByText("120", { exact: true })).toBeVisible();
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
