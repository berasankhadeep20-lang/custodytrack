# CustodyTrack

A PNR-linked linen custody system for Indian Railways coaches — built to fix a specific,
well-documented unfairness: coach attendants have blanket/pillow costs deducted from their
salary when passengers don't return them, despite having no real way to prevent it.

CustodyTrack ties every issued linen item (blanket, pillow, 2 bedsheets, towel) to the
passenger's berth and PNR via an OTP or QR acknowledgment at issue time. Anything not
returned at journey's end is flagged against the **passenger's** record — not the attendant's.

**Live status page:** https://berasankhadeep20-lang.github.io/custodytrack/

## Status

This is a portfolio project being built incrementally and documented at each stage —
requirements, architecture, schema, API, then implementation. Current stage: **Phase 1 code
written (attendant login + read-only berth chart) — run it against your own Supabase project
per `frontend/README.md` once Phase 0 is live.** See the live status page above for the
up-to-date roadmap.

## Repo structure

```
custodytrack/
├── docs/         # SRS, architecture, schema, API design docs as they're written
├── site/         # Static status/landing page, deployed to GitHub Pages
├── frontend/     # Attendant + admin web app (React + Vite + Tailwind) — not yet built
├── backend/      # API server — not yet built
└── .github/workflows/deploy.yml   # Auto-deploys site/ to GitHub Pages on push to main
```

## Docs

- [`docs/SRS.md`](docs/SRS.md) — Software Requirements Specification (v0.2, finalized scope)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture: offline-first attendant
  app (React + IndexedDB outbox) syncing to Supabase (Postgres + PostgREST + Auth + Realtime),
  with the idempotency-key strategy used to resolve OTP/QR ack conflicts
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — Postgres schema: event-sourced `custody_events` log,
  `berth_acks` (primary key enforces one ack per berth), derived-state views, and RLS policies
- [`docs/API.md`](docs/API.md) — RPC functions for writes, PostgREST reads, and the sync
  outcome taxonomy (ok / duplicate / auth-error / validation-error / network-error) the
  offline outbox depends on
- [`docs/MODULES.md`](docs/MODULES.md) — Frontend file structure and backend migration
  layout, including the OTP-vs-QR auth asymmetry surfaced while breaking this down (QR needs
  a public, token-based confirmation route since the passenger has no login)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Phased build order (each phase ends with something
  demoable) and a `gh` CLI script to populate the GitHub Project board
- [`backend/migrations/`](backend/migrations) — the real SQL: 001-006, ready to run against a
  Supabase project
- [`backend/seed/`](backend/seed) — synthetic reservation-chart data + a Node script for the
  demo attendant login
- [`backend/PHASE0_SETUP.md`](backend/PHASE0_SETUP.md) — step-by-step: create the Supabase
  project, run migrations, seed data, verify RLS with curl
- [`frontend/`](frontend) — Phase 1 attendant app (React + Vite + Tailwind): login + read-only
  berth chart. See [`frontend/README.md`](frontend/README.md) to run it locally.

## Scope (MVP)

- Full linen kit tracked per berth (blanket, pillow, 2 sheets, towel)
- OTP or QR acknowledgment, used interchangeably per berth
- Offline-first attendant app (Indian Railways coaches have patchy connectivity)
- English-only UI
- Synthetic PNR/reservation data (no real IRCTC/CRIS integration — that would require an
  institutional partnership out of scope for a portfolio project)

## Author

Ronnie (Sankhadeep Bera) — BS-MS Physics, IISER Kolkata
