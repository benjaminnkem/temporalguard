# TemporalGuard

Business process observability engine for monitoring temporal invariants. Define rules that specify expected event sequences and timeouts, then track workflows to detect violations in real time.

## Architecture

Monorepo powered by [Turborepo](https://turborepo.dev/) + [pnpm](https://pnpm.io/).

```
temporalguard/
├── apps/
│   └── api/            # NestJS REST API
├── packages/
│   ├── eslint-config/  # Shared ESLint configuration
│   └── typescript-config/ # Shared tsconfig
├── docker-compose.yml  # PostgreSQL + Redis
└── turbo.json
```

## Tech Stack

- **Runtime**: Node.js ≥ 18
- **Framework**: NestJS
- **Database**: PostgreSQL 16 (TypeORM)
- **Cache**: Redis 7
- **Language**: TypeScript 5.9

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm 9
- Docker & Docker Compose

### 1. Start Infrastructure

```sh
docker compose up -d
```

This starts PostgreSQL (port `5434`) and Redis (port `6379`).

### 2. Configure Environment

```sh
cp .env.example apps/api/.env
```

Fill in your `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5434
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=temporalguard
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Install Dependencies

```sh
pnpm install
```

### 4. Run the API

```sh
pnpm --filter api start:dev
```

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

## Data Model

### Entities

```
Rule ──< Workflow ──< BusinessEvent
  │         │
  │         └──< Violation
  └──────────────< Violation
```

| Entity | Table | Description |
|--------|-------|-------------|
| **Rule** | `rules` | Defines a temporal invariant — a trigger event, expected events, operator, timeout, and severity |
| **Workflow** | `workflows` | A tracked instance of a rule being evaluated |
| **BusinessEvent** | `business_events` | An event received against a workflow |
| **Violation** | `violations` | A recorded breach when a workflow fails to meet its rule |

### Enums

| Enum | Values |
|------|--------|
| `RuleSeverity` | `low`, `medium`, `high`, `critical` |
| `RuleOperator` | `any`, `all` |
| `TimeoutUnit` | `seconds`, `minutes`, `hours`, `days` |
| `WorkflowStatus` | `waiting`, `completed`, `overdue`, `cancelled` |
| `EventType` | `business`, `system` |
| `ViolationSeverity` | `low`, `medium`, `high`, `critical` |

## API Reference

Base path: `/api`

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rules` | Create a rule |
| `GET` | `/api/rules` | List all rules |
| `GET` | `/api/rules/:id` | Get a rule by ID |
| `PATCH` | `/api/rules/:id` | Update a rule |
| `DELETE` | `/api/rules/:id` | Delete a rule |

#### Create Rule — Example Payload

```json
{
  "name": "payment-must-resolve-within-15m",
  "description": "Payment must be captured or reversed within 15 minutes",
  "triggerEvent": "payment.authorized",
  "expectedEvents": ["payment.captured", "payment.reversed"],
  "operator": "any",
  "timeoutValue": 15,
  "timeoutUnit": "minutes",
  "severity": "high",
  "enabled": true
}
```

**Required fields**: `name`, `triggerEvent`, `expectedEvents`, `timeoutValue`

**Optional fields** (with defaults): `description`, `operator` (`all`), `timeoutUnit` (`minutes`), `severity` (`medium`), `enabled` (`true`)

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workflows` | Create a workflow |
| `GET` | `/api/workflows` | List all workflows |
| `GET` | `/api/workflows/:id` | Get a workflow by ID |
| `PATCH` | `/api/workflows/:id` | Update a workflow |
| `DELETE` | `/api/workflows/:id` | Delete a workflow |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Ingest a business event |

### Violations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/violations` | Create a violation |
| `GET` | `/api/violations` | List all violations |
| `GET` | `/api/violations/:id` | Get a violation by ID |
| `PATCH` | `/api/violations/:id` | Update a violation |
| `DELETE` | `/api/violations/:id` | Delete a violation |

## Development

```sh
# Run the API in watch mode
pnpm --filter api start:dev

# Type check
pnpm check-types

# Lint
pnpm lint

# Format
pnpm format
```

## License

Private
