# Data handling facts (input for the privacy policy and terms)

A factual list of what FinKit does with personal data, taken from the code. It is **not** the policy and not legal advice: have someone qualified turn it into the policy and terms. Re-check it whenever storage changes.

## What is stored on the server

| Data | Where | Protection | Kept for |
|------|-------|------------|----------|
| Email address, first and last seen | `users` | Plain | Until the database is wiped (no account deletion yet) |
| Learned merchant rules, sheet and display settings | `merchant_categories`, `settings` | Plain | Until the user deletes the rule or setting |
| Budgets: category, currency, monthly limit, whether unspent money carries over, and the month it began | `budgets` | Plain (a limit is not a bank field; the categories are the user's own list) | Until the user deletes the budget |
| An overall monthly spending cap per currency | `budget_caps` | Plain | Until the user removes it |
| Contracts: payee names, amounts, dates, notes, mileage (what the bank showed and what the user added) | `contracts.detected`, `contracts.user_data` | Encrypted (same key), one value each | Until the user deletes a hand-made contract or erases the stored transactions (detected ones go with them) |
| Contracts: owner, currency, state, timestamps, and a keyed fingerprint of the payee used to recognise it again | `contracts` | Plain (the fingerprint reveals nothing about the payee) | Same as above |
| Trips: name, location, names of the other travelers | `trips.name`, `trips.location`, `trips.travelers` | Encrypted (same key), one value each | Until the user deletes the trip |
| Trips: travel dates, budget and its currency, archived flag | `trips` | Plain, so trips can be sorted and the budget compared | Same as above |
| Which transaction is in which trip: opaque ref, kind, category, subcategory, shared flag | `trip_items` | Plain (the ref reveals nothing about the transaction) | Until the transaction is removed from the trip or the trip is deleted |
| Trip items: place (a city) and who paid (a traveler's name) | `trip_items.place`, `trip_items.paid_by` | Encrypted (same key) | Same as above |
| Trip entries added by hand: amount, currency, note | `trip_entries.payload` | Encrypted (same key) | Until deleted with the trip or the entry |
| Trip entries: date | `trip_entries.date` | Plain | Same as above |
| Trip categories the user made | `trip_categories` | Plain | Until the user removes the category |
| Bank connection: bank name, status, consent end date, masked account labels (last 4 of IBAN) | `bank_connections` | Plain | Until disconnected (the secret below is erased on disconnect) |
| Bank session id and the accounts' full IBANs | `bank_connections.secret_blob` | Encrypted (AES-256-GCM, key from `BANKING_ENCRYPTION_KEY`) | Until disconnected or replaced, then erased |
| Synced bank transactions: amount, currency, description, counterparty name and IBAN, own IBAN, bank and account details | `bank_transactions.payload` | Encrypted (same key), one value per transaction | Until the user deletes them or disconnects the bank |
| Synced bank transactions: booking date | `bank_transactions.tx_date` | Plain text, so the database can filter and sort by date range without decrypting every row | Same as above |
| Alongside each transaction: owner id, connection id, when it was stored, and an opaque keyed fingerprint used to skip repeats | `bank_transactions` | Plain (the fingerprint reveals nothing about the transaction) | Same as above |
| Sync history (when, which bank, how many, error kind) | `bank_sync_log` | Plain | 90 days |
| Audit trail (who did what, with emails) | `bank_audit_log` | Plain | 365 days |
| One-time sign-in states for connecting a bank | `bank_auth_states` | Plain | Ten minutes, purged on start-up |

Not stored on the server: transactions imported from files (CSV, XLSX). They stay in the user's browser.

## What is stored in the browser

Parsed transactions and optionally the session (IndexedDB, "remember session"), categories, splits and exclusions the user chose. Deleting the server copy does not clear this.

## Who else receives data

- **Enable Banking** (bank connection provider): receives the user's choice of bank and returns account and transaction data under the user's own consent. FinKit never sees bank passwords. When a person presses Sync, their IP address and browser string are forwarded to the bank (through Enable Banking) so the bank can tell a person is present; FinKit does not store them. Scheduled syncs send neither.
- **Cloudflare Access**: signs people in and supplies their email address to the API.
- **Google Sheets**: only when the user exports; receives the monthly summary row they chose, into a spreadsheet they control.
- **The hosting provider**: runs the server and holds the database file and its backups.
- Nothing is sold, shared for advertising, or sent to analytics or crash-reporting services.

## Bank consent

Access is read-only and lasts the bank's allowed period (typically 90 to 180 days). The user can revoke it at any time by disconnecting. When consent runs out, syncing stops until they reconnect. Scheduled syncs run about twice a day while consent is active.

## How people exercise their rights today

- **See their data:** the Banks and Transactions pages; stored transactions are also returned by `GET /api/banking/transactions`.
- **Delete synced transactions:** Banks → Stored bank data, or disconnect the bank (removes what came through it).
- **Delete rules and settings:** Settings.
- **Withdraw consent:** disconnect the bank, which also revokes access at the bank.
- **Not available yet:** deleting a whole account (email, rules, settings, logs) and a downloadable export of all server-side data. Until built, these have to be done by the operator on request.

## Access control

Only people on `ALLOWED_USER_EMAILS` and signed in through Cloudflare Access can use the API. Every stored row carries its owner and every query filters by it. Connection secrets and transaction text are encrypted at rest. Backups of the database contain the same data and the same protection.

## Open points to settle before publishing

1. Legal basis and the controller's identity and contact details (for a self-hosted setup, that is whoever runs it).
2. Whether a fixed retention period for transactions is wanted (currently: until deleted or disconnected).
3. Build account deletion and data export, or state the manual process.
4. Backup retention at the host.
5. Where the server runs (country), for transfer wording.
