# Frontend Experience

## 1. Objective

Extend the existing Mixpanel-inspired TemporalGuard UI with dense SigNoz-powered
investigation experiences.

Use the existing stack and `docs/design.md`.

---

## 2. Global controls

Persist:

- Company/project.
- Environment.
- Time range.
- Comparison period.
- Live state.
- Command palette.
- Theme.
- User menu.

Store analytical filters in URL search parameters.

---

## 3. Investigations list

Route:

```text
/investigations
```

Summary:

- Running.
- Completed.
- Completed with gaps.
- Failed.
- Median duration.
- Common contributor.

Table:

- Status.
- Rule.
- Workflow.
- Violation.
- Started.
- Duration.
- Confidence.
- Top contributor.
- Evidence count.
- Initiator.

Filters:

- Status.
- Rule.
- Workflow type.
- Environment.
- Confidence.
- Service.
- Version.
- Date.

---

## 4. Investigation detail

Route:

```text
/investigations/[id]
```

Header:

- Status.
- Confidence.
- Rule.
- Workflow.
- Environment.
- Time.
- Rerun.
- Cancel.
- Export.
- Open SigNoz.

Sections:

- Broken promise.
- Live agent timeline.
- Ranked contributors.
- Evidence Graph.
- Comparison.
- Telemetry quality.
- Related deployment.
- Raw traces/logs/metrics.
- Audit.

Every contributor must show evidence chips.

---

## 5. Evidence Graph

Use React Flow or existing graph library.

Modes:

- Business.
- Technical.
- Timeline.
- Table.

Features:

- Service grouping.
- Search.
- Fit view.
- Mini map.
- Node drawer.
- Missing node styling.
- Inferred edge confidence.
- Large graph truncation.
- Keyboard navigation.
- Accessible table.

---

## 6. Comparison workspace

Routes:

```text
/comparisons
/comparisons/[id]
```

Sentence builder:

```text
Compare [successful workflows]
with [violated workflows]
for [rule]
during [time range]
in [environment]
```

Views:

- Summary.
- Time series.
- Distribution.
- Difference table.
- Service/version matrix.
- Trace-path difference.
- Log-pattern frequency.
- Cohort members.

Show sample size and small-sample warnings.

---

## 7. Historical simulation

Integrate into Rule Studio.

Action:

```text
Test against historical data
```

Progress:

- Load events.
- Evaluate workflows.
- Enrich with SigNoz.
- Calculate duration.
- Finalize.

Result:

- Evaluated.
- Complete.
- Violate.
- Complete late.
- Completion rate.
- Percentiles.
- Suggested deadline.
- Samples.
- Service/version breakdown.
- Telemetry warning.

Preserve the rule draft.

---

## 8. Existing page upgrades

Workflow detail:

- Evidence Graph.
- Related traces/logs.
- Services and versions.
- Telemetry quality.
- Start investigation.
- Compare with successful.

Violation detail:

- Latest investigation.
- Start/rerun.
- Live progress.
- Evidence summary.
- Deployment.
- Comparison.
- SigNoz links.
- Recovery state.

---

## 9. Explorer

Route:

```text
/explorer
```

Tabs:

- Workflows.
- Traces.
- Logs.
- Services.
- Deployments.
- Telemetry gaps.

Use structured safe filters, never raw SQL.

Results:

- Virtualized table.
- Detail drawer.
- Open workflow.
- Open investigation.
- Open SigNoz.
- Copy safe IDs.

---

## 10. Deployments

Routes:

```text
/deployments
/deployments/[id]
```

Show:

- Service.
- Version.
- First observed.
- Environment.
- Workflow impact.
- Violation change.
- Duration change.
- Exceptions.
- Rules.
- Recommendation.
- Analyze action.

---

## 11. Observability

### Connection

```text
/observability/connection
```

- Mode.
- API URL.
- UI URL.
- Query health.
- OTLP health.
- Key status.
- Last validation.
- Test connection.

### Platform Health

```text
/observability/platform-health
```

- Ingestion.
- Queue backlog.
- Deadline drift.
- Investigation health.
- SigNoz query health.
- AI health.
- SSE health.

### Telemetry Quality

```text
/observability/telemetry-quality
```

- Overall score.
- Service/event/environment scores.
- Critical gaps.
- Trend.
- Recommended fixes.

### Assets

```text
/observability/assets
```

- Dashboard version.
- Alert version.
- Validate.
- Plan.
- Apply.
- Drift.
- Logs.

---

## 12. State ownership

TanStack Query:

- Investigations.
- Evidence.
- Comparisons.
- Simulations.
- Deployments.
- Connection.
- Quality.
- Explorer.
- Assets.

Zustand only for UI preferences such as:

- Collapsed navigation.
- Graph display.
- Local pane layout.

---

## 13. SSE client

- `Last-Event-ID`.
- Bounded reconnect.
- REST reconciliation.
- Duplicate prevention.
- Stale status.
- Query cache updates.
- Close on logout.

---

## 14. Loading and empty states

Loading:

- Page skeleton.
- Chart skeleton.
- Graph skeleton.
- Drawer skeleton.
- Stream placeholders.
- Background refresh.

Empty distinctions:

- No data.
- No filter matches.
- SigNoz disconnected.
- Outside retention.
- Investigation not started.
- AI unavailable.
- Sample too small.
- No deployment metadata.
- No telemetry gaps.

---

## 15. Errors

- Unauthorized.
- SigNoz unavailable.
- Invalid key.
- Query limit.
- Rate limit.
- Stream disconnected.
- Investigation failed.
- AI unavailable.
- Partial evidence.
- Export failed.
- Asset apply failed.

Preserve working sections during partial failure.

---

## 16. Accessibility

- Semantic HTML.
- Focus management.
- Keyboard graph.
- Table alternative.
- ARIA live progress.
- Reduced motion.
- Status labels beyond color.
- Chart summaries.
- Accessible tooltips.
- Minimum touch targets.

---

## 17. Responsive behavior

Desktop:

- Dense split panes.
- Persistent filters.
- Side evidence drawer.

Tablet:

- Collapsible detail pane.

Mobile:

- Stacked sections.
- Bottom sheets.
- Simplified graph.
- Reduced table columns.
- Full feature access.

---

## 18. Motion

Use motion for:

- Investigation steps.
- Drawers.
- Graph expansion.
- Comparison transitions.
- New violation.

Do not animate every incoming event or delay critical actions.

---

## 19. Tests

Component:

- Evidence citations.
- Graph selection.
- SSE reconnect.
- Partial failure.
- Comparison builder.
- Simulation progress.
- Connection form.
- Asset confirmation.
- Theme/accessibility.

Playwright:

- Complete demo.
- Mobile.
- Keyboard-only.
- Company isolation.
