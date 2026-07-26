# TemporalGuard GitHub CI/CD

This repo uses GitHub Actions for continuous integration and for publishing the Node SDK to npm.

| Workflow | File | When | What |
| --- | --- | --- | --- |
| **CI** | `.github/workflows/ci.yml` | Push / PR to `main` | Typecheck, lint, unit tests, build |
| **Publish SDK** | `.github/workflows/publish-sdk.yml` | Tag `temporalguard-node-v*` | Publish `temporalguard-node` to npm |

App deploy (API / web to a host) is **not** automated yet — add a separate workflow when you choose a platform (Fly, Railway, AWS, Vercel, etc.).

---

## 1. One-time GitHub setup

### 1.1 Push the workflows

Commit and push `.github/workflows/*` to GitHub so Actions are registered.

### 1.2 Enable Actions

Repo → **Settings → Actions → General**

- Allow Actions
- Prefer **Read and write** only if you later need workflows to push tags; current workflows only need read + npm publish

### 1.3 Add the npm token secret

1. Create a **granular access token** on npm  
   https://www.npmjs.com/settings/nkembenjamin/tokens  
   - **Read and write** packages  
   - **Publish**  
   - **Bypass 2FA** for automation  
   - Optionally limit to package `temporalguard-node`

2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

   | Name | Value |
   | --- | --- |
   | `NPM_TOKEN` | `npm_…` granular token |

Never commit the token. Never put it in the workflow YAML.

---

## 2. Continuous integration (every PR / main)

On each push or pull request to `main`, CI runs on **Node 22** with pnpm from root `packageManager` (`pnpm@9.0.0`):

```text
pnpm install --frozen-lockfile
pnpm check-types
pnpm --filter web lint && pnpm --filter @repo/ui lint
pnpm --filter api run lint:ci
pnpm test
pnpm build
```

Local equivalent:

```bash
pnpm install --frozen-lockfile
pnpm check-types
pnpm --filter web lint
pnpm --filter @repo/ui lint
pnpm --filter api run lint:ci
pnpm test
pnpm build
```

Unit tests only (no Playwright e2e, no Docker stack). That keeps CI fast and free of infrastructure secrets.

---

## 3. Publish `temporalguard-node` automatically

### 3.1 Bump the package version

Edit `packages/node/package.json`:

```json
"version": "0.1.1"
```

Open a PR, wait for CI green, merge to `main`.

### 3.2 Tag and push

Tag format must match the package version exactly:

```bash
# from main, after merge
git pull origin main
git tag temporalguard-node-v0.1.1
git push origin temporalguard-node-v0.1.1
```

### 3.3 What the publish workflow does

1. Checks tag `temporalguard-node-vX.Y.Z` equals `package.json` version `X.Y.Z`
2. Runs SDK tests + build
3. `npm publish --access public` with `NODE_AUTH_TOKEN` from `secrets.NPM_TOKEN`

Verify:

```bash
npm view temporalguard-node version
```

### 3.4 Semver reminder

| Change | Bump |
| --- | --- |
| Bugfix | patch `0.1.0` → `0.1.1` |
| New optional API | minor `0.1.1` → `0.2.0` |
| Breaking change | major `0.2.0` → `1.0.0` |

You **cannot** republish the same version on npm. Always bump first.

---

## 4. Optional next steps (not included yet)

| Goal | Approach |
| --- | --- |
| Deploy **web** | Vercel / Cloudflare / Docker → Fly; workflow on `main` with deploy secrets |
| Deploy **api** | Docker image to GHCR + deploy to Fly/Railway/ECS |
| Run **API e2e** | Service containers for Postgres + Redis in Actions |
| Run **Playwright** | `pnpm --filter web test:e2e` with browser install |
| Turbo remote cache | `TURBO_TOKEN` + `TURBO_TEAM` secrets |

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Publish 403 | Token missing **publish** or **bypass 2FA**; secret name must be `NPM_TOKEN` |
| Tag mismatch | Tag must be `temporalguard-node-v` + exact `package.json` version |
| Version already exists | Bump version; npm forbids re-publish |
| CI lockfile error | Run `pnpm install` locally and commit `pnpm-lock.yaml` |
| Web build fails on env | Set required `NEXT_PUBLIC_*` in the CI `env:` block |

---

## 6. Security checklist

- [ ] `NPM_TOKEN` is a **granular** automation token, not a classic password  
- [ ] Token is only in GitHub **Secrets**, not logs or code  
- [ ] Prefer package-scoped publish permission when npm allows it  
- [ ] Revoke tokens that were ever pasted into chat or committed  
- [ ] Do not commit `.npmrc` files containing `_authToken`  
