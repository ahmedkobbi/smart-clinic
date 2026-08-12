# ADR-003: Mantine as Primary Component Library

## Status
Accepted — 2026-08-12

## Context
The master prompt (§6.1, §7.3) specifies Mantine 9.5.x as the primary component library, with Headless UI/Radix reserved only for bespoke glass components. The project initially used shadcn/ui (Radix-based) for all components.

## Decision
Migrate all clinic and admin views to **Mantine components**, retaining shadcn/ui only for layout-level bespoke components (sidebar nav, topbar buttons) where the glass interaction needs zero default styling.

### Migration mapping
| shadcn/ui | Mantine | Notes |
|---|---|---|
| Dialog | Modal | opened/onClose/title, overlayProps blur |
| Sheet | Drawer | position="right", size="xl" |
| Input | TextInput | variant="filled", leftSection |
| Select (6-part) | Select | Single data=[{value,label}] prop |
| Label | label prop | Built-in a11y on TextInput/Select |
| Button | Button | variant, color, leftSection, loading |
| Badge | Badge | color, variant="light" |
| ScrollArea | ScrollArea | h prop |
| Tabs | Tabs | Tabs.List/Tabs.Tab/Tabs.Panel |
| Card | glass-card div | Custom CSS class preserved |
| sonner toast | notifications | @mantine/notifications |
| Recharts | @mantine/charts | BarChart, AreaChart, DonutChart |

### What's retained as shadcn/Radix (the ~20% bespoke)
- Sidebar navigation (glass-nav-item with active indicator)
- Topbar buttons (glass-button with press feedback)
- Floating dock (glass-dock with physics)
- Login screen (custom glass card layout)

## Consequences
- **Positive**: 120+ accessible components, CSS-variables based, built-in dark mode/RTL.
- **Positive**: Reduced boilerplate (Mantine Select is 1 line vs shadcn's 6-part API).
- **Positive**: @mantine/charts, @mantine/notifications, @mantine/spotlight replace 3 third-party libs.
- **Negative**: Two CSS systems (Mantine + Tailwind) — managed via Preflight coexistence.
- **Risk**: Mantine 9.5 Spotlight API differs from docs (Spotlight not SpotlightProvider).

## Related
- Master prompt §6.1, §7.3
