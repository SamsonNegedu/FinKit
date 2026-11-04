# API architecture

NestJS app on SQLite (`better-sqlite3`). All user-owned data is scoped by `user_id`. File-imported transactions never hit this API.

## Layout

```
api/src/
├── app.module.ts          # wires modules; banking features gated in banking-features.ts
├── access/                # Cloudflare/dev auth, CSRF, guards
├── shared/
│   ├── database/          # migrate.ts, DatabaseService
│   ├── crypto/            # field encryption for bank/session ids
│   └── http/              # ZodValidationPipe, filters, request logger
├── health/
├── users/                 # allowlist, per-user bootstrap
├── settings/              # sheet config, category list KV
├── merchant-rules/        # learned merchant → category
├── transaction-rules/     # custom match rules (banking-gated)
├── budgets/               # limits and caps
├── sheet-export/          # Google Sheets read/write (server-side SA)
└── bank-connections/      # optional; mock or Enable Banking
    ├── connections/       # OAuth, store, status
    ├── sync/              # sync, backfill, auto-sync
    ├── balances/
    └── transactions/      # stored bank txs (encrypted fields)
├── contracts/             # recurring detection (banking-gated)
└── trips/                 # tag stored txs (banking-gated)
```

Banking-dependent modules are registered only when `banking-features.ts` resolves a usable provider (same gate as connections).

## Request path

1. **Controller** — HTTP, guards (`AccessGuard`, `CsrfGuard` on mutating routes), Zod validation.
2. **Service** — orchestration, domain rules, throws `HttpException` / Nest exceptions.
3. **Store / repository** — SQL only here; prepared statements in constructor; every query filters `user_id`.

Never build SQL by string concatenation. Never log tokens, session ids, IBANs, descriptions, or emails.

## Validation

Every mutating body and validated query uses `ZodValidationPipe` with schemas in `*.schemas.ts` (or `*.schema.ts` next to the feature). Do not trust raw `@Body()` without a schema.

## Errors

Map provider/sync failure kinds to HTTP status in small pure modules (e.g. `sync-failure-http.ts`), not nested ternaries in services.

## Domain duplicated on the web

Merchant naming and normalization must stay aligned with the browser:

- API: `contracts/merchant-key.ts`, `contracts/merchant-references.ts`
- Web: `shared/utils/categorizer/`, `merchantFromDescription.ts`
- Shared contract: `docs/merchant-key-cases.json` (both sides run corpus tests)

Change one copy, change the other, and extend the JSON corpus.

## Tests

Colocate `*.test.ts` with features. Use `testing/test-app.ts` for HTTP integration tests. Any change to access scoping, encryption, or per-user isolation needs a test.

## Commands

See root `CLAUDE.md`: `npm run dev`, `npm test`, `npm run check` from `api/`.
