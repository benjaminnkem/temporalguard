# TemporalGuard Web

Next.js 16 App Router frontend for TemporalGuard’s workflow-reliability
experience.

## Run locally

From the repository root:

```sh
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
pnpm --filter web dev
```

Open `http://localhost:3000`.

Product-domain screens use the typed `HttpTemporalGuardDataSource`, and
authentication uses `HttpAuthClient`. Both remain behind component-facing
interfaces so tests can inject isolated doubles:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Ensure the NestJS API is running at `NEXT_PUBLIC_API_BASE_URL` before starting
the web application.

## Design system

The source of truth is `../../docs/DESIGN.MD`. Semantic tokens, pure
white/black light and dark canvases, the purple brand scale, square geometry,
flat borders, restrained motion, and serif/mono font mappings live in
`app/globals.css`. Feature components should consume semantic utilities and
shared primitives instead of adding literal colors or a second motion system.

## Checks

```sh
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter web build
```

Responsive QA covers 390×844, 768×1024, 1440×900, and 1920×1080 in light and
dark themes.
