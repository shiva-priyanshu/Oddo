# Subscription Management System (SubscriptIQ)

A modern, full-stack Subscription Management System built for businesses to manage pricing plans, track customer subscriptions, generate itemized invoices, record simulated payments, and monitor MRR and operational metrics.

---

## Architecture & Tech Stack

- **Backend:** Node.js, Express, TypeScript, Zod, bcryptjs, JWT
- **Database & ORM:** Prisma ORM with SQLite (zero-config local macOS execution)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Validation:** Zod schemas
- **Architecture:** Client-Server monorepo (`backend/` + `frontend/`)

---

## Directory Structure

```text
subscription-management-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # 7 models (User, Customer, Plan, Sub, Invoice, Item, Payment)
│   │   └── seed.ts            # REQ-DEV-01 deterministic demo data seeder
│   ├── src/
│   │   ├── lib/prisma.ts      # Singleton PrismaClient
│   │   ├── middleware/        # Error handler & Auth
│   │   ├── routes/health.ts   # Database health check probe
│   │   ├── app.ts             # Express application wiring
│   │   └── index.ts           # Server entry point (:5001)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main shell & live status indicator
│   │   └── main.tsx
│   ├── vite.config.ts         # Proxy to :5001
│   └── package.json
└── package.json               # Root workspace scripts
```

---

## Quick Start (Local macOS)

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v10+

### 2. Backend Setup & Seeding
```bash
cd backend
npm install
npx prisma db push
npm run seed
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Build & Run
From the project root:
```bash
npm run build
```

Run both services:
```bash
# Terminal 1 (Backend API)
npm run dev:backend

# Terminal 2 (Frontend Client)
npm run dev:frontend
```

---

## Demo Credentials (REQ-DEV-01)

| Persona | Email | Password | Role | Features |
|---|---|---|---|---|
| **Administrator** | `admin@subscriptiq.com` | `admin123` | `ADMIN` | Full control over plans, customers, invoices, MRR |
| **Customer 1** | `acme@example.com` | `customer123` | `CUSTOMER` | Active Pro subscriber with paid invoice |
| **Customer 2** | `globex@example.com` | `customer123` | `CUSTOMER` | Starter plan with pending/overdue invoice |
