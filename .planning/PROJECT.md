# Project Context: Subscription Management System (SubscriptIQ)

## 1. Executive Summary & Core Concept

**Subscription Management System (SubscriptIQ)** is a full-stack, modular subscription management platform designed to help recurring-revenue businesses create and configure pricing tiers, manage customer accounts, track subscription lifecycles, generate itemized invoices, record simulated payments, and monitor overall health via an executive dashboard.

The application addresses the common operational fragmentation where businesses struggle to track payment deadlines, invoice statuses, customer renewals, and recurring revenue metrics across spreadsheets and ad-hoc tools.

---

## 2. Target Users & Personas

1. **Business Administrator / Subscription Manager:**
   - Creates, edits, activates, and deactivates subscription plans (monthly / yearly intervals).
   - Registers customers and assigns subscriptions.
   - Monitors operational KPIs (MRR, active customer count, overdue invoices, renewal pipeline).
   - Generates invoices and records simulated payment settlements.
2. **Customer / Subscriber:**
   - Logs into a self-service portal.
   - Views active subscription details, renewal dates, and plan tier.
   - Views and downloads invoice history and payment receipts.
3. **Finance & Billing Staff:**
   - Reviews unpaid, overdue, and paid invoices.
   - Reconciles payment transactions against customer invoices.

---

## 3. Technology Stack & Architecture

### High-Level Architecture
The project is organized in a clean, modular client-server structure:

```
subscription-management-system/
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/      # Request handlers & HTTP routing
│   │   ├── services/         # Core business logic (billing, renewal computation)
│   │   ├── middleware/       # JWT auth, RBAC, input validation (Zod)
│   │   ├── routes/           # REST API route definitions
│   │   └── index.ts          # Server entry point
│   ├── prisma/               # Prisma ORM schema & seed scripts
│   └── package.json
├── frontend/                 # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # UI elements (Cards, Tables, Modals, Badges)
│   │   ├── pages/            # Admin Dashboard, Plans, Subscriptions, Invoices, Customer Portal
│   │   ├── context/          # Auth Context & State Management
│   │   ├── services/         # API client & HTTP helpers
│   │   └── App.tsx
│   └── package.json
└── .planning/                # GSD Project Management & Specifications
```

### Stack Choices & Rationale
- **Frontend:** React 19 + TypeScript powered by Vite for rapid development and high responsiveness.
- **Styling:** Tailwind CSS with Lucide React icons for a clean, professional, enterprise-grade UI.
- **Backend:** Node.js + Express + TypeScript providing clean modularity (Controllers, Services, Routes).
- **ORM & Data Layer:** Prisma ORM. Default configured for SQLite on macOS for zero-dependency, guaranteed out-of-the-box local execution, with direct compatibility for PostgreSQL via connection string substitution.
- **Validation:** Zod schemas for runtime request payload validation.
- **Security & Auth:** JSON Web Tokens (JWT) with bcrypt password hashing and Role-Based Access Control (`ADMIN`, `CUSTOMER`).
- **Payments:** Local simulated payment recording (no live external gateway required, adhering to hackathon/offline constraints).

---

## 4. Key Workflows (End-to-End MVP Journey)

1. **Administration Flow:**
   - Admin logs in with secure credentials.
   - Admin navigates to **Plans** and creates "Starter" ($19/mo) and "Pro" ($49/mo) plans.
   - Admin adds a new Customer ("Acme Corp", contact email).
   - Admin subscribes the customer to the "Pro" plan.
   - System calculates renewal date and generates an initial Invoice in `unpaid` status.
   - Admin records a simulated payment (Card / Wire).
   - Invoice status updates to `paid`, and payment timestamp is logged.
2. **Dashboard & Analytics Flow:**
   - Admin views the Executive Dashboard.
   - Real-time aggregation of Total Customers, Active Subscriptions, Monthly Recurring Revenue (MRR), Overdue/Pending Invoices, and upcoming renewal alerts.
3. **Customer Portal Flow:**
   - Customer logs in with customer credentials.
   - Views their active subscription status, plan benefits, next billing renewal date, and invoice history.

---

## 5. Scope & Non-Goals

### In Scope for MVP (Milestone 1)
- Role-based authentication (Admin vs Customer).
- Plan management (monthly & annual intervals, pricing, status toggling).
- Customer management & subscription lifecycle (active, pending, cancelled, expired).
- Automated renewal date calculation.
- Itemized invoice generation (subtotal, tax calculation, discounts, total).
- Invoice state tracking (draft, unpaid, paid, overdue).
- Simulated payment processing & audit history.
- Operational dashboard with financial metrics (MRR, active subs, overdue tracking).
- Customer self-service portal view.
- Realistic demo seed data.

### Out of Scope for MVP
- Live third-party payment gateways (Stripe/PayPal webhooks).
- Complex multi-currency real-time conversion.
- Automated email dispatch / SMTP servers.
- Multi-tenant white-labeling.
- Microservices / distributed queue architecture.

---

## 6. Execution Principles & Constraints
- **Local execution:** Operates completely on macOS without external cloud dependencies.
- **Security:** Secrets stored in `.env`, passwords hashed with salt, strict role separation.
- **Verifiable phases:** Each phase delivers working, testable functionality verified through automated checks or interactive flows.
