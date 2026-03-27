# 🛒 E-commerce Backend API

A production-oriented backend built with **NestJS**, **Prisma**, and **PostgreSQL**, designed to demonstrate real-world backend architecture, authentication, and scalable patterns.

---

# 📌 Overview

This project implements a modular backend system with:

* JWT-based authentication
* Role-based access control (RBAC)
* Prisma ORM for database management
* Global error handling
* Clean architecture using NestJS modules

The goal is to showcase **real-world backend engineering practices**, not just CRUD operations.

---

# 🏗️ Architecture

The project follows a **modular architecture (NestJS standard)**:

```
src/
│
├── auth/        # Authentication (JWT, strategies)
├── user/        # User domain (controllers, services, DTOs)
├── prisma/      # Database layer (Prisma service/module)
├── common/      # Shared utilities (filters, guards, etc.)
└── main.ts      # App bootstrap
```

## Key Concepts

### 1. Module-based design

Each domain is isolated into its own module:

* `AuthModule` → authentication & JWT
* `UserModule` → user logic
* `PrismaModule` → database access (shared globally)

### 2. Dependency Injection (DI)

Services are injected via NestJS DI system:

* `PrismaService` → injected into services
* `JwtService` → injected via `AuthModule`

### 3. Request Flow

```
Request → Guard → Strategy → Controller → Service → Prisma → DB
```

---

# 🔐 Authentication & Authorization

## JWT Authentication

* Uses `passport-jwt` strategy
* Token signed with `JWT_SECRET`
* Extracted from `Authorization: Bearer <token>`

## Flow

```
Login → Generate JWT
Request → JwtAuthGuard
        → JwtStrategy
        → req.user injected
        → Controller
```

## Role-Based Access (RBAC)

Users have roles:

```
USER
ADMIN
```

These roles can be enforced via guards for protected routes.

---

# 🗄️ Database Design

Using **PostgreSQL + Prisma ORM**

## Main Models

### User

* id
* name
* email (unique)
* password (hashed)
* role

### Product

* id
* name
* description
* price
* stock

### Order

* id
* userId
* total
* status

### OrderItem

* orderId
* productId
* quantity
* priceAtPurchase

## Relationships

* User → Orders (1:N)
* Order → OrderItems (1:N)
* Product → OrderItems (1:N)

---

# ⚙️ Key Decisions

## 1. Prisma over raw SQL

* Type safety
* Faster development
* Maintainable schema

## 2. JWT over sessions

* Stateless
* Scalable for microservices
* Works well with APIs

## 3. Global Exception Filter

* Centralized error handling
* Consistent API responses
* Cleaner debugging

## 4. Modular Auth Design

* Auth logic isolated in `AuthModule`
* Reusable across modules

## 5. Select-based queries

Sensitive fields (like passwords) are excluded at query level using Prisma `select`.

---

# 🚀 How to Run Locally

## 1. Clone repository

```
git clone <your-repo>
cd ecommerce-backend
```

## 2. Install dependencies

```
pnpm install
```

## 3. Setup environment variables

Create a `.env` file:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
JWT_SECRET="your_secret_key"
PORT=3000
```

## 4. Run database migrations

```
npx prisma migrate dev
```

## 5. Generate Prisma client

```
npx prisma generate
```

## 6. Start the server

```
pnpm run start:dev
```

Server will run on:

```
http://localhost:3000
```

---

# 🌐 Live Links

> Add your deployed links here

* API: [https://your-api-url.com](https://your-api-url.com)
* Docs (Swagger): [https://your-api-url.com/docs](https://your-api-url.com/docs)

---

# 🧪 Testing the API

Use tools like:

* Postman
* Insomnia

### Example protected route:

```
GET /users/profile
Authorization: Bearer <token>
```

---

# 📈 Future Improvements

* DTO validation (class-validator)
* Role Guards (ADMIN vs USER enforcement)
* Product module (CRUD + permissions)
* Order processing logic
* Logging system (Winston/Pino)
* Rate limiting & security hardening
* Dockerization
* CI/CD pipeline

---

# 🧠 What This Project Demonstrates

* Real-world backend architecture
* Authentication & authorization flows
* Database design with relationships
* Error handling strategies
* Clean, maintainable code structure

---

# 👨‍💻 Author

Leonel Madrid

---

# 📄 License

MIT
