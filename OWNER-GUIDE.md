# StayDesk — Demo PMS · Owner Guide

**DEMO — sample data only, not connected to any real hotel system.** Nothing here charges a card, sends an email, or changes a real booking. It is a safe place to practise front-desk workflows.

## The 60-second tour

1. **Dashboard** — today's arrivals, departures, occupancy, rooms needing cleaning, today's revenue, and the last 8 actions.
2. **Front Desk** — search reservations by guest name, confirmation (e.g. `SD-1004`), or room. Filter by Arriving Today / In-House / Departing Today / Reserved. Click any row to open its detail panel.
3. **Rooms / Tape Chart** — every room as a coloured card. Green = Vacant Clean, amber = Vacant Dirty, blue = Occupied Clean, orange = Occupied Dirty, red = Out of Order. Click a room for actions.
4. **Housekeeping** — tasks grouped To Clean / In Progress / Inspected / Done. Reassign staff from the dropdown. Use **Assign all vacant-dirty** to create tasks for every dirty vacant room at once.
5. **Billing / Folios** — click a folio to see room charges, tax, incidentals, payments, and balance. Add charges/payments, print a demo invoice, or Check-Out & Settle.
6. **Guests** — one row per guest (grouped by name + phone) with stay count, total spent, and editable notes. Click a row for stay history.
7. **Reports** — occupancy for the next 7 days, arrivals/departures for today + tomorrow, housekeeping completion %, and revenue from folios.
8. **Settings** — rename the demo property, change tax % and room rates, export data as JSON, reset the sample, or clear all data.

## The full stay, step by step

1. **New Reservation** (top-right or Dashboard): fill in guest, dates, room type. The rate fills in automatically — you can change it. Leave the room blank to assign it at check-in, or type one (e.g. `102`). You get a confirmation code like `SD-1019`.
2. **Check-In**: open the reservation → **Check-In**. If no room was assigned, the demo picks the first vacant-clean room of that type. The room card turns blue (Occupied Clean).
3. **During the stay**: from the reservation or folio, **Add Charge** (e.g. Minibar $12) and **Add Payment** (Card/Cash). The folio balance updates immediately.
4. **Check-Out**: open the folio → **Check-Out & Settle**. If a balance remains, the demo asks you to confirm settling with the remaining balance. After check-out the room turns amber (Vacant Dirty) and a housekeeping task is created.
5. **Housekeeping**: find the room's task → **Start** → **Mark Clean** (or **Mark Inspected** → **Mark Done**). The room card turns green (Vacant Clean) and is ready for the next guest.

## Other things to try

- **Walk-In**: Front Desk → Walk-In creates + checks in a guest in one step.
- **Modify / Cancel / No-Show**: all in the reservation detail panel. Cancelling or no-showing frees the room.
- **Room actions**: click any room card → Mark Clean / Mark Dirty / Mark Out of Order / Back in Service / Assign to Reservation / View Folio.
- **Report Issue**: on any housekeeping task — it flags the room and appends the issue note.
- **Print a demo invoice**: open any folio → Print / Download Invoice → use the browser print dialog (Print to PDF works too).

## Colours & statuses

| Reservation | Meaning |
|---|---|
| Reserved | Booked, not yet arrived |
| Checked In | In-house |
| Checked Out | Stay finished, folio closed |
| Cancelled | Booking cancelled, room freed |
| No-Show | Guest did not arrive, room freed |

## Settings & data

- Everything is saved in **this browser only** (localStorage). Another browser or device starts fresh.
- **Export Data (JSON)** downloads a copy of the current demo state.
- **Reset Demo Data** restores the original 24 rooms / 18 reservations / 12 tasks.
- **Clear All** empties everything — use Reset afterwards to bring the sample back.

## What this demo does NOT do

- No real payments, refunds, or card processing.
- No real emails, texts, or guest notifications.
- No connection to any booking site, channel manager, or real PMS.
- No real guest data — every name, phone, and email is fictional.
