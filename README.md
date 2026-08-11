# Smart Clinic

**Enterprise Clinical Practice Management Platform — Cloud SaaS + On-Premise**

Smart Clinic is an advanced, premium, enterprise-grade practice-management platform for clinics and private practices ("cliniques" and "cabinets") across all specialties — general medicine, dental, physiotherapy, psychology/psychiatry, dermatology/aesthetics, ophthalmology, gynecology, pediatrics, and multi-specialty polyclinics.

Built with a **Liquid Glass** design language (inspired by One UI 8.5), **offline-first** architecture, **secure-by-design** principles, and an **AI-assisted** clinical workflow that stays strictly human-in-the-loop.

---

## ✨ Features

### Core Modules
- **Dashboard** — Real-time KPIs (active patients, today's appointments, revenue, no-show rate), 7-day appointment chart, revenue trend, specialty breakdown, no-show risk distribution, today's schedule, alerts panel.
- **Patients (EHR/DPI)** — Patient list with search, detail drawer with **unified cross-specialty Patient Timeline**, allergies, vitals, consultations, prescriptions, invoices, consent records.
- **Appointments** — Day/week calendar view, multi-practitioner scheduling, no-show risk scoring, walk-in support.
- **Clinical Records (EHR)** — Structured consultation notes (chief complaint, HPI, examination, assessment, plan), ICD-10 diagnosis codes, CCAM/NGAP procedure codes, AI-drafted flag with confidence indicator, signed/unsigned status.
- **Billing** — Invoices with CCAM/NGAP line items, CPAM tiers payant (third-party payer), insurance vs. patient share breakdown, payment status tracking, aged receivables.
- **Audit & Compliance** — **Hash-chained (SHA-256) tamper-evident audit log** with chain verification, break-glass access alerts, GDPR consent management, compliance badges (RGPD, HDS v2.0, ISO 27001, SOC 2, WCAG 2.2 AA, EU AI Act, HL7 FHIR R5, WebAuthn).
- **Inventory** — Consumables, medications, equipment with stock levels, reorder thresholds, expiry tracking, total value.
- **Settings** — Tenant config (SIRET, ADELI, RPPS), branches, practitioners, staff, resources, appearance (density modes, theme, language), compliance center.

### Signature Features (per master prompt §13)
1. **Glass UI** — 3-tier elevation (base/raised/floating) with backdrop-blur, ambient gradient background, physics-based spring motion (respects `prefers-reduced-motion`).
2. **Command Palette (⌘K / Ctrl+K)** — Natural-language action launcher with grouped navigation, actions, settings.
3. **Floating Action Dock** — Bottom-anchored glass dock for quick actions (new patient, appointment, consultation, command palette).
4. **Unified Patient Timeline** — Vertical glass timeline unifying consultations, prescriptions, invoices, appointments across specialties.
5. **Hash-Chained Audit Trail** — Each entry's hash includes the previous entry's hash; verification catches any tampering.
6. **AI Scribe Flag** — Consultations can be marked as AI-drafted with confidence %, clearly distinguished from clinician-signed content.
7. **i18n (FR/EN)** — Centralized dictionary, no inline UI strings. FR default (per French launch market), EN toggle. AR/ES/NL/DE on roadmap.
8. **Density Modes** — Comfortable (kiosk/tablet) vs. Compact (clinician back-office).
9. **Dark/Light Themes** — Full theme support with proper contrast for medical data.
10. **Responsive Design** — Mobile drawer nav, adaptive layouts.

---

## 🏗️ Architecture

```
smart-clinic/
├── prisma/
│   └── schema.prisma          # Multi-tenant data model (15+ entities)
├── scripts/
│   ├── seed.ts                # Realistic French clinic data seed
│   └── check-audit.ts         # Audit chain debug tool
├── src/
│   ├── app/
│   │   ├── api/               # REST API routes (Next.js Route Handlers)
│   │   │   ├── dashboard/
│   │   │   ├── patients/[id]/
│   │   │   ├── appointments/
│   │   │   ├── consultations/
│   │   │   ├── invoices/
│   │   │   ├── audit/         # Hash chain verification endpoint
│   │   │   ├── inventory/
│   │   │   └── settings/
│   │   ├── globals.css        # Liquid Glass design system
│   │   ├── layout.tsx
│   │   └── page.tsx           # App shell with view routing
│   ├── components/
│   │   ├── layout/            # Sidebar, TopBar, FloatingDock, CommandPalette, MobileNav
│   │   ├── views/             # Dashboard, Patients, Appointments, Records, Billing, Audit, Inventory, Settings
│   │   └── common/            # StatCard, StatusPill
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── i18n.ts            # FR/EN dictionary + formatters
│       ├── queries.ts         # Tenant-scoped data access layer
│       ├── store.ts           # Zustand UI state
│       └── utils.ts
└── package.json
```

### Data Model
- **Tenant** → has many → Branches, Users, Practitioners, Patients, Resources, InventoryItems, AuditLogs, ConsentRecords
- **Patient** → has many → Appointments, Consultations, Prescriptions, Invoices, Allergies, Vitals, TimelineEvents, ConsentRecords
- **Consultation** ←→ Appointment (1:1 optional), ←→ Practitioner, → has many → Prescriptions
- **Invoice** → has many → InvoiceItems (with CCAM/NGAP codes)
- **AuditLog** — hash-chained: each entry stores `prevHash` + `hash = SHA-256(prevHash | action | entity | entityId | payload | createdAt)`

### Tenant Isolation
Every query is tenant-scoped by construction (enforced in `src/lib/queries.ts`). The data access layer accepts a tenant slug and resolves to a tenant ID; no raw `db.*` calls bypass this layer in application code.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24+ (or Bun 1.3+)
- npm/bun

### Installation

```bash
# Install dependencies
bun install   # or npm install

# Set up the database
bun run db:push     # Creates SQLite database + schema

# Seed realistic French clinic data
bun run scripts/seed.ts
# Creates: 1 tenant, 2 branches, 4 staff, 9 practitioners, 24 patients,
#          128 appointments, 38 consultations, 38 invoices, 12 inventory items,
#          65 hash-chained audit log entries

# Start the dev server
bun run dev
# Open http://localhost:3000
```

### Demo Login
- Email: `admin@cabinet-lumiere.fr`
- Password: `smartclinic2026`

---

## 🎨 Design System — Smart Clinic Glass

Inspired by Samsung One UI 8.5 "Liquid Glass" language, adapted to a clinical-grade system:

| Token | Purpose |
|---|---|
| `glass-base` | Subtle blur (12px), 65% opacity — used for sidebar, top bar, list items |
| `glass-raised` | Stronger blur (20px) + soft shadow — cards, modals |
| `glass-floating` | Strongest blur (32px) + drop shadow — command palette, toasts, floating dock |
| `glass-card` | Raised glass + hover lift transition |
| `glass-button` | Base glass + hover elevation |
| `glass-nav-item` | Active state with left accent bar |
| `glass-dock` | Floating action dock styling |

**Motion:** Spring-based (Framer Motion), 150–300ms, with `prefers-reduced-motion` static fallbacks.

**Color:** Calm clinical palette — desaturated blue-teal primary (`oklch(0.55 0.13 220)`), warm accent for alerts, success/warning/danger status colors. All defined as CSS custom properties, single source of truth.

**Typography:** Geist Sans for UI, Geist Mono for clinical codes (CCAM, NGAP, ICD-10, SSN, RPPS) — visually unambiguous from prose.

---

## 🔒 Security & Compliance (Engineering Targets)

| Control | Status |
|---|---|
| Tenant isolation at data layer | ✅ Implemented |
| Audit log hash-chaining (SHA-256) | ✅ Implemented |
| Audit chain verification | ✅ Implemented (POST `/api/audit`) |
| Break-glass access logging | ✅ Implemented (with mandatory `reason`) |
| Consent management (RGPD) | ✅ Implemented (per-patient, per-purpose) |
| Soft-delete (no hard PHI deletion) | ✅ Implemented |
| TLS 1.3 / mTLS | 📋 Architecture target (deploy with reverse proxy) |
| Field-level encryption (envelope) | 📋 Architecture target (OpenBao/KMS integration) |
| WebAuthn / passkeys | 📋 Architecture target (NextAuth + WebAuthn) |
| OpenFGA ReBAC | 📋 Architecture target (relationship-based access control) |
| HDS v2.0 certification | 📋 Pre-launch requirement for FR market |
| ISO 27001 / SOC 2 Type II | 📋 Pre-launch requirement for enterprise |

> ⚠️ **Disclaimer:** Compliance sections describe *engineering targets and controls to implement*, not certifications the product holds. A qualified DPO, healthcare-compliance counsel, and (if AI clinical-support features ship) a medical-device regulatory specialist MUST review the product before go-live in any jurisdiction.

---

## 🤖 AI Layer — Guardrails First

- **Positioning:** Assistive and administrative (transcription, coding suggestions, scheduling optimization, patient pre-triage routing), **never** a standalone diagnostic or prescribing authority.
- **Human-in-the-loop by construction:** Every AI-generated clinical artifact requires explicit clinician confirmation before persistence. The UI visibly distinguishes "AI-suggested" from "clinician-confirmed" content permanently in the record (see `aiDrafted` flag + confidence % on consultations).
- **Data minimization:** Default to redacting/pseudonymizing identifiers before any content leaves the tenant boundary.
- **Transparency:** Confidence indicators on every AI suggestion; permanent log of AI-suggested vs. human-approved content.
- **Regulatory awareness:** EU AI Act / MDR classification to be revisited as features mature.

---

## 🛠️ Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Meta-framework | Next.js (App Router, RSC, Turbopack) | 16.x |
| UI runtime | React | 19.x |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui + Radix Primitives | latest |
| Motion | Framer Motion | 12.x |
| Icons | Lucide React | latest |
| Charts | Recharts | 2.x |
| Forms | React Hook Form + Zod | latest |
| State | Zustand (client) + TanStack Query (server) | 5.x |
| ORM | Prisma | 6.x |
| Database | SQLite (demo) / PostgreSQL (production target with RLS) | — |

> **Production target:** Per master prompt §6.2, production deployment uses PostgreSQL 18 with Row-Level Security, Valkey (Redis-fork) for cache/queues, MinIO for object storage, OpenFGA for ReBAC, NATS JetStream for events, and OpenBao for envelope encryption. The current SQLite demo is for local development; the Prisma schema is portable to PostgreSQL without changes.

---

## 📋 Scripts

```bash
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run lint         # ESLint check
bun run db:push      # Push schema to database
bun run db:generate  # Regenerate Prisma client
bun run db:migrate   # Create migration
bun run db:reset     # Reset database (destructive)
bun run scripts/seed.ts  # Seed realistic French clinic data
```

---

## 📄 License

Private/Proprietary. © Smart Clinic.

---

*Built per the Smart Clinic Master Build Prompt v1.0. This implementation covers Phase 0 (Foundations) and Phase 1 (MVP) scope from §15 Delivery Roadmap: monorepo scaffold, design tokens, glass UI v1, scheduling, patient records core, basic billing, audit/compliance center, and i18n. Phase 2 (insurance automation, telemedicine, on-prem offline sync) and Phase 3 (AI ambient scribe, plugin marketplace, multi-site orchestration, zero-knowledge vault) are architecture-ready.*
