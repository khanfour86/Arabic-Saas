# Workspace — منصة خياطة الدشداشة الكويتية

## Project Overview

Production-ready mobile-first Arabic RTL SaaS platform for Kuwaiti tailoring shops (dishdasha/traditional robe). The platform serves two personas:
1. **Platform Owner** — manages all tailoring shop subscriptions via a central dashboard
2. **Shop Staff (3 roles)** — Manager, Reception, Tailor — each with appropriate access levels

All UI is in Arabic only with RTL layout.

## Tech Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Wouter (routing)
- **Data fetching**: TanStack Query (React Query) with Orval-generated hooks
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Monorepo Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/           # Express 5 API server (port 8080, path /api)
│   └── tailoring-saas/       # React+Vite frontend (path /)
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval codegen config
│   ├── api-client-react/     # Generated React Query hooks + custom fetch
│   ├── api-zod/              # Generated Zod schemas from OpenAPI
│   └── db/                   # Drizzle ORM schema + DB connection
├── scripts/                  # Utility scripts (seed, migrations)
└── pnpm-workspace.yaml
```

## Database Schema

Tables in PostgreSQL:
- `shops` — tailoring shop records (name, area, subscription status/dates, manager name, phone)
- `users` — platform users with roles: `owner`, `shop_manager`, `reception`, `tailor`
- `customers` — shop customers (linked to shopId)
- `profiles` — measurement profiles per customer (a customer can have multiple, one is main)
- `measurements` — body measurements per profile (length, shoulder, chest, sleeve, neck + notes)
- `measurement_history` — historical snapshots of measurements saved before each update
- `invoices` — orders (linked to shop + customer, has status: under_tailoring/ready/delivered)
- `invoice_history` — audit log of invoice edits (stored as JSON diff per edit)
- `sub_orders` — individual garment items per invoice (with fabric info, price, paid amount, status)

## Authentication

- Sessions stored in PostgreSQL `sessions` table (token, userId, userData, expiresAt — 30 day TTL)
- SHA256 password hashing with salt "tailoring_salt_2024"
- Token stored in localStorage as `auth_token`
- `window.fetch` override in App.tsx injects Bearer token on every API call (also handled by custom-fetch.ts)
- Demo credentials:
  - `owner` / `owner123` (platform owner)
  - `manager1` / `manager123` (shop manager)
  - `reception1` / `reception123` (reception)
  - `tailor1` / `tailor123` (tailor)

## API Routes

All routes under `/api/`:

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Owner (requires owner role)
- `GET /api/owner/stats`
- `GET /api/owner/shops` (supports ?status=, ?area= filters)
- `POST /api/owner/shops`
- `GET /api/owner/shops/:shopId`
- `PATCH /api/owner/shops/:shopId`

### Shop — Customers (requires shop staff role)
- `GET /api/shop/customers` (?phone=, ?name= optional search)
- `POST /api/shop/customers`
- `GET /api/shop/customers/by-phone/:phone`
- `GET /api/shop/customers/:customerId` (includes profiles+measurements)
- `PATCH /api/shop/customers/:customerId`

### Shop — Profiles & Measurements
- `POST /api/shop/profiles`
- `GET /api/shop/profiles/:profileId`
- `PATCH /api/shop/profiles/:profileId`
- `PUT /api/shop/measurements/:profileId`

### Shop — Invoices (requires shop staff)
- `GET /api/shop/invoices` (?status=, ?phone=, ?invoiceNumber=, ?readyForDelivery= filters)
- `POST /api/shop/invoices` (creates invoice + sub-orders together; manager/reception only)
- `GET /api/shop/invoices/:invoiceId`
- `PATCH /api/shop/invoices/:invoiceId`
- `POST /api/shop/invoices/:invoiceId/deliver` (manager/reception only)
- `GET /api/shop/invoices/:invoiceId/whatsapp` (generates Arabic WhatsApp message)

### Shop — Sub-orders
- `POST /api/shop/suborders` (manager/reception only)
- `PATCH /api/shop/suborders/:subOrderId`
- `POST /api/shop/suborders/:subOrderId/ready` (tailor marks as ready; triggers invoice readiness check)

### Shop — Management (manager only)
- `GET /api/shop/dashboard`
- `GET /api/shop/tailor-queue`
- `GET /api/shop/users`
- `POST /api/shop/users`
- `PATCH /api/shop/users/:userId`
- `DELETE /api/shop/users/:userId`
- `GET /api/shop/export/customers`
- `GET /api/shop/export/invoices`

## Frontend Pages

- `/login` — Login page with demo credential quick-fill buttons
- `/owner/dashboard` — Platform owner stats (total/active/expired shops, area distribution)
- `/owner/shops` — Shop management (CRUD + subscription control)
- `/shop/dashboard` — Shop overview (orders under tailoring, ready, delivered today)
- `/shop/customers` — Customer list with search
- `/shop/customers/:id` — Customer detail with measurement profiles
- `/shop/invoices` — Invoice list with status/search filters
- `/shop/invoices/new` — Create new invoice (customer + sub-orders)
- `/shop/invoices/:id` — Invoice detail (sub-orders, payments, WhatsApp message)
- `/shop/tailor` — Tailor work queue with measurements and mark-ready
- `/shop/settings` — User management + data export (manager only)

## Known Patterns & Conventions

### Middleware Pattern (Critical)
Use per-route middleware, NOT `router.use()` without a path. The `shopMiddleware.ts` exports:
- `isShopUser` — shop_manager, reception, tailor
- `isManagerOrReception` — shop_manager, reception
- `isManager` — shop_manager only
- `isTailor` — shop_manager, tailor

### Null Params Pattern
The Orval-generated API client converts `null` values to the string `"null"` in query params. Always use `undefined` (not `null`) for optional params that should be omitted. Server-side defensive: strip "null" string params.

### Numeric DB Fields
PostgreSQL `numeric` columns come back as strings. Always `parseFloat()` before returning from API (price, paidAmount, measurements).

### Invoice/SubOrder Numbers
- Invoice numbers start at 1001 (sequential per shop)
- Sub-order numbers: `"1001-1"`, `"1001-2"`, etc.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root**: `pnpm run typecheck`
- **`emitDeclarationOnly`**: we only emit `.d.ts` files during typecheck
- **Project references**: when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/scripts run seed` — run seed data script
- `pnpm --filter @workspace/db run push` — push schema changes to DB
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
