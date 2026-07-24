# TemporalGuard Product Requirements Document

**Document status:** Implementation-ready  
**Release:** Frontend Foundation + Authentication  
**Product category:** Business workflow observability  
**Primary interface inspiration:** Dense product analytics plus technical observability, without copying another product's visual identity  
**Backend context:** Existing NestJS + TypeORM application in the monorepo

---

## 1. Product Summary

TemporalGuard is a business-process reliability platform. It lets teams define time-bound promises over events and detect when real workflows do not reach an acceptable outcome.

A rule may say:

> When `document.uploaded` occurs, `document.scan_completed` and `document.verification_completed` must occur within ten minutes for the same `document.id`.

Traditional observability may show healthy servers and successful HTTP responses while the actual business process remains unfinished. TemporalGuard provides a product-analytics experience for discovering failed or slow workflows and an observability experience for investigating the technical evidence behind them.

The first release covered by this PRD creates a polished frontend and the minimum backend authentication foundation. Product data must use a well-structured mock layer for now, while all component and type boundaries remain ready for later API integration.

---

## 2. Problem

Distributed workflows fail in ways that ordinary uptime, request-error, and resource dashboards do not capture:

- A process starts but never reaches a terminal event.
- Required steps complete in the wrong order.
- Only some required steps happen.
- A forbidden event occurs after a policy change.
- A workflow finishes, but only after its business deadline.
- A user sees a successful request while an asynchronous worker silently stops.
- Engineers know a workflow violated a promise but cannot quickly connect it to relevant traces, logs, services, or deployments.

Teams need a clear interface for expressing workflow expectations, measuring their reliability, inspecting affected instances, and eventually linking violations to SigNoz evidence.

---

## 3. Product Vision

TemporalGuard should feel like:

- A product-analytics application when users explore events, funnels, completion rates, durations, segments, and paths.
- An observability application when users inspect workflow timelines, violations, services, trace references, logs, and deployment context.
- A policy builder when users define rules visually.

The experience should move naturally through:

`health summary → analysis → affected cohort → individual workflow → violation explanation → technical evidence`

---

## 4. Target Users

### 4.1 Platform and backend engineers

They need to verify that asynchronous and distributed operations complete correctly.

### 4.2 SRE and reliability engineers

They need alerts and investigation context for failures that are invisible to service-level health checks.

### 4.3 Product and operations teams

They need to understand where real business processes stall and which users, customers, regions, or versions are affected.

### 4.4 Compliance and security teams

They need to verify time-bound obligations such as access revocation, account deletion, consent enforcement, or document scanning.

---

## 5. Goals

### 5.1 Product goals

- Present workflow health in a clear, advanced analytics interface.
- Allow users to define rules from known events.
- Allow users to create missing event definitions inline while building a rule.
- Support the four initial operators: `any`, `all`, `sequence`, and `forbid`.
- Make the frontend realistic, responsive, accessible, and visually deliberate.
- Provide detailed loading, empty, success, partial, error, and retry states.
- Keep product features mock-backed while preserving future API compatibility.
- Add secure authentication endpoints to the existing NestJS backend.
- Support workspace/business logo upload through Cloudinary during signup.
- Preserve the existing local SigNoz setup and document a clean cloud/local switch.

### 5.2 Engineering goals

- Use established module boundaries rather than page-local business logic.
- Keep server state in TanStack Query and UI state in Zustand.
- Use React Hook Form and Zod for all forms.
- Centralize themes, chart tokens, spacing, status colors, and motion.
- Make mock data deterministic and scenario-driven.
- Add testable data-source interfaces so real APIs can replace mocks later.
- Avoid unnecessary client components and excessive animation.
- Maintain strict TypeScript and avoid `any` except at external library boundaries with explicit narrowing.

---

## 6. Non-goals for This Release

The following are explicitly outside this phase:

- Connecting dashboard, workflow, event, violation, or rule pages to live backend endpoints.
- Querying SigNoz Cloud or self-hosted SigNoz from the frontend.
- Implementing the complete TemporalGuard event-ingestion or rule-evaluation engine.
- Implementing Monnify. Monnify is unrelated to the current product slice and must remain deferred.
- Implementing Telegram delivery. The UI may reserve a future notification-channel placeholder, but no Telegram package or API is required.
- Billing, subscriptions, invitations, multi-role authorization, SSO, audit exports, or organisation administration.
- Automatic remediation.

---

## 7. Scope Overview

### 7.1 Frontend pages

- Login.
- Signup.
- Authenticated application shell.
- Overview dashboard.
- Live workflows.
- Workflow list and workflow detail drawer/page.
- Violations explorer.
- Violation detail drawer/page.
- Explore / Query Builder.
- Rules list and Rule Studio entry points needed by the Query Builder.

### 7.2 Backend work

Only the authentication and signup foundation:

- Register workspace owner.
- Login.
- Refresh session.
- Logout.
- Current-user endpoint.
- Cloudinary-backed business logo upload.
- Secure password handling.
- Required TypeORM migrations and entities, adapted to existing repository conventions.

### 7.3 Data mode

- Auth backend endpoints are real.
- Frontend auth screens should use an adapter boundary and default to mock behavior in this phase unless the repository already has a working auth integration that can be preserved safely.
- All observability/product data is mock-backed.
- No product API integration should be introduced accidentally.

---

## 8. Authentication Requirements

### 8.1 Signup fields

- First name.
- Last name.
- Email.
- Password.
- Business/workspace name.
- Business logo image.
- Terms checkbox if the repository already has legal routes; otherwise display a non-blocking placeholder link.

### 8.2 Signup behavior

- Use `multipart/form-data` on the backend endpoint because a logo may be included.
- Validate logo MIME type, file size, and dimensions where practical.
- Upload through a backend Cloudinary service; never expose the Cloudinary API secret to the browser.
- Create the business/workspace and owner user in one database transaction.
- Normalize email and enforce case-insensitive uniqueness.
- Hash passwords with the repository's secure existing choice; if absent, use Argon2id.
- Return a safe user and workspace representation without password or token hashes.
- Handle duplicate email, rejected file, upload failure, partial transaction failure, weak password, and database conflict clearly.

### 8.3 Login behavior

- Email and password.
- Show password control.
- Remember-me presentation may exist, but it must not imply insecure permanent tokens.
- Support access and rotating refresh tokens on the backend.
- Prefer secure, HTTP-only, same-site cookies if consistent with existing deployment topology.
- Rate-limit auth endpoints using existing platform conventions.
- Return stable machine-readable error codes.

### 8.4 Auth UI states

- Initial.
- Client validation error.
- Upload preview.
- Upload processing.
- Submission loading.
- Success transition.
- Duplicate-email error.
- Invalid-credentials error.
- Network/server error.
- Disabled controls during submission.
- Keyboard and screen-reader accessible status messages.

---

## 9. Application Shell

### 9.1 Persistent sidebar

Navigation:

- Overview.
- Live.
- Workflows.
- Violations.
- Explore.
- Rules.
- Alerts placeholder.
- Integrations placeholder.
- Settings placeholder.

Only the in-scope routes must be fully implemented. Deferred routes should be clearly marked and must not appear as broken destinations.

### 9.2 Global top bar

- Workspace/project selector.
- Environment selector.
- Time range selector.
- Compare control.
- Live mode indicator/control.
- Search and command palette.
- Theme switch.
- Notifications placeholder.
- User menu.

### 9.3 Global context

Selected environment, time range, comparison, and filters should persist in the URL where sensible. Do not hide important analytical state only in memory.

---

## 10. Overview Dashboard

### 10.1 Summary metrics

- Workflow health status.
- Completion rate.
- Active workflows.
- Near-deadline workflows.
- Violations.
- Median and p95 completion duration.

Each card must have:

- Current value.
- Comparison delta.
- Sparkline or trend indicator where useful.
- Tooltip explaining calculation.
- Click-to-filter or click-to-explore behavior.
- Skeleton loading state.

### 10.2 Primary reliability chart

Modes:

- Volume.
- Completion rate.
- Violations.
- Duration.

Support:

- Time granularity switching.
- Hover details.
- Comparison period.
- Deployment annotations in mock data.
- Click-through to affected workflows.

### 10.3 Workflow funnel

Example:

`application.submitted → documents.verified → review.completed → decision.issued`

Allow:

- Step selection from the Event Catalogue.
- Conversion and drop-off percentages.
- Completion window.
- Breakdown selector.
- View dropped workflows.
- Save analysis action.

### 10.4 Deadline pressure

Display workflow counts by remaining time:

- Less than 5 minutes.
- Less than 15 minutes.
- Less than 1 hour.
- Overdue.

### 10.5 Violation heatmap

Breakdown options:

- Rule.
- Workflow type.
- Service.
- Environment.
- Region.
- Deployment version.

### 10.6 Recent violations table

Columns:

- Severity/status.
- Violation explanation.
- Workflow ID.
- Rule.
- Overdue duration.
- Last observed event.
- Service.
- Deployment.
- Timestamp.

Open a detail drawer without losing dashboard context.

---

## 11. Live Workflows

- Real-time visual treatment using deterministic mock polling or simulated updates.
- Tabs: all, waiting, near deadline, overdue, completed.
- Search by workflow ID, event, rule, service, or entity.
- Filter chips.
- Configurable columns.
- Sorting by deadline urgency.
- Pause/resume live updates.
- New/changed rows animate subtly without layout instability.
- Detail drawer includes status, rule progress, time remaining, events, attributes, and future SigNoz deep-link placeholder.

---

## 12. Workflow Details

### 12.1 Header

- Workflow type and ID.
- State.
- Rule.
- Started time.
- Deadline or completion time.
- Environment.
- Trace reference placeholder.
- Copy-link action.

### 12.2 Visual timeline

States:

- Completed.
- Current.
- Expected.
- Missed.
- Forbidden.
- Inferred/future evidence link.

### 12.3 Evidence tabs

- Timeline.
- Trace preview.
- Logs preview.
- Metrics preview.
- Rule evaluation.
- Attributes.

Data is mocked, but components must use typed models matching future API contracts.

---

## 13. Violations Explorer

### 13.1 Query controls

Filter by:

- Rule.
- Severity.
- Workflow type.
- Environment.
- Status.
- Service.
- Missing/forbidden event.
- Overdue duration.
- Deployment.
- Time range.

### 13.2 Views

- Trend.
- Table.
- Groups.
- Heatmap.
- Impact.

### 13.3 Violation detail

Explain:

- Trigger event.
- Expected or forbidden condition.
- Correlation key.
- Deadline.
- What was observed.
- Last successful event.
- How overdue it is.
- Similar violations.
- Supporting technical evidence, clearly labeled as correlation rather than proven root cause.

---

## 14. Event Catalogue

The Event Catalogue is central to the Query Builder.

### 14.1 Existing event selection

Every event selector must support:

- Search by display name, canonical name, domain, description, or attribute.
- Recent events.
- Frequently used events.
- Domain grouping.
- Source/service indication.
- Already-used indicator inside the current rule.
- Keyboard navigation.
- Virtualization if the event list becomes large.

### 14.2 Inline event creation

When the user's search does not match an existing event, show:

> Create `event.name`

Selecting it opens an inline popover, drawer, or modal without discarding the draft rule.

Required event fields:

- Canonical name, using dot notation such as `document.scan_completed`.
- Display name.
- Domain/category.
- Description.
- Source service.
- Correlation/entity key suggestion, such as `document.id`.
- Optional attribute schema.

Attribute schema entry fields:

- Key.
- Label.
- Type: string, number, boolean, timestamp, enum, or identifier.
- Required flag.
- Sensitive flag.
- Description.
- Enum values where applicable.

Creation behavior:

- Validate canonical naming.
- Detect exact and near duplicates.
- Warn when the new event differs only by punctuation, tense, or casing.
- Preserve the rule draft if creation is cancelled or fails.
- Add a successfully created event immediately to the catalogue and select it in the current builder node.
- In mock mode, persist custom events in browser storage with an explicit schema version.
- Provide a reset-to-seed-data developer action.

### 14.3 Event details preview

Before selecting an event, users can inspect:

- Description.
- Source service.
- First and latest seen timestamps.
- Example attributes.
- Usage count.
- Existing rules using the event.
- Suggested correlation keys.

These values are mocked in the current phase.

---

## 15. Query Builder and Rule Studio

### 15.1 Purpose

Users construct a temporal rule using events from the catalogue or create events inline.

### 15.2 Rule structure

A rule contains:

- Name.
- Description.
- Trigger event.
- Optional trigger filters.
- Operator.
- Expected/forbidden events.
- Correlation key.
- Deadline/window.
- Severity.
- Environment scope.
- Status: draft, active, paused.
- Version metadata.

### 15.3 Supported operators

#### `any`

At least one selected outcome must happen within the window.

Example:

`delivery.picked_up → any(delivery.delivered, delivery.returned, delivery.failed) within 24h`

#### `all`

Every selected outcome must happen within the window. Order is not enforced.

Example:

`employee.offboarding_started → all(access.email_revoked, access.cloud_revoked, access.source_control_revoked) within 4h`

#### `sequence`

Every selected event must happen in the configured order within the window.

Example:

`video.uploaded → sequence(video.scan_completed, video.transcoded, video.published) within 30m`

Support drag-and-drop or accessible move controls for reordering. Dragging cannot be the only interaction method.

#### `forbid`

A selected event must not happen for the configured period after the trigger.

Example:

`consent.withdrawn → forbid(marketing_data.processed) for 365d`

### 15.4 Builder layout

Use an advanced three-region layout on desktop:

- Left: building blocks and event catalogue.
- Center: rule canvas or sentence builder.
- Right: properties, validation, and test preview.

On smaller screens, use tabs or stacked drawers without losing the draft.

### 15.5 Sentence builder

Provide a readable representation:

> When **Document uploaded** happens, require **all** of **Virus scan completed** and **Verification completed** within **10 minutes**, correlated by **document.id**.

The sentence and visual builder must represent the same source of truth.

### 15.6 Validation

Prevent activation when:

- Trigger is missing.
- No outcome event is selected.
- Trigger and outcome are invalidly identical.
- Correlation key is missing.
- Window is zero, negative, or unsupported.
- `sequence` has fewer than two steps.
- Duplicate steps exist where they are meaningless.
- A sensitive attribute is selected as a visible grouping label without warning.

Warn, but do not necessarily block, when:

- Expected events have never been seen.
- Correlation keys differ across selected events.
- The proposed rule likely matches no workflows.
- The window is much shorter than observed p95 duration.

### 15.7 Historical test preview

Use mock results:

- Workflows evaluated.
- Would complete.
- Would violate.
- Would remain open.
- Median completion duration.
- Sample matches.

The preview must clearly say it is simulated/mock data in this release.

### 15.8 Draft persistence

- Auto-save locally after a short debounce.
- Show saved/saving status.
- Recover drafts after refresh.
- Version local draft schema.
- Handle corrupt or outdated stored data gracefully.

---

## 16. Visual and Interaction Requirements

- Use the tokens in `docs/design.md`.
- Purple is the primary brand color.
- Support light, dark, and system theme.
- The application should be dense but not cramped.
- Use restrained radii, thin borders, deliberate typography, and high-quality chart treatment.
- Avoid excessive gradients, glassmorphism, random floating cards, huge empty hero blocks inside the authenticated app, decorative blobs, and inconsistent shadows.
- The interface must not look generated from a generic SaaS template.
- Use Lucide icons with consistent stroke weight.
- Framer Motion is the default motion system.
- Use GSAP only for a small number of timeline/chart transitions that clearly benefit from sequencing; do not use GSAP and Framer Motion on the same element.
- Respect `prefers-reduced-motion`.

---

## 17. Loading, Empty, Error, and Partial States

Every data surface must define:

- Initial skeleton.
- Background refresh indicator that does not blank existing data.
- Empty state with a useful next action.
- Filtered-empty state distinct from no-data state.
- Error state with retry.
- Partial-data state where one widget fails but the page remains usable.
- Permission/deferred state where applicable.
- Slow request behavior without duplicate submissions.

Charts should render stable skeleton geometry to avoid layout shift.

---

## 18. Accessibility

- WCAG 2.2 AA target.
- Full keyboard access.
- Visible focus states in both themes.
- Minimum 44px touch targets where practical.
- Color is never the only state indicator.
- Charts have textual summaries or accessible data tables.
- Drawers and dialogs manage focus and restore it correctly.
- Form errors associate with fields.
- Live updates use polite announcements and avoid constant screen-reader interruption.
- Drag interactions have keyboard alternatives.

---

## 19. Responsive Behavior

### Desktop

- Persistent sidebar.
- Three-pane Query Builder.
- Dense tables.
- Side drawers.

### Tablet

- Collapsible sidebar.
- Two-pane builder or canvas plus properties drawer.
- Configurable table columns.

### Mobile

- Bottom or drawer navigation.
- Stacked dashboard cards.
- Scrollable chart regions with summaries.
- Query Builder becomes step-based tabs while preserving all draft data.
- Tables use card rows or prioritized columns, not unreadably compressed grids.

---

## 20. Frontend Technology Requirements

Required:

- Next.js.
- TypeScript.
- Tailwind CSS.
- TanStack Query.
- React Hook Form.
- Zod.
- Zustand.
- Framer Motion.
- Lucide React.
- shadcn/ui components adapted to the custom design system.

Recommended where not already present:

- Recharts for product charts.
- `next-themes` for theme management.
- MSW for API-compatible frontend mocks.
- Vitest and React Testing Library for unit/component tests.
- Playwright for E2E and visual interaction testing.

Do not install duplicate solutions if the repository already has accepted equivalents.

---

## 21. State Management Rules

### TanStack Query

Use for:

- Dashboard data.
- Events catalogue.
- Workflows.
- Violations.
- Rules.
- Historical test results.
- Auth user/session query when integration is enabled.

### Zustand

Use only for cross-page client/UI state such as:

- Sidebar state.
- Command palette.
- Live-update pause state.
- Builder UI selection when it should not be in the URL or form state.

Do not mirror server data into Zustand.

### React Hook Form

Use for:

- Login.
- Signup.
- Event creation.
- Query/rule construction.
- Filters that represent submitted forms.

### URL state

Use for shareable analytical context:

- Time range.
- Environment.
- Compare mode.
- Filters.
- View type.
- Selected workflow/violation where appropriate.

---

## 22. SigNoz Local and Cloud Readiness

The current repository reportedly supports local SigNoz through Docker. Preserve it unless it is broken.

The architecture must support a configuration switch:

- `SIGNOZ_MODE=local`
- `SIGNOZ_MODE=cloud`

No live SigNoz integration is required in this release. Still, centralize future values such as:

- UI/deep-link base URL.
- OTLP endpoint.
- Cloud ingestion key on server/collector only.
- Optional API key for future server-side queries, never in browser code.

The frontend must not receive secrets.

---

## 23. Security Requirements

- No secrets in client bundles.
- Sanitize uploaded filenames and validate images.
- Avoid storing auth tokens in local storage.
- Use secure cookies where possible.
- CSRF strategy must match cookie/auth topology.
- Validate all backend DTOs.
- Apply auth rate limits.
- Do not log passwords, raw tokens, or Cloudinary secrets.
- Use transactions for user/workspace creation.
- Store refresh token hashes, not raw refresh tokens, if refresh sessions are implemented.
- Use safe error messages without account enumeration where appropriate.

---

## 24. Performance and Scalability Expectations

- Prefer server components for static layout and non-interactive shells.
- Isolate client boundaries around charts, forms, live data, and drawers.
- Lazy-load expensive chart/builder components.
- Virtualize long event and workflow lists.
- Debounce search and draft persistence.
- Avoid rerendering the entire builder for one field change.
- Memoize derived chart data where meaningful, not indiscriminately.
- Keep mock API shapes paginated and cursor-ready.
- Simulate background refresh without replacing stable data.
- Ensure animations do not block interaction.

---

## 25. Mock Data Requirements

Create deterministic scenarios:

- Healthy document verification.
- Missing scan completion.
- Slow application decision.
- Partial employee access revocation.
- Forbidden marketing processing after consent withdrawal.
- Out-of-order video processing.
- Deployment health check missing.
- Completed, waiting, near-deadline, overdue, and recovered workflows.

The mock layer should support:

- Pagination.
- Filtering.
- Sorting.
- Time ranges.
- Comparisons.
- Polling/live updates.
- Controlled errors.
- Empty datasets.
- Slow responses.

---

## 26. Acceptance Criteria

The release is acceptable when:

- The design system is updated and applied consistently in light and dark mode.
- Login and signup are complete, responsive, validated, and accessible.
- Signup includes a logo picker, preview, validation, and loading/error states.
- NestJS auth endpoints, entities, migration, Cloudinary service, and tests exist without breaking the current backend.
- The authenticated shell and all in-scope dashboard routes work with typed mock data.
- Query Builder supports `any`, `all`, `sequence`, and `forbid`.
- Every event selector uses the shared Event Catalogue.
- Users can create an event inline and immediately use it in the active rule.
- Draft rules survive refresh.
- Dashboard widgets have skeleton, empty, error, and retry states.
- Core paths are covered by automated tests.
- No real product API integration was accidentally added.
- Environment examples and Docker instructions are documented.
- Codex produces a final implementation report listing files changed, commands run, tests, assumptions, environment variables, and remaining work.

---

## 27. Definition of Done

- Typecheck passes.
- Lint passes.
- Unit/component tests pass.
- Playwright smoke tests pass.
- Production frontend build passes.
- Backend build and auth tests pass.
- No obvious console errors or hydration warnings.
- Keyboard navigation works through auth and Query Builder.
- Both themes pass a visual review at mobile, tablet, and desktop widths.
- Docker build succeeds for changed applications.
- Documentation reflects the final implementation rather than intended behavior.
