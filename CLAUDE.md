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

## Tests

- Colocate tests as `*.test.ts` (vitest). Any change to access, per-user scoping or encryption needs a test.

## Read when relevant

- Frontend work: `docs/web-architecture.md`
- Auth, allowlist, per-user data, Sheets access: `docs/users-and-access.md`
- Bank sync: `docs/enable-banking-setup.md`
- Google Sheets export: `docs/google-sheets.md`
- Docker, secrets, production env: `docs/deployment.md`
- Env vars: `.env.example` (production), `api/.env.example` (local)
