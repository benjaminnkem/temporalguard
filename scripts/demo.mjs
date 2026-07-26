const baseUrl = (
  process.env.TEMPORALGUARD_URL ?? "http://localhost:8088"
).replace(/\/+$/, "");
const password = process.env.DEMO_PASSWORD ?? "TemporalGuard2026";
const email = process.env.DEMO_EMAIL ?? "demo@temporalguard.local";
let cookie = "";

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length) {
    cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  }
  const body =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function authenticate(
  userEmail = email,
  businessName = "TemporalGuard Demo",
) {
  const form = new FormData();
  form.set("firstName", "Demo");
  form.set("lastName", "Operator");
  form.set("email", userEmail);
  form.set("password", password);
  form.set("businessName", businessName);
  try {
    await request("/auth/register", { method: "POST", body: form });
  } catch {
    await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: userEmail, password }),
    });
  }
}

async function ensureEvent(name) {
  return request("/events", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: `Demo event ${name}`,
      metadata: { source: "temporalguard-demo" },
    }),
  });
}

async function ensureRule() {
  const rules = await request("/rules");
  const existing = rules.find(
    (rule) => rule.name === "Demo payment completion",
  );
  if (existing) return existing;
  return request("/rules", {
    method: "POST",
    body: JSON.stringify({
      name: "Demo payment completion",
      description: "A demo payment must complete within two seconds.",
      triggerEvent: "demo.payment.started",
      expectedEvents: ["demo.payment.completed"],
      operator: "all",
      timeoutValue: 2,
      timeoutUnit: "seconds",
      severity: "high",
      correlationKey: "workflow.id",
      environments: ["demo"],
      enabled: true,
    }),
  });
}

async function ingest(
  eventName,
  externalWorkflowId,
  timestamp = new Date().toISOString(),
) {
  return request("/event-logs", {
    method: "POST",
    body: JSON.stringify({
      eventName,
      externalWorkflowId,
      timestamp,
      payload: {
        environment: "demo",
        "service.name": "demo-checkout",
        "service.version": "2026.07.25",
      },
    }),
  });
}

async function staleTriggerDemo() {
  const externalWorkflowId = `stale-${Date.now()}`;
  const occurredAt = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  const result = await ingest(
    "demo.payment.started",
    externalWorkflowId,
    occurredAt,
  );
  const workflow = result.workflows?.[0];
  if (!workflow) throw new Error("Stale trigger did not create a workflow");
  if (
    workflow.status !== "waiting" ||
    new Date(workflow.deadline).getTime() <=
      new Date(workflow.createdAt).getTime()
  ) {
    throw new Error(
      `Stale trigger created an invalid live deadline: ${JSON.stringify({
        status: workflow.status,
        createdAt: workflow.createdAt,
        deadline: workflow.deadline,
      })}`,
    );
  }
  await ingest("demo.payment.completed", externalWorkflowId);
  const completed = await request(`/workflows/${workflow.id}`);
  if (completed.status !== "completed") {
    throw new Error(
      `Stale trigger workflow did not complete: ${completed.status}`,
    );
  }
  console.log(
    `Stale trigger preserved occurrence time and completed live workflow: ${workflow.id}`,
  );
}

async function successfulDemo() {
  const workflowId = `success-${Date.now()}`;
  await ingest("demo.payment.started", workflowId);
  await ingest("demo.payment.completed", workflowId);
  console.log(`Successful demo completed: ${workflowId}`);
}

async function failedDemo() {
  const workflowId = `failed-${Date.now()}`;
  const before = await request("/violations");
  await ingest("demo.payment.started", workflowId);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const violations = await request("/violations");
    const created = violations.find(
      (violation) => !before.some((previous) => previous.id === violation.id),
    );
    if (created) {
      console.log(`Failed demo produced violation: ${created.id}`);
      return created;
    }
  }
  throw new Error("Failed demo did not produce a violation within 30 seconds");
}

async function investigate(violation) {
  const investigation = await request("/investigations", {
    method: "POST",
    body: JSON.stringify({
      violationId: violation.id,
      idempotencyKey: `demo-${violation.id}`,
    }),
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const current = await request(`/investigations/${investigation.id}`);
    if (
      ["completed", "completed_with_gaps", "cancelled", "dead_letter"].includes(
        current.status,
      )
    ) {
      console.log(
        `Investigation ${current.id} finished with status ${current.status} and ${current.evidenceCount} evidence records`,
      );
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Investigation did not finish within 120 seconds");
}

async function crossCompany(violation) {
  cookie = "";
  await authenticate("second-company@temporalguard.local", "Second Company");
  const response = await fetch(`${baseUrl}/api/violations/${violation.id}`, {
    headers: { cookie, accept: "application/json" },
  });
  if (response.status !== 404) {
    throw new Error(
      `Cross-company isolation failed: expected 404, received ${response.status}`,
    );
  }
  console.log("Cross-company isolation verified with a 404 response");
}

const mode = process.argv[2] ?? "all";
await authenticate();
await ensureEvent("demo.payment.started");
await ensureEvent("demo.payment.completed");
await ensureRule();
if (mode === "success") await successfulDemo();
else if (mode === "stale") await staleTriggerDemo();
else {
  if (mode === "all") {
    await staleTriggerDemo();
    await successfulDemo();
  }
  const violation = await failedDemo();
  if (mode === "failed") process.exit(0);
  await investigate(violation);
  await crossCompany(violation);
}
