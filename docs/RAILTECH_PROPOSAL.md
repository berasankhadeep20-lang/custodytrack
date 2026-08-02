# RailTech Portal Proposal: CustodyTrack

**A PNR-linked custody record for onboard linen, shifting financial liability
from coach attendants to the passengers actually responsible**

---

## 1. Innovator details

*(fill in before submitting)*

- **Name:** Sankhadeep Bera ("Ronnie")
- **Institution:** IISER Kolkata, BS-MS Physics
- **Contact email / phone:**
- **GitHub / portfolio:** github.com/berasankhadeep20-lang
- **Submission type:** Individual innovator (student)

## 2. Problem statement — with real scale

Per an RTI investigation (The Indian Express, replies from 54 of 69 railway
divisions across 16 zones, published July 2026):

- **1.27 crore linen items** — bedsheets, towels, blankets, pillows, pillow
  covers — went missing from AC coaches between January 2022 and May 2026.
- Estimated financial loss: **₹104.51 crore**, likely an undercount since 9
  divisions didn't disclose cost figures at all.
- Theft has **risen 56% since 2022**.
- Roughly **1 in every 1,000 AC passengers** walks away with at least one
  item per trip.
- Breakdown by item: face towels (46.54 lakh), bedsheets (41.13 lakh),
  pillow covers (23.59 lakh), blankets (12.95 lakh), pillows (2.76 lakh).

**The part that makes this a liability problem, not just a loss problem:**
Railways recovers this cost from the linen contractors' bills, and
contractors pass it directly to attendants' wages. Reported deduction rates
vary by zone/contractor but commonly cited figures include ~₹55–115 per
missing pillow, ~₹198–250 per bedsheet, and up to ~₹1,100 per blanket. For an
attendant earning roughly ₹15,800–21,000/month, reported deductions of
₹2,000–3,000/month for linen they had no practical way to prevent going
missing represent a significant, recurring share of take-home pay.

## 3. Existing measures — and the specific gap they don't close

Railways is already investing in this problem, and any credible proposal
needs to say so plainly rather than presenting this as an unaddressed gap:

- **Coach Mitra** (CRIS) — staff-facing app for attendance, cleanliness
  inspection, and GPS-based linen distribution/boarding alerts.
- **CCTV expansion** in coach vestibules and common areas.
- **QR code pilots** for linen tracking in some zones.

**What none of these do:** shift financial accountability away from the
attendant. They improve *detection* and *operational logging* on the
staff/Railways side, but the moment an item goes missing, the cost still
lands on the attendant by default, because there's no record tying that
specific item to the specific passenger who had custody of it.

**CustodyTrack's entire design is built around exactly that gap.** It's not
a competing linen-tracking system — it's a custody *chain-of-record*: every
item issued gets tied to a passenger's PNR via an OTP or QR acknowledgment
at issue time. If it's not returned, the *passenger's* record is flagged,
not the attendant's payroll. It's designed to sit alongside Coach Mitra, not
replace it — Coach Mitra's boarding/attendance data is a natural future
integration point rather than something to duplicate.

## 4. Technical readiness

This isn't a concept pitch — it's a working, tested system:

- **Live status page:** https://berasankhadeep20-lang.github.io/custodytrack/
- **Source (public):** https://github.com/berasankhadeep20-lang/custodytrack
- **Architecture:** offline-first PWA (React), since coach connectivity is
  unreliable — actions queue locally and sync automatically once
  connectivity returns, verified through live testing including simulated
  network loss.
- **Backend:** Postgres with row-level security enforcing that an attendant
  can only act on berths they're actually assigned to, and an event-sourced
  audit log (every issue/return/acknowledgment is an immutable record, not a
  mutable status field) — this is the property a real deployment's audit and
  dispute-resolution needs would actually require.
- **Full documentation trail:** requirements spec, architecture doc, database
  schema with design rationale, API design, and a written record of every
  bug found and fixed during live testing — see `WRITEUP.md` in the repo.
- Current implementation uses synthetic PNR/reservation data, since real
  PRS/CRIS integration requires institutional access this proposal is
  specifically asking for.

## 5. Categorization

- **Vital/non-vital:** Non-vital (does not affect train safety or operations)
- **Safety-critical:** Non-safety-critical
- **Domain:** Passenger services / onboard administration
- **Third-party interfacing needed:** Read access to PRS/PNR data scoped to
  berth-to-passenger-to-contact mapping for the relevant journey only (no
  payment or full passenger-record access required)

## 6. Proposed pilot plan

**Phase 1 (single route, single train type, ~90 days):** One zone, one AC
train type (e.g., one Rajdhani/Shatabdi-class route with consistent daily
service), a small number of coaches. Attendants use the app alongside their
existing process, not instead of it, so there's no operational risk if
something doesn't work as expected.

**Success metrics for the pilot:**
- % reduction in unreturned-item incidents vs. the same route's prior
  3-month baseline
- % reduction in attendant salary deductions attributable to linen loss on
  piloted coaches
- Passenger acknowledgment completion rate (OTP/QR uptake) — the pilot's
  most important adoption signal
- Zero increase in journey turnaround time attributable to the acknowledgment
  step (attendants must not be slowed down)

**Phase 2 (if successful):** Expand to full zone, begin real PRS integration
discussion with CRIS.

## 7. Cost & funding ask

*(Rough order-of-magnitude only — needs refinement with Railways' own cost
model before this is treated as final.)*

- Development to pilot-ready state (PRS integration work, security review,
  attendant device provisioning support): estimated ₹8–15 lakh
- Requesting Railways' standard 50% development co-funding per RailTech
  Policy terms
- No request for revenue share or licensing during the pilot phase — the
  goal at this stage is proving the model, not monetizing it

## 8. Risks & mitigations

- **Passenger data handling:** only berth/PNR/contact-for-OTP is touched, no
  payment or full profile data; all synthetic in the current build precisely
  because this needs Railways' own data-handling sign-off first.
- **Network reliability on trains:** addressed directly by the offline-first
  architecture — already built and tested, not a future promise.
- **Attendant/passenger friction:** pilot explicitly measures whether the
  acknowledgment step adds meaningful time; designed for a single tap/scan.
- **Integration risk with legacy PRS:** proposal explicitly scopes Phase 1 to
  NOT require real PRS integration — synthetic data proves the mechanism
  first, real integration is a Phase 2 ask once the model is validated.

## 9. IP

Per Railways' stated innovation policy terms, developed IP remains with the
innovator; Railways receives usage rights for the piloted/adopted solution.
