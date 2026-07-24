<role>
You are an expert frontend engineer, UI/UX designer, visual design specialist, data-visualization designer, and typography expert. Integrate this design system into the existing TemporalGuard codebase in a maintainable and idiomatic way.

Before changing code:

- Identify the current Next.js, Tailwind, shadcn, typography, theme, chart, and component setup.
- Reuse established repository conventions where they are sound.
- Centralize tokens rather than scattering literal colors and dimensions.
- Treat this document as the source of truth for new TemporalGuard frontend work.
- Do not clone Mixpanel, SigNoz, Datadog, Grafana, or another application's exact layout or branding.
  </role>

<design-system>
# TemporalGuard Analytics Design System

## 1. Design Philosophy

TemporalGuard combines editorial confidence with analytical precision.

The original design direction uses bold typography, strict hierarchy, deliberate negative space, and a restrained palette. For the authenticated analytics application, preserve that discipline while adapting it to dense tables, charts, filters, event selectors, timelines, drawers, and rule-building tools.

### Core principles

1. **Clarity before decoration** — every visual element must explain state, hierarchy, urgency, or interaction.
2. **Dense, not cramped** — fit serious analytical information into the viewport while preserving scanability.
3. **Progressive disclosure** — summary first, evidence later.
4. **One purple identity** — purple expresses brand and interaction; semantic colors express status.
5. **Typography carries hierarchy** — avoid using a different card color for every section.
6. **Precision over spectacle** — restrained motion, thin borders, clear alignment, stable layouts.
7. **Light and dark are first-class** — neither theme is a simple inversion or afterthought.

### Product character

Confident. Analytical. Technical. Calm under pressure. Editorial without becoming a magazine layout. Advanced without becoming visually noisy.

Avoid:

- Generic gradient SaaS visuals.
- Excessive glassmorphism.
- Huge rounded cards everywhere.
- Decorative blobs.
- Random shadows and glows.
- Empty dashboard space created only to look premium.
- Over-animated charts.
- Purple used for every data series or status.

---

## 2. Color Tokens

Use semantic CSS variables compatible with Tailwind and shadcn. Store chart and status palettes separately from component tokens.

### 2.1 Light mode

```text
background:              #F8F7FC
foreground:              #17131F
surface:                 #FFFFFF
surfaceRaised:           #FFFFFF
surfaceSubtle:           #F2F0F8
muted:                   #F0EDF7
mutedForeground:         #6E687A
card:                    #FFFFFF
cardForeground:          #17131F
popover:                 #FFFFFF
popoverForeground:       #17131F
border:                  #DDD8E8
borderStrong:            #C9C1D8
input:                   #F6F4FA
primary:                 #6D3CF5
primaryHover:            #5D2CE5
primaryActive:           #4E20CF
primaryForeground:       #FFFFFF
primarySubtle:           #EEE9FF
primarySubtleForeground: #4B21B6
secondary:               #ECE9F3
secondaryForeground:     #2E2838
accent:                  #E9E3FF
accentForeground:        #4820AF
ring:                    #7C4DFF
success:                 #12825E
successSubtle:           #E5F6EF
warning:                 #A96808
warningSubtle:           #FFF4D8
destructive:             #C93F57
destructiveSubtle:       #FDECEF
info:                    #2369C7
infoSubtle:              #E8F1FF
```

### 2.2 Dark mode

```text
background:              #0B0911
foreground:              #F6F3FC
surface:                 #110E18
surfaceRaised:           #15111E
surfaceSubtle:           #1A1623
muted:                   #1C1726
mutedForeground:         #A9A1B6
card:                    #121019
cardForeground:          #F6F3FC
popover:                 #17131F
popoverForeground:       #F6F3FC
border:                  #2B2538
borderStrong:            #3B334B
input:                   #17131F
primary:                 #9A78FF
primaryHover:            #AC91FF
primaryActive:           #8762F0
primaryForeground:       #160C31
primarySubtle:           #261B43
primarySubtleForeground: #D9CEFF
secondary:               #211B2C
secondaryForeground:     #EAE5F3
accent:                  #2B1F4C
accentForeground:        #E0D7FF
ring:                    #A88BFF
success:                 #48C999
successSubtle:           #102E25
warning:                 #E4A63B
warningSubtle:           #34250F
destructive:             #F06B7C
destructiveSubtle:       #371820
info:                    #65A5F4
infoSubtle:              #132A45
```

### 2.3 Purple usage

Use purple for:

- Primary actions.
- Active navigation.
- Selected filters.
- Focus rings.
- Builder connectors and selected nodes.
- Brand marks.
- One primary chart series.

Do not use purple for:

- Every chart series.
- Errors, warnings, and success states.
- All table badges.
- Large page backgrounds.

### 2.4 Chart palette

Keep chart colors consistent across pages and themes. Verify contrast against both backgrounds.

```text
seriesPurple:    light #6D3CF5 / dark #9A78FF
seriesBlue:      light #2F6FED / dark #69A2FF
seriesCyan:      light #078CA0 / dark #4CC7D8
seriesGreen:     light #12825E / dark #48C999
seriesAmber:     light #B4750B / dark #E4A63B
seriesCoral:     light #D05668 / dark #F07B8B
seriesSlate:     light #718096 / dark #9AA6B6
chartGrid:       light #E8E4EF / dark #262130
chartAxis:       light #766F83 / dark #9D95AA
chartTooltip:    use popover tokens
```

### 2.5 Workflow status mapping

```text
completed:       success
waiting:         info or neutral blue
nearDeadline:    warning
violated:        destructive
forbiddenSeen:   destructive
paused:          muted
unknown:         slate
live:            cyan
```

Color must always be paired with label, icon, pattern, or shape.

### 2.6 Token implementation contract

All product colors must be exposed once as semantic CSS custom properties in
the web application's global token layer. Tailwind utilities, shadcn
primitives, charts, and motion components consume those variables; feature
components must not copy the hexadecimal values from this document.

Use the following naming groups:

```text
component:  --background, --foreground, --surface, --surface-raised,
            --surface-subtle, --card, --card-foreground, --popover,
            --popover-foreground, --muted, --muted-foreground, --border,
            --border-strong, --input, --primary, --primary-hover,
            --primary-active, --primary-foreground, --primary-subtle,
            --primary-subtle-foreground, --secondary,
            --secondary-foreground, --accent, --accent-foreground, --ring
semantic:   --success, --success-subtle, --warning, --warning-subtle,
            --destructive, --destructive-subtle, --info, --info-subtle
chart:      --chart-purple, --chart-blue, --chart-cyan, --chart-green,
            --chart-amber, --chart-coral, --chart-slate, --chart-grid,
            --chart-axis
geometry:   --radius-xs through --radius-xl, --sidebar-width,
            --sidebar-width-collapsed, --drawer-width
motion:     --motion-ease, --motion-micro, --motion-standard,
            --motion-panel, --motion-page
```

Use space-separated RGB/HSL channels only if the selected Tailwind version
needs alpha composition. Otherwise use complete color values. Do not maintain
parallel token definitions in TypeScript. Code that needs a computed chart
color reads the resolved CSS variable at the chart boundary.

---

## 3. Typography

### Font stacks

```text
UI:      "Inter", system-ui, sans-serif
Display: "Inter Tight", "Inter", system-ui, sans-serif
Mono:    "JetBrains Mono", "SFMono-Regular", monospace
```

Use Playfair Display only on a future marketing site, not inside the authenticated analytics application.

### Application scale

```text
xs:      0.75rem  / 1rem
sm:      0.8125rem / 1.125rem
base:    0.875rem / 1.375rem
md:      1rem / 1.5rem
lg:      1.125rem / 1.5rem
xl:      1.25rem / 1.625rem
2xl:     1.5rem / 1.875rem
3xl:     2rem / 2.25rem
4xl:     2.5rem / 2.75rem
```

### Usage

- Page title: 24–32px, tight tracking, 600–700 weight.
- Section heading: 16–20px, 600 weight.
- Metric value: 24–36px, tabular numerals.
- Body: 14px desktop, never below 13px for important content.
- Table text: 13–14px.
- Labels: 11–12px, medium weight, moderate tracking; avoid excessive all-caps.
- IDs, durations, timestamps, queries, event names: mono font.

Do not bring marketing-scale 96px headings into the dashboard.

---

## 4. Radius, Border, and Elevation

The source design used sharp edges. TemporalGuard keeps precise geometry but adds restrained radii for usability in a modern application.

```text
radiusXs:    4px
radiusSm:    6px
radiusMd:    8px
radiusLg:    10px
radiusXl:    12px
radiusPill:  999px
border:      1px
```

Rules:

- Inputs and buttons: 7–8px.
- Panels/cards: 8–10px.
- Drawers and large modals: 12px where visible.
- Badges and filter chips: pill only when the shape communicates compact selection/status.
- Do not combine large radii with heavy shadows.

Elevation:

- Primary separation uses borders and surface shifts.
- Use subtle shadow only for popovers, command palette, floating menus, and drag previews.
- No permanent glow.

---

## 5. Spacing and Density

Base unit: 4px.

```text
page horizontal padding: 16 mobile / 24 tablet / 28–32 desktop
page vertical padding:   20 mobile / 24–28 desktop
panel padding:           14 compact / 16 standard / 20 spacious
control height:          32 compact / 36 standard / 40 form / 44 mobile
sidebar width:           248 expanded / 64 collapsed
right drawer width:      440–560 desktop
```

Tables should default to 40px rows with an optional comfortable density setting.

### 5.1 Analytics density rules

- Above 1440px, add useful columns, comparison context, or investigation
  detail before increasing whitespace.
- Between 1024px and 1439px, preserve the primary chart and table context;
  move secondary explanations and controls into drawers or overflow menus.
- Between 768px and 1023px, keep two analytical regions only when both remain
  readable without horizontal compression.
- Below 768px, prioritize one decision per viewport section. Tables become
  prioritized rows or cards, while the full record remains reachable.
- Metric panels use stable heights within a row. Loading, partial, and error
  states must not change the grid footprint.
- Filter bars wrap by semantic group. Do not shrink labels into ambiguous
  abbreviations merely to keep a single row.
- Numeric columns are right-aligned and use tabular numerals. Event names,
  workflow IDs, correlation keys, and trace references use the mono stack.

---

## 6. Application Layout

### Sidebar

- Dark/light surface distinct from page background.
- Logo, workspace switcher, grouped navigation, settings/user footer.
- Active item uses a purple subtle background, strong foreground, and small indicator.
- Collapsible with tooltip labels.

### Top bar

- Sticky.
- Thin bottom border.
- Contains environment, time range, compare, live state, search, theme, and user actions.
- Controls use compact density.

### Content

- Maximize available width; analytics pages should not be constrained to a marketing-style 1200px container.
- Use a page max width only for auth and narrow settings forms.
- Dashboard grids use 12 columns and collapse predictably.

---

## 7. Components

### Buttons

Primary:

- Purple filled background.
- White/dark appropriate foreground.
- No gradient.
- 36–40px desktop height, 44px mobile.
- Subtle color transition and 1px press movement.

Secondary:

- Surface background or transparent.
- Border.
- Strong text.

Ghost:

- No border until hover unless it is icon-only.

Destructive:

- Use destructive token, not purple.

All buttons:

- Clear focus ring.
- Loading spinner without shifting label width.
- Disabled state retains readable contrast.

### Inputs

- Surface/input background.
- 1px border.
- Purple focus border/ring.
- Labels above input.
- Inline errors below.
- Search inputs may contain icons and keyboard hints.

### Cards and panels

- Use cards only for meaningful grouping.
- Analytics panels have compact headers, optional actions, fixed loading geometry, and border separation.
- Avoid nested cards beyond two levels.

### Tables

- Sticky header when useful.
- Column alignment based on content type.
- Tabular numerals.
- Row hover is subtle.
- Selected rows use primary-subtle surface and a left indicator.
- Support keyboard row navigation where practical.

### Badges

- Small and semantic.
- Never use a different arbitrary hue per string value.
- Add icons only when they improve recognition.

### Drawers

- Preserve underlying exploration context.
- Header and footer can remain sticky.
- Tabs inside drawer are acceptable.
- Deep-linkable selection where possible.

---

## 8. Charts

- Use consistent axes, grid, tooltip, and legend components.
- Avoid chart junk, 3D effects, gradients under every line, or over-smoothed curves that misrepresent data.
- Use purple for the primary series and semantic/secondary colors for comparisons.
- Deployment markers use neutral dashed lines with labels.
- Hover states should connect to filters or drill-downs.
- Every chart needs an accessible summary and empty/error state.
- Skeletons must match chart dimensions.

### Analytical interpretation rules

- A comparison delta must say what it compares with; direction alone is not
  enough. For failure-oriented metrics such as violations and overdue
  workflows, an increase is visually negative even though the number rose.
- Completion rate and duration must never share an unlabeled axis. Mixed-unit
  views use separate modes or unmistakable axes and legends.
- Truncated time ranges, sampled data, mock results, and partial failures must
  be labeled adjacent to the affected visualization.
- Tooltips supplement the visible chart; they must not contain the only copy
  of a value needed to interpret the result.
- Deployment annotations use neutral dashed markers. They indicate temporal
  correlation, never causation.
- Heatmaps include a textual scale, exact value on focus/hover, and a
  non-color summary. Empty cells and zero-value cells must be distinguishable.
- Funnel percentages state their denominator, and drop-off actions retain the
  current environment, time range, and filters.

---

## 9. Query Builder

The Query Builder is the signature interface.

### Desktop structure

- Left rail: operators, event catalogue, recent events.
- Center: visual rule canvas and sentence representation.
- Right rail: selected-node properties, validation, and historical test preview.

### Builder nodes

- Trigger: neutral/primary outline.
- `any`: branched connector with “ANY” label.
- `all`: parallel connector with “ALL” label.
- `sequence`: numbered vertical or horizontal steps.
- `forbid`: destructive outline and prohibition icon.
- Deadline: compact clock node.
- Invalid node: destructive border plus explicit message.

### Event selector

- Command-menu pattern.
- Search, recent, popular, grouped domain sections.
- Event canonical name in mono.
- “Create event” action when no exact match exists.
- Inline creation must not destroy the current draft.

### Motion

- Node insertion: short fade/scale from 0.98 to 1.
- Connector drawing: brief line reveal.
- Reorder: layout animation.
- No bouncy spring defaults.

---

## 10. Authentication Screens

- Split layout on large screens: form plus controlled visual/metric narrative.
- Single focused column on mobile.
- The right visual can show an abstract workflow timeline, not stock imagery.
- Logo upload uses a clear dropzone, preview, replace, remove, and error state.
- Do not use oversized marketing copy that pushes the form below the fold.
- Theme switch remains available.

---

## 11. Loading and Feedback

- Skeletons for initial page and widget loads.
- Keep previous data visible during background refresh.
- Use compact progress indicators for uploads and form submissions.
- Toasts for transient success/failure; inline messages for actionable form errors.
- Empty states explain whether there is no data or filters removed all results.
- Use optimistic behavior only where rollback is safe and obvious.

---

## 12. Motion

Default easing:

```text
cubic-bezier(0.22, 1, 0.36, 1)
```

Durations:

```text
micro:      120–160ms
standard:   180–240ms
panel:      240–320ms
page:       320–420ms
```

- Framer Motion is the default.
- GSAP is reserved for complex orchestrated timeline demos or chart storytelling.
- Never animate layout continuously during live updates.
- Respect reduced motion.

---

## 13. Iconography

Use Lucide React.

```text
inline:     14–16px
controls:   16–18px
navigation: 18–20px
feature:    20–24px
stroke:     1.75px default
```

Use outline icons only. Icons supplement labels rather than replacing unfamiliar actions.

---

## 14. Responsive Strategy

- Desktop prioritizes information density and side-by-side investigation.
- Tablet collapses secondary rails into drawers.
- Mobile uses staged Query Builder tabs: Trigger, Condition, Events, Window, Review.
- Charts keep readable minimum widths and provide a summarized mobile view.
- Tables prioritize columns and expose the rest in row details.
- Sidebar becomes a sheet or compact bottom navigation for the primary destinations.

---

## 15. Accessibility

- WCAG 2.2 AA target.
- Visible focus on every control.
- Purple focus ring must contrast in both themes.
- Body content remains at least 13–14px in dense areas and 16px in forms.
- No important interaction depends only on hover.
- Charts expose summaries/data tables.
- Status is not communicated by color alone.
- Drag-and-drop has keyboard controls.
- Dialogs and drawers correctly trap and restore focus.

---

## 16. Quality Gate

A page does not meet the design system when it:

- Uses literal colors instead of tokens.
- Introduces an unrelated radius, shadow, or gradient.
- Uses huge empty cards to appear modern.
- Omits dark or light mode behavior.
- Has no loading/empty/error states.
- Has inaccessible focus or contrast.
- Uses inconsistent status colors.
- Uses animations that delay work.
- Copies another analytics product's identifiable visual treatment.

</design-system>
