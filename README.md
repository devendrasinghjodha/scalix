# Scalix — Multi-Tenant SaaS Platform

A fully-featured multi-tenant project management and collaboration platform built with zero cost infrastructure.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Redis | Redis 7 |
| Queue | BullMQ |
| Auth | JWT + Google OAuth + bcrypt |
| Payments | Internal billing domain with optional Stripe adapter |
| Testing | Jest + Supertest |
| Load Testing | k6 |
| CI/CD | GitHub Actions |
| Containerization | Docker |

## Project Structure

```
scalix/
├── backend/                  # Express modular monolith API
│   ├── prisma/              # Schema + migrations + seed
│   ├── src/
│   │   ├── config/          # App, DB, Redis, Stripe, Passport config
│   │   ├── controllers/     # Route controllers
│   │   ├── jobs/            # BullMQ queue + worker + processors
│   │   ├── middleware/      # Auth, RBAC, rate limit, validation, errors
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers, JWT, pagination, errors
│   │   ├── validators/      # Zod schemas
│   │   ├── __tests__/       # Jest + Supertest tests
│   │   ├── app.ts           # Express app
│   │   └── server.ts        # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # Next.js App
│   └── src/
│       ├── app/             # Pages (App Router)
│       ├── components/      # UI components
│       ├── context/         # Auth context
│       └── lib/             # API client
├── k6/                      # Load testing
├── docker-compose.yml
└── .github/workflows/       # CI/CD
```

## Quick Start

### Option 1: Docker (recommended)

```bash
docker-compose up --build
```

This starts PostgreSQL, Redis, the API, a dedicated BullMQ worker, and the Next.js frontend. The API container applies the Prisma schema on startup for local development.

### Option 2: Local Development

**Prerequisites:** Node.js 20+, PostgreSQL, Redis

```bash
# Backend
cd backend
cp .env.example .env  # Edit with your credentials
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Running tests

Backend integration tests require PostgreSQL and Redis. Start them with Docker Desktop running:

```bash
docker compose up -d postgres redis
cd backend
npx prisma db push
npm test -- --runInBand
```

The tests cover authentication, RBAC, and cross-tenant access denial. Docker Desktop must be running before the test command.

**Backend:** http://localhost:4000  
**Frontend:** http://localhost:3000

## Demo Accounts

After seeding the database:

| Email | Password | Role |
|-------|----------|------|
| rahul@scalix.dev | Password123! | OWNER |
| amit@scalix.dev | Password123! | ADMIN |
| priya@scalix.dev | Password123! | MEMBER |

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/auth/google
GET    /api/auth/google/callback

GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/:id
PATCH  /api/organizations/:id
DELETE /api/organizations/:id

GET    /api/organizations/:orgId/members
POST   /api/organizations/:orgId/members/invite
PATCH  /api/organizations/:orgId/members/:id/role
DELETE /api/organizations/:orgId/members/:id

GET    /api/organizations/:orgId/projects
POST   /api/organizations/:orgId/projects
GET    /api/organizations/:orgId/projects/:id
PATCH  /api/organizations/:orgId/projects/:id
DELETE /api/organizations/:orgId/projects/:id

GET    /api/organizations/:orgId/tasks
POST   /api/organizations/:orgId/tasks
GET    /api/organizations/:orgId/tasks/:id
PATCH  /api/organizations/:orgId/tasks/:id
DELETE /api/organizations/:orgId/tasks/:id

GET    /api/organizations/:orgId/audit-logs

POST   /api/organizations/:orgId/billing/checkout
GET    /api/organizations/:orgId/billing/subscription
POST   /api/organizations/:orgId/billing/portal
POST   /api/organizations/:orgId/billing/cancel

POST   /api/webhooks/stripe

GET    /api/health

GET    /api/organizations/:orgId/teams
POST   /api/organizations/:orgId/teams
GET    /api/organizations/:orgId/api-keys
POST   /api/organizations/:orgId/api-keys
GET    /api/organizations/:orgId/usage/current
GET    /api/organizations/:orgId/usage/history
GET    /api/organizations/:orgId/webhooks
POST   /api/organizations/:orgId/webhooks
GET    /api/organizations/:orgId/webhooks/:endpointId/deliveries
```

## Testing

```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # With coverage
```

## Load Testing

```bash
k6 run k6/load-test.js
```

## Deployment

- **Frontend:** Vercel Free
- **Backend:** Render Free
- **Database:** Neon Free
- **Redis:** Upstash Free

Total cost: ₹0
