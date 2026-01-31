# 🛠️ Smart Booking System — Multi-Tenant SaaS Platform

## 📌 Project Overview

A smart, multi-tenant booking system built using **Laravel** (API backend), **Vue 3** (web frontend), and **React Native** (mobile app for providers). The platform enables service-based businesses to manage appointments, services, users, and payments — with isolated data per business (tenant).

---

## 🌍 Context

Small and medium-sized service providers like salons, clinics, and freelancers struggle with manual or outdated scheduling tools. This project offers a centralized SaaS solution that gives each provider their own booking portal and admin panel, all while sharing a unified codebase.

---

## 🗂 Agile Backlog (High-Level Features)

| ID  | Feature                                            | Priority  | Notes                     |
| --- | -------------------------------------------------- | --------- | ------------------------- |
| F01 | Multi-Tenant Architecture                          | 🔥 High   | Isolated DBs per provider |
| F02 | Auth System with Roles (Admin, Provider, Customer) | 🔥 High   | Sanctum or Passport       |
| F03 | Booking Calendar System                            | 🔥 High   | Time slots, availability  |
| F04 | Service and Staff Management                       | 🔥 High   | Providers define services |
| F05 | Payments via Stripe/PayPal                         | 🔥 High   | Booking with payment      |
| F06 | Notifications (Email + Push)                       | 🔥 High   | Firebase for mobile       |
| F07 | Admin Dashboard (Vue)                              | 🟡 Medium | Analytics, user mgmt      |
| F08 | Provider Mobile App (React Native)                 | 🟡 Medium | Notifications, calendar   |
| F09 | Tenant Onboarding Flow                             | 🔥 High   | Subdomain or slug based   |
| F10 | PDF Invoices & Receipts                            | 🟢 Low    | Bonus feature             |

---

## 📅 Project Phases and Tasks

### ⚙️ Phase 0 – Project Setup (3 days)

- [ ] Create GitHub repo and setup monorepo (optional)
- [ ] Initialize Laravel backend and configure DB
- [ ] Scaffold Vue 3 frontend with Vite + Tailwind CSS
- [ ] Bootstrap React Native project with navigation

---

### 🧭 Phase 1 – Multi-Tenant Setup (5 days)

- [ ] Research and decide on tenancy approach (e.g., `tenancy/tenancy`)
- [ ] Install and configure Laravel tenancy package
- [ ] Implement subdomain or workspace slug logic
- [ ] Build tenant onboarding flow (registration, DB provisioning)
- [ ] Create tenant-aware middleware and service provider
- [ ] Refactor API endpoints to respect tenant context

---

### 🔐 Phase 2 – Authentication (4 days)

- [ ] Laravel Auth with Sanctum or Passport
- [ ] Role setup: Customer, Provider, Admin
- [ ] Vue: Register/Login/Forgot Password UI
- [ ] React Native: Auth screens

---

### 📅 Phase 3 – Booking Core (8 days)

- [ ] Create models: Services, Providers, TimeSlots, Bookings
- [ ] Availability logic (avoid overlaps, working hours)
- [ ] API endpoints: book, cancel, reschedule
- [ ] Vue: Booking interface, calendar view
- [ ] React Native: Provider calendar & management view

---

### 💳 Phase 4 – Payments & Notifications (5 days)

- [ ] Stripe or PayPal integration (Laravel backend)
- [ ] Vue: Payment page in booking flow
- [ ] Email notifications via Laravel Notifications
- [ ] Firebase push notifications setup for mobile

---

### 📊 Phase 5 – Admin Panel (3 days)

- [ ] Vue layout for admin dashboard
- [ ] Manage bookings, users, and services
- [ ] Analytics: total revenue, bookings, active users

---

### 🚀 Phase 6 – Testing & Deployment (3 days)

- [ ] Laravel unit and API tests
- [ ] E2E tests for Vue and React Native
- [ ] Deploy backend on VPS or Laravel Forge
- [ ] Configure subdomain routing and DNS

---

### 🧽 Phase 7 – Buffer & Polish (2 days)

- [ ] Bug fixes and UI polish
- [ ] Optional features (PDF receipts, service reviews)
- [ ] Performance tuning

---

## ⏱️ Total Estimated Duration: ~33 days

---

## 📦 Deliverables

- [ ] SaaS Booking Web App (Vue 3)
- [ ] Provider Mobile App (React Native)
- [ ] Multi-tenant Laravel REST API
- [ ] Tenant Onboarding & Subdomain Routing
- [ ] Deployment Documentation
- [ ] Admin Dashboard

---

## 📈 Optional Stretch Goals

- Google Calendar sync
- SMS notifications
- Service ratings and testimonials
- Multi-language support
- Custom domain per tenant

---

# 🌲 Tree Timeline Flow Diagram

## 📌 Legend

| Symbol | Meaning                           |
| ------ | --------------------------------- |
| 🟢     | Start Node                        |
| 🔴     | Critical Path                     |
| 🟡     | Blocked Task (depends on another) |
| ⚪     | Parallel / Independent Task       |

---

## 🔄 Project Timeline Diagram (Horizontal Tree Flow)

```
🟢 Project Setup                                                                                                                                🟢 React Native App Init
     |                                                                                                                                                     |
     v                                                                                                                                                     |
🔴 Multi-Tenancy Setup
     |                                                                                                                                                     |
     v                                                                                                                                                     |
🔴 Authentication System
     |                                                                                                                                                     |
     +-------------------------------------------+---------------------------------+------------------------------+                                        |
     |                                           |                                 |                              |                                        |
     v                                           v                                 v                              v                                        |
🔴 Booking Core Logic                     ⚪ Admin Panel               ⚪ Tenant Onboarding UI           ⚪ Multi-language                               |
     |                                                                                                                                                     |
     +----------------------------------------------------+------------------------------------------------+-----------------------------------------------+
     |                                                    |                                                |                                               |
     v                                                    v                                                v                                               v
🔴 Payments & Notifications           🟡 PDF Invoicing Module (post-Booking Core)     🟡 Service Ratings (post-booking flow)     🟡 Provider Booking App (blocked by Booking Core)
     |                                                    |                                                |                                               |
     +-----------------------------------------------------------------------------------------------------------------------------------------------------+
     |                                                    |                                                |                                               |
     |                                                    |                                                |                                               v
     |                                                    |                                                |                                    🟡 Mobile Notifications
     |                                                    |                                                |                                               |
     |                                                    v                                                v                                               v
     +----------------------------------------------------+------------------------------------------------+-----------------------------------------------+
     |
     v
🔴 Testing & Deployment
     |
     v
🔴 Buffer & Polish Phase
```

---

## 📋 Tips

- Treat the **critical path** as non-negotiable deadlines.
- Assign a separate team (or async sprint) for ⚪ features to avoid bottlenecks.
- Visual tools like this help in retrospectives and sprint planning.

