# FinKit

Self-hosted personal finance app. `api/` is NestJS + SQLite, `web/` is React + Vite. Node 26.13+.

## Commands

- `npm run dev`: API :3003 and web :5173
- `npm test`: api and web tests
- `npm run check`: lint and format check; run before finishing
- `npm run lint:fix && npm run format`: auto-fix (format after lint:fix)

## Rules that always apply

- File-imported transactions stay in the browser. Never send them to the API.
- All server data is scoped per signed-in user. Never read or write across users.
- No telemetry, analytics or third-party trackers.
- Never commit secrets. `secrets/`, `.env` and `api/.env` are gitignored.

## Code style

- Comments explain why, not what: a constraint, a trade-off, or a coupling. Example: the merchant normalizer exists in both api and web and the two must match, and the comment says so.
- No comments that restate the code, no commented-out code, no TODOs without a reason.
- Lint rules (oxlint) require `curly` braces, one statement per line, and a blank line before `return` and after variable declarations.
- Validate every request body, param and query with a Zod schema (`*.schemas.ts` plus the zod validation pipe). Don't trust raw input.

## Database (api, SQLite via better-sqlite3)

- Access the DB only through a repository or store class. Controllers and services don't run SQL.
- Prepared statements only, created once in the constructor. Never build SQL by string concatenation.
- Every user-owned table has `user_id`, and every query filters on it.
- Schema changes are idempotent migrations (`hasColumn` in `shared/database/migrate.ts`) that keep existing rows. Never drop user data.
- Descriptive bank fields and bank session ids are encrypted at rest with `shared/crypto/encryption.ts`. Don't write them in plaintext.

## Security

- Never log tokens, session ids, IBANs, transaction descriptions or emails.
- Changing requests (POST/PUT/PATCH/DELETE) go through `CsrfGuard`: `X-Finkit: 1` header plus the allowed origin. Don't bypass it.
- The `X-Dev-User` header works only outside production. Don't extend that.
- Never put a bank account id in a URL; use the derived `accountRef`.
- Validate Sheets tab names and column letters before any Google call.
- Keep secrets out of git and out of error messages.

## UI components

- Never use native form controls (`<select>`, `<input type=date>`, `alert`/`confirm`) where a shared component exists. Check `web/src/shared/components/` first (forms: `Select`, `DatePicker`, `Modal`, `ConfirmDialog`, `Tabs`, `Checkbox`, `RadioGroup`). `Select` is for a value in a form. Pick a category as an action with `transactions/CategoryPopover` (or `CategoryList` inside your own popover) and show one with `CategoryIcon`. Switch between views of the same thing with `SegmentedControl`, tabs that are pages with `TabLinks`, tabs with content with `Tabs`. Anything that opens over the page is a Radix Popover, Dialog or DropdownMenu, never a hand-built absolute `div` with its own click-outside code. A hint on a button or icon is a `Tooltip`, not the `title` attribute (a `title` is fine only to reveal text that is cut off with an ellipsis).
- If none fits, use the best-fitting shadcn/ui component (built on Radix, which the app already uses), restyled to the app's theme. Put it in `shared/components/` if a second feature could use it.

## New pages

A page isn't done until it matches its siblings. Open an existing page (e.g. Recurring payments, the `contracts` feature) and mirror all of it:

- Route in `app/router.tsx` and a sidebar entry in `app/shell.tsx`.
- Breadcrumb label in `shared/components/layout/Breadcrumbs.tsx`. Its fallback prints the raw path segment, so a missing entry shows a lowercase title.
- `PageHeader` for the title, sentence-case labels, and the same card, button and input classes as the other pages.
- Look at the running page before finishing, not only the code.

## Tests

- Colocate tests as `*.test.ts` (vitest). Any change to access, per-user scoping or encryption needs a test.

## Read when relevant

- Frontend work: `docs/web-architecture.md`
- Auth, allowlist, per-user data, Sheets access: `docs/users-and-access.md`
- Bank sync: `docs/enable-banking-setup.md`
- Google Sheets export: `docs/google-sheets.md`
- Budgets: `docs/budgets.md`
- Trips (adding transactions, category guessing): `docs/trips.md`
- Docker, secrets, production env: `docs/deployment.md`
- Env vars: `.env.example` (production), `api/.env.example` (local)
