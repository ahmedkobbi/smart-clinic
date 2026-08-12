# ADR-001: Electron Desktop with PGlite for On-Premise

## Status
Accepted — 2026-08-12

## Context
The master prompt (§2, §8.3) requires Smart Clinic to ship as both a multi-tenant SaaS and a single-tenant on-premise "Clinic-in-a-Box" that works fully offline. The on-prem edition must run on a local server/NUC with full offline operation and later sync.

Key constraints:
- Same codebase for SaaS and on-prem (§5.2)
- Offline-first: check-in, note-taking, billing must work during internet outage (§5.7)
- Clinical data never leaves the clinic boundary without explicit consent (§9, §14)
- Must be deployable on a local NUC (low resource)

## Decision
Use **Electron** to wrap the existing Next.js application for the desktop edition, with **PGlite** (embedded PostgreSQL) as the local database.

### Why Electron (not Tauri, not React Native)
- **Tauri** uses system webviews (WebKit/WebView2/WebKitGTK) which have rendering inconsistencies for our glassmorphic UI (backdrop-filter, oklch colors). Bundled Chromium in Electron guarantees one rendering engine.
- **React Native** would require rewriting all 50+ React components, losing Recharts/Mantine/Framer Motion compatibility. RN has no CSS, no backdrop-filter, no Recharts equivalent.
- **Electron** powers VS Code, Slack, Figma Desktop — battle-tested at scale. Healthcare auditors have seen it before. Native module ecosystem (keytar, node-twain for scanners, fido2) is mature.
- Memory overhead (~300MB) is irrelevant for clinic workstations (always-on desktops with 8-16GB RAM).

### Why PGlite (not SQLite)
- **Real PostgreSQL**: RLS, pgvector, JSONB, same SQL dialect as SaaS production → zero SQL porting.
- **SQLite** would require rewriting queries (different SQL dialect, no RLS, no pgvector).
- PGlite is WASM-embeddable (~3MB), backed by PostgreSQL core team (Supabase).
- Drawback: no native at-rest encryption → wrap with OS-level disk encryption (FileVault/BitLocker/LUKS) + application-level field encryption for ultra-sensitive PHI.

## Consequences
- **Positive**: 95% code reuse with SaaS. Same Prisma schema (swap SQLite → PGlite adapter). Same UI components. Same API routes.
- **Positive**: Real offline capability — PGlite runs in-process, no external DB server needed.
- **Negative**: ~120MB bundle size, ~300MB RAM baseline (acceptable for desktop).
- **Negative**: Code signing required ($300-400/yr for Windows EV cert, $99/yr Apple Developer ID).
- **Risk**: PGlite is 1 year old — have SQLite fallback shim in ORM layer.

## Related
- ADR-002: Licensing server architecture
- Master prompt §8.3, §9
