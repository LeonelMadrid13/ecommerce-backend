# ECommerce Backend

A production-oriented REST API built with **NestJS**, **Prisma**, and **PostgreSQL**. The goal is not just CRUD — it's a realistic backend that handles transactional integrity, async processing, and scalable architecture patterns.

---

## Stack

- **NestJS** — ESM, NodeNext, strict TypeScript
- **Prisma ORM** — PostgreSQL
- **BullMQ + Redis** — async job queue
- **JWT + Passport** — authentication
- **pnpm** — package manager

---

## Architecture

```
src/
├── auth/           # JWT strategy, guards
├── user/           # User module
├── product/        # Product CRUD
├── order/          # Order module + processor
├── queue/          # BullMQ setup, Redis client
├── prisma/         # PrismaService (global)
├── common/
│   ├── filters/    # Global exception filter
│   ├── guards/     # IdempotencyGuard
│   └── interceptors/ # ResponseInterceptor, IdempotencyInterceptor
└── main.ts
```

Each domain is isolated into its own module. `PrismaModule` is global. `QueueModule` exports both BullMQ and the Redis client for use across modules.

---

## Features

### Authentication
- JWT-based auth via `passport-jwt`
- Token extracted from `Authorization: Bearer <token>`
- Role support: `USER` / `ADMIN`

### Products
- Full CRUD
- Price and stock validation

### Orders
- Async order processing via BullMQ
- Orders are accepted immediately and fulfilled by a background worker
- Worker runs inside a Prisma transaction: stock validation, optimistic locking, price capture
- Automatic retries with exponential backoff (3 attempts)
- Terminal statuses: `CONFIRMED` or `FAILED`
- Idempotent order creation — duplicate requests return the original response

### API Layer
- Standardized response envelope: `{ success, data, timestamp }`
- Centralized exception handling: Prisma errors, HTTP exceptions, unknown errors
- `ValidationPipe` with whitelist and transform enabled

---

## Order Flow

```
POST /orders
  → JwtAuthGuard        validates token
  → IdempotencyGuard    checks Redis for duplicate request
  → OrderService        creates Order (PENDING) + enqueues job
  → IdempotencyInterceptor  caches response in Redis (24h TTL)
  → { orderId, status: "PENDING" }

BullMQ Worker
  → validate stock
  → decrement stock (optimistic lock)
  → update priceAtPurchase
  → Order → CONFIRMED or FAILED
```

Client polls `GET /orders/:id` for final status.

---

## Data Model

```
User       id · name · email · password · role
Product    id · name · description? · price · stock
Order      id · userId · total · status · createdAt · updatedAt
OrderItem  @@id([orderId, productId]) · quantity · priceAtPurchase

ORDER_STATUS: PENDING · CONFIRMED · FAILED · CANCELLED
ROLES:        USER · ADMIN
```

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd ecommerce-backend
pnpm install
```

### 2. Environment variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
JWT_SECRET="your_secret_key"
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### 3. Start Redis

```bash
docker compose up -d redis
```

### 4. Run migrations and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the server

```bash
pnpm start:dev
```

---

## What's Next

- **Rate limiting** — throttle auth and order endpoints, brute-force protection
- **Refresh tokens** — token rotation with revocation strategy
- **Observability** — structured logging (Pino), request tracing, worker metrics
- **Swagger** — auto-generated API docs
- **Docker** — containerize app + postgres + redis
- **Deployment** — AWS / Railway

---

## Author

Leonel Madrid