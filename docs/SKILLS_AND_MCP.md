# Recommended Codex Skills and MCP Setup

No MCP server is mandatory to build TemporalGuard. A disciplined repository audit, tests, and the documents in this bundle matter more than installing many tools.

Install only tools Codex can actually use in your environment, grant minimum permissions, and never put credentials in committed configuration.

## 1. Strongly Recommended

### shadcn/ui MCP or shadcn skill

Purpose:

- Search the current shadcn registry.
- Inspect component implementation and documentation.
- Install only required primitives.
- Avoid inventing inaccessible alternatives to stable primitives.

Codex configuration documented by shadcn:

```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
```

Alternatively install the official shadcn skill if your Codex setup supports skills.

### Playwright CLI/skill or Playwright MCP

Purpose:

- Exercise auth and dashboard flows.
- Validate responsive layouts.
- Inspect accessibility snapshots.
- Capture visual-regression screenshots.
- Test Query Builder interactions.

For a coding agent, the official Playwright project notes that CLI plus skills may be more context-efficient than MCP. Use whichever mode is stable in your environment.

### GitHub MCP

Useful only when Codex needs remote repository, issue, pull-request, or Actions context. Restrict token scopes. Local code editing itself does not require GitHub MCP.

## 2. Recommended for This Stack

### Cloudinary Agent Skills

Cloudinary's current documentation provides official agent skills for implementing and validating uploads. This is useful for the NestJS logo-upload service and secure upload patterns.

Use it to verify:

- Server-side SDK configuration.
- Signed/direct upload tradeoffs.
- Upload responses.
- Public ID and cleanup handling.
- Image transformation/delivery.

Do not let a skill expose the API secret to frontend code.

### A project-specific TemporalGuard skill

Create a repository skill only after the architecture is confirmed. It should teach Codex:

- The data-source boundary.
- Rule operators and invariants.
- Event naming conventions.
- Theme/design rules.
- Test commands.
- Definition of done.

Keep repo-specific conventions in `AGENTS.md`; use a skill for repeatable specialized workflows such as “add a new analytics explorer” or “add a new rule operator.”

## 3. Optional

### SigNoz agent skills

Useful when implementing OpenTelemetry instrumentation, dashboards, alerts,
and MCP-assisted investigation. Product API work may prepare the backend
boundary, but live SigNoz querying remains out of scope unless explicitly
approved.

### Browser developer-tools MCP

Optional for performance/network inspection. Do not install both several browser MCPs unless each has a clear role.

### Figma MCP

Only useful if a Figma source file or design library exists. `docs/design.md` is sufficient for this phase.

### Documentation retrieval MCP

Optional when Codex's built-in browsing cannot reliably access current primary documentation. Prefer primary docs over generated summaries.

## 4. Not Recommended Now

- A database MCP with write access to production.
- A SigNoz read API key exposed to Codex without a concrete need.
- A Telegram MCP, because Telegram alerts are out of scope.
- A Monnify MCP, because payments are out of scope.
- Multiple competing UI registry MCPs.
- Tools that can deploy or mutate cloud infrastructure before local tests pass.

## 5. Suggested `AGENTS.md` Responsibilities

Codex should create or update a root `AGENTS.md` after auditing the repository. It should include:

- Monorepo commands.
- Application paths.
- Architecture boundaries.
- Design-system source of truth.
- Strict TypeScript and test requirements.
- API-backed product data with mocks limited to tests.
- Authentication and product-domain backend scope.
- No-secret policy.
- Product API contracts, migrations, and integration-test requirements.
- Required final report.

## 6. Tool Safety

- Commit no tokens or secrets.
- Prefer environment variables.
- Use read-only permissions where possible.
- Review third-party skill content before installing it.
- Pin or audit tool versions when the workflow becomes part of CI.
