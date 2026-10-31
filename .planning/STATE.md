# Project State: Subscription Management System

## Current Status
- **Milestone:** Milestone 1 (Production-Ready MVP)
- **Current Phase:** Phase 4 (Billing, Invoicing & Simulated Payments) — COMPLETE & VERIFIED
- **Next Phase:** Phase 5 (Executive Dashboard, Analytics & Customer Portal)
- **Status:** Phase 4 complete (40/40 backend tests passing, frontend & root builds green)

---

## Architectural & Technical Decisions
1. **Repository Layout:** Modular client-server structure under `/Users/shivapriyanshu112gmail.com/.gemini/antigravity/scratch/subscription-management-system`.
2. **Database Engine:** Prisma ORM with SQLite as default engine for zero-dependency local macOS execution, with schema designed for 1-to-1 PostgreSQL compatibility.
3. **Backend Stack:** Node.js + Express + TypeScript with Zod request validation and centralized error handling.
4. **Frontend Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React icons.
5. **Security & RBAC:** Timing-safe JWT authentication using Node.js crypto HMAC-SHA256 with bcrypt password hashing; tab-scoped `sessionStorage`; dual roles `ADMIN` (full system control) and `CUSTOMER` (self-service portal) with customer data isolation.
6. **Billing & Payments:** Complete financial calculation engine (subtotal, taxes, discounts, totals with 2-decimal precision), auto-invoicing upon subscription creation, sequential invoice numbering (`INV-YYYY-xxxx`), live overdue detection, and simulated payment reconciliation.

---

## Artifact Traceability
- **Config:** `.planning/config.json`
- **Context:** `.planning/PROJECT.md`
- **Requirements:** `.planning/REQUIREMENTS.md`
- **Roadmap:** `.planning/ROADMAP.md`
- **Phase 1 Plans & Summaries:** `.planning/phases/01-foundation/01-01-SUMMARY.md`, `.planning/phases/01-foundation/01-02-SUMMARY.md`
- **Phase 2 Plans & Summaries:** `.planning/phases/02-auth/02-01-SUMMARY.md`, `.planning/phases/02-auth/02-02-SUMMARY.md`
- **Phase 3 Plans & Summaries:** `.planning/phases/03-plans-subscriptions/03-01-SUMMARY.md`, `.planning/phases/03-plans-subscriptions/03-02-SUMMARY.md`
- **Phase 4 Plans & Summaries:** `.planning/phases/04-billing-payments/04-01-SUMMARY.md`, `.planning/phases/04-billing-payments/04-02-SUMMARY.md`

---

## Next Step
Run `/gsd-plan-phase 5` to plan Executive Dashboard, Analytics & Customer Portal.
