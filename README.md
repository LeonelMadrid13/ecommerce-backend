# E-Commerce Backend API

Backend API for an e-commerce system built with NestJS.

This project follows the PRD goals: authentication, product management, idempotent order creation, async order processing, and reliability under concurrent requests.

---

## 1) Tech Stack

- **Node.js + NestJS 11**
- **TypeScript (ESM / NodeNext)**
- **Prisma 7 + PostgreSQL**
- **BullMQ + Redis** (background jobs)
- **JWT + Passport** (access auth)
- **Pino** (structured logging)
- **Swagger** (`/docs`)

---

## 2) What is Implemented

### Authentication

- Register user: `POST /auth/register`
- Login: `POST /auth/login`
- Refresh token rotation: `POST /auth/refresh`
- Logout / refresh revocation: `POST /auth/logout`

### Users

- List users (admin): `GET /users`
- Get user by id (admin): `GET /users/:id`
- Current profile (JWT required): `GET /users/profile`

### Products

- Create (admin): `POST /products`
- List: `GET /products`
- Get by id: `GET /products/:id`
- Update (admin): `PATCH /products/:id`
- Delete (admin): `DELETE /products/:id`

### Orders

- Create order (JWT + Idempotency-Key): `POST /orders`
- List my orders: `GET /orders`
- Get my order by id: `GET /orders/:id`
- Orders are created as `PENDING` and processed asynchronously by BullMQ worker.

### Platform / Cross-Cutting

- Global validation (`ValidationPipe`)
- Global response format: `{ success, data, timestamp }`
- Global exception filter for HTTP and Prisma errors
- Global rate limiting with custom limits for login/order endpoints
- Request IDs + structured logs

---

## 3) Architecture (Modular Monolith)

```txt
src/
├─ auth/      # auth controller/service, jwt strategy
├─ user/      # user profile + credential validation (port + Prisma adapter)
├─ product/   # product CRUD
├─ order/     # order API + async processor
├─ queue/     # BullMQ + Redis provider
├─ prisma/    # Prisma client provider
├─ database/  # abstract DATABASE_CONNECTION provider token
└─ common/    # shared guards, interceptors, filters
```

> The codebase is modular and ready to evolve toward microservices later.

---

## 4) Order Processing Flow

1. Client sends `POST /orders` with:
   - `Authorization: Bearer <access_token>`
   - `Idempotency-Key: <unique-key>`
2. API stores order with status `PENDING` and enqueues a BullMQ job.
3. Worker processes job inside DB transaction:
   - loads order + items
   - validates products and stock
   - decrements stock atomically
   - saves `priceAtPurchase`
   - updates order status to `CONFIRMED`
4. If processing fails after retries, order becomes `FAILED`.

Idempotency uses Redis (24h TTL): repeated requests with same key return the cached response instead of creating duplicates.

---

## 5) Data Model (Prisma)

- `User`
- `Product`
- `Order`
- `OrderItem` (composite key: `orderId + productId`)
- `RefreshToken`

Enums:

- `ROLES`: `USER`, `ADMIN`
- `ORDER_STATUS`: `PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`

See: `prisma/schema.prisma`

---

## 6) Local Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for Postgres + Redis)

### Install

```bash
pnpm install
```

### Environment

Create `.env` with values like:

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/postgres"
JWT_SECRET="supersecretkey"
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
PORT=3000
```

### Start infra (Postgres + Redis)

```bash
docker compose up -d
```

### Migrate + Seed

```bash
pnpm seed
```

### Run API

```bash
pnpm start:dev
```

### One-command dev bootstrap

```bash
pnpm start:dev:all
```

This runs Docker infra + seed + dev server in sequence.

### Run local API validation suites (Postman/Newman)

```bash
pnpm test:postman:local
```

This script starts infra, prepares Prisma, boots the API, runs smoke/contract/security suites, and cleans up.

Swagger UI:

- `http://localhost:3000/docs`

---

## 7) Useful Scripts

- `pnpm run help` → list all project scripts with grouped descriptions
- `pnpm start:dev` → run in watch mode
- `pnpm start:dev:all` → docker + seed + dev server in one command
- `pnpm build` → build project
- `pnpm start:prod` → run compiled app
- `pnpm lint` → lint and autofix
- `pnpm lint:check` → lint in check mode
- `pnpm typecheck` → TypeScript type validation
- `pnpm test` → unit tests
- `pnpm test:e2e` → e2e tests
- `pnpm test:cov` → coverage
- `pnpm test:postman:all` → run smoke/contract/security suites against localhost
- `pnpm test:postman:ci` → run smoke/contract/security suites with CI flags
- `pnpm test:postman:local` → one-shot local infra + API + Newman execution
- `pnpm verify:secure` → lint + typecheck + unit + e2e + high-level dependency audit

### Maintaining script help when adding scripts

When adding/removing/renaming scripts in `package.json`:

1. Update the `descriptions` map in `scripts/pnpm-help.mjs`
2. Validate output with:

```bash
pnpm run help
```

Optional flat output:

```bash
pnpm run help -- --flat
```

---

## 8) Diagram

Architecture diagram:

`public/ecommerce_backend_architecture.svg`
