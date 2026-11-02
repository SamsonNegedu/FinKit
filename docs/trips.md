# Trips: getting transactions into a trip

Background on trips themselves is in [web architecture](./web-architecture.md#trips). This page covers how transactions get into one with few clicks.

Only **synced** bank transactions can join a trip: an imported file has no server reference (`ref`). Everything below skips imported rows.

## Three ways in

1. **The trip page's staging panel** (`TripSuggestions`). Pick a date range (the travel dates to begin with). Every synced transaction in it that isn't in a trip is ticked. Untick what doesn't belong, then add the rest with one button. A trip with no dates starts with an empty range.
2. **"Booked earlier"**, in the same panel. Every flight and stay paid before the range, however long before, listed **unticked** and nearest first (six show, the rest behind "Show more"). A booking can be made a year ahead and a past trip can be sorted out years later, so there is no cutoff. A booking doesn't name its destination, so it is offered, never assumed.
3. **The Transactions page.** Select rows (shift-click selects the range between two rows in List view; a tip appears after the first row), then use the bulk bar's Trip action. The dialog lists what's selected, ticked; untick strays. The trip is pre-selected as the one whose dates hold most of the selection.

"Hide the N unticked for this trip" stores the refs in `localStorage` (`finkit.trip-skipped.<tripId>`), so they stop being offered. That is a browser convenience, not synced.

The Trips page also lists flights and stays that aren't in a trip ("Start a trip"), newest first, four at a time with "Show more". There is no cutoff on age. The chosen booking joins the new trip. These skips use the key `finkit.trip-skipped.starters`.

## Guessing the category

`web/src/features/trips/utils/tripGuess.ts` maps a payee's name and text to a trip category and subcategory (Ryanair → Transport › Flight, Booking.com → Accommodation, and so on). The first matching rule wins. Anything it can't place becomes `Other`.

- The category names are the server's built-in ones (`DEFAULT_TRIP_CATEGORIES` in `api/src/trips/trips.service.ts`). If those change, the rules must change with them.
- `isTravelBooking` is deliberately narrower (flights and places to stay). It decides what is offered as "booked earlier" or a trip starter. A restaurant or a fuel stop proves nothing about a trip.
- The lists are keyword lists, biased towards European merchants. Add to them when a real description is missed; `tests/tripGuess.test.ts` shows the shape.

## What is deliberately not used

- **No foreign-currency detection.** Enable Banking transactions are mapped from `transaction_amount`, which is in the account's own currency, so a euro card shows foreign purchases as euros. The original amount and currency aren't read from the API (`mapEbTransaction`). Whether a bank fills them in varies and hasn't been checked against real syncs. Detection built on it would only work for multi-currency accounts.
- **No AI.** Transaction descriptions stay on your side; nothing is sent to a third party.
- **No automatic adding.** Every suggestion needs a click, and every one can be dismissed.

## Not built

Auto-adding new synced transactions that fall inside a trip's dates (needs a server change). Range selection on touch screens (no Shift key).

## Tests

`web/src/features/trips/tests/tripGuess.test.ts` and `tripCandidates.test.ts`.
