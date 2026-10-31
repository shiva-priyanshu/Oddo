# Requirements Specification: Subscription Management System

## Overview
This document specifies the functional and non-functional requirements for the Subscription Management System (SubscriptIQ) MVP, organized by domain module.

---

## 1. Authentication & Role-Based Access Control (REQ-AUTH)

- **REQ-AUTH-01: User Roles & Registration**
  - The system must support two primary roles: `ADMIN` and `CUSTOMER`.
  - Passwords must be hashed using `bcrypt` (minimum 10 salt rounds).
  - Admins can provision customer accounts directly, or customers can be created via seed data.

- **REQ-AUTH-02: Authentication & Token Management**
  - The API must authenticate users via JSON Web Tokens (JWT) containing userId, email, and role.
  - Expired or invalid tokens must be rejected with HTTP 401 Unauthorized.
  - Current user identity endpoint (`GET /api/auth/me`) must return user details and associated customer profile if applicable.

- **REQ-AUTH-03: Route Protection & Authorization**
  - Admin endpoints (`/api/admin/*`, plans CRUD, system dashboard) must strictly require the `ADMIN` role.
  - Customer endpoints must restrict data access to the authenticated user's own customer record.
  - Frontend must provide protected route guards redirecting unauthenticated or unauthorized users to `/login`.

---

## 2. Plans & Pricing Management (REQ-PLAN)

- **REQ-PLAN-01: Plan Configuration**
  - Admins must be able to create subscription plans with: `name`, `description`, `price`, `currency` (default USD), `billingInterval` (`MONTHLY` or `YEARLY`), and `features` (list of strings or JSON).

- **REQ-PLAN-02: Plan Lifecycle & Status**
  - Plans must have an `isActive` toggle flag.
  - Inactive plans must be hidden from new customer subscription assignments while keeping existing subscriptions intact.
  - Admins must be able to edit plan metadata (name, description, features) and view all plans in a responsive table/card grid.

---

## 3. Customer & Subscription Lifecycle (REQ-SUB)

- **REQ-SUB-01: Customer Profile Management**
  - The system must store customer records: `name`, `email`, `companyName`, `billingAddress`, `phone`, and `createdAt`.
  - Admins can list, search, and view individual customer profiles and their subscription histories.

- **REQ-SUB-02: Subscription Creation & State Transitions**
  - A customer can be subscribed to any active plan.
  - Subscriptions must support the following states: `ACTIVE`, `PENDING`, `CANCELLED`, `EXPIRED`.
  - Subscriptions must track: `startDate`, `currentPeriodStart`, `currentPeriodEnd` (next renewal date), and `cancelAtPeriodEnd` flag.

- **REQ-SUB-03: Renewal Date Calculation**
  - Upon subscription creation or renewal:
    - `MONTHLY` plans set `currentPeriodEnd` to 1 month from start date.
    - `YEARLY` plans set `currentPeriodEnd` to 1 year from start date.

- **REQ-SUB-04: Cancellation & Plan Changes**
  - Admins can cancel a subscription immediately or schedule cancellation at period end.
  - Subscription status changes must be logged and reflected immediately in dashboard calculations.

---

## 4. Billing, Invoices & Simulated Payments (REQ-BILL)

- **REQ-BILL-01: Automated & Manual Invoice Generation**
  - When a subscription is initiated or renewed, the system generates an itemized invoice.
  - Admins can also generate ad-hoc invoices for custom line items or add-ons.
  - Invoice must include: unique invoice number (e.g. `INV-2026-001`), customer details, line items, issue date, and due date.

- **REQ-BILL-02: Financial Calculations**
  - Invoices must accurately calculate:
    - `subtotal`: sum of line items.
    - `discountAmount`: flat or percentage discount applied.
    - `taxRate` & `taxAmount`: standard percentage calculation (e.g., 10% tax).
    - `total`: `(subtotal - discountAmount) + taxAmount`.

- **REQ-BILL-03: Invoice Status Tracking**
  - Invoices must support states: `DRAFT`, `UNPAID`, `PAID`, `OVERDUE`.
  - Invoices past their `dueDate` with status `UNPAID` must be flagged as `OVERDUE`.

- **REQ-BILL-04: Payment Simulation Recording**
  - Admins can record a simulated payment against any `UNPAID` or `OVERDUE` invoice.
  - Payment records store: `paymentMethod` (`CREDIT_CARD`, `BANK_TRANSFER`, `CASH`, `SIMULATED`), `amount`, `transactionRef`, and `paidAt` timestamp.
  - Once payment total matches invoice total, invoice status automatically updates to `PAID`.
  - System maintains full audit history of payment transactions linked to the invoice.

---

## 5. Analytics Dashboard & Reporting (REQ-DASH)

- **REQ-DASH-01: Executive Metric Cards**
  - Total Customers count.
  - Active Subscriptions count.
  - Monthly Recurring Revenue (MRR): calculated as sum of monthly plans + (yearly plans / 12).
  - Unpaid & Overdue Invoices total amount and count.

- **REQ-DASH-02: Operational Alerts & Timeline**
  - Upcoming Renewals list (subscriptions renewing within the next 7 and 30 days).
  - Overdue Invoices alert banner / list.
  - Recent Activity timeline (new signups, plan upgrades, payments recorded).

---

## 6. Customer Portal Experience (REQ-PORTAL)

- **REQ-PORTAL-01: Self-Service Overview**
  - Authenticated customers can access `/portal`.
  - Displays current plan name, billing interval, price, status badge, and next renewal date.

- **REQ-PORTAL-02: Invoices & Receipts**
  - Customers can view their full invoice history.
  - Detailed modal/view to see invoice line items, tax breakdown, and payment confirmation.

---

## 7. Data Seeding & Developer Experience (REQ-DEV)

- **REQ-DEV-01: Deterministic Demo Seed Data**
  - A comprehensive seed script must populate:
    - 1 Admin account (`admin@subscriptiq.com` / `admin123`).
    - 2 Customer accounts with linked subscriptions and invoices.
    - 3 Pricing plans (Starter $19/mo, Pro $49/mo, Enterprise $199/yr).
    - Diverse subscription states: active, pending, cancelled, overdue invoice.
    - Historical invoices and recorded payments.
