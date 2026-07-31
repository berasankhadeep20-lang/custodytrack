# Software Requirements Specification (SRS)
## Project: CustodyTrack — PNR-Linked Linen Accountability System for Indian Railways

Version 0.2 — Scope finalized

---

## 1. Purpose

Coach attendants on Indian Railways are held financially liable (via salary deduction) when blankets, pillows, bedsheets, or towels issued to passengers are not returned at the end of a journey — even though the attendant has no practical mechanism to prevent a passenger from walking off with linen.

**CustodyTrack** shifts accountability from the attendant to the actual custodian of the item — the passenger — by digitally recording issue and return of each linen item against the passenger's PNR/berth, with lightweight acknowledgment at issue time. Missing items are flagged against the passenger's record instead of the attendant's payroll.

This is a **custody chain-of-record** system, not a surveillance or theft-detection system.

## 2. Scope (finalized)

### 2.1 Linen kit
Full kit tracked per berth: **blanket, pillow, bedsheet ×2, towel** — 5 items per berth, each individually issued/returned.

### 2.2 Acknowledgment method
**OTP and QR code, used alternatively** — attendant's device offers both options per berth:
- **OTP path**: simulated OTP sent to passenger's (simulated) registered mobile; passenger reads it out, attendant enters it.
- **QR path**: attendant's device shows a QR code; passenger scans it with any phone camera, which opens a one-tap confirmation page (no app install needed) that logs the acknowledgment.
Either path produces the same custody record. This matters for offline resilience — QR confirmation can be logged locally even without SMS delivery working, so attendant isn't blocked if OTP delivery fails mid-route.

### 2.3 Localization
**English only** for MVP. (Hindi deferred — dropped from v0.1 draft scope.)

### 2.4 Out of scope (unchanged)
Real IRCTC/PRS integration, physical hardware (RFID/CV), payment/fine collection, multi-operator support.

## 3. Stakeholders & Actors
(unchanged from v0.1 — Attendant, Passenger, TTE, Back-office Admin, Simulated PNR system)

## 4. Functional Requirements (updated)

**FR-1** — Attendant logs in, loads passenger/berth chart for assigned coach+journey (synthetic reservation data).

**FR-2** — For each berth, attendant marks each of the 5 linen items as *issued*, timestamped, individually trackable.

**FR-3** — On issue, attendant chooses **OTP or QR** acknowledgment per berth (not per item — one ack covers the whole berth's kit). Either path writes an identical custody record: `item + berth + PNR + timestamp + ack_method + ack_value`.

**FR-4** — Attendant marks items *returned* per berth, any time before passenger's destination stop, item-by-item.

**FR-5** — At passenger's destination stop, any item still *issued* is auto-flagged *unresolved* against that PNR.

**FR-6** — End-of-journey reconciliation report per coach: per-item status per berth.

**FR-7** — Unresolved items visible to TTE/back-office with PNR reference, decoupled from attendant payroll.

**FR-8** — Offline-first: local cache, sync on reconnect. QR ack path must work fully offline (SMS/OTP path degrades gracefully if no network).

**FR-9** — Admin dashboard: aggregate loss rates by train/route/time-of-day.

**FR-10** — English-only UI for MVP.

## 5–7. Non-Functional Requirements, Assumptions, Success Criteria
(unchanged from v0.1 draft — see project history)

---

### Next step
System architecture (client/server split, offline-sync strategy, why QR-based ack needs a specific conflict-resolution approach when synced later) — to be built next, before any database schema work.
