# Web frontend architecture

Feature-based layout: **`app/`** wires the shell, **`features/`** own product areas, **`shared/`** holds cross-cutting code. Features may import from `shared/` only—not from other features.

## File size

Keep source files around **200 lines** or less (excluding generated assets). Split by component, hook, or pure module when a file grows beyond that. Vitest specs may live in several files under a feature’s `tests/` folder.

## Explicit state machines

Multi-step UI and async flows use **discriminated unions + reducers** (not scattered booleans). Prefer reading `workspacePhase`, `TableInteraction`, etc. over inferring from many flags.

| Area | Types / module |
|------|----------------|
| Workspace restore & import | `shared/contexts/workspace/workspacePhase.ts` — `WorkspacePhase`, `SheetBootstrapPhase` |
| Empty-state file upload UI | `features/import/components/fileUploadPhase.ts` — `FileUploadUiPhase` |
| Review triage | `features/review/components/reviewQueuePhase.ts` — `ReviewQueuePhase` + session reducer |
| Transaction table modals | `features/transactions/components/tableInteraction.ts` — `TableInteraction` |
| Settings sheet async | `features/settings/components/settingsAsyncPhase.ts` — `SettingsAsyncOperation` |
| Bank OAuth return & card busy | `features/banking/bankingUiPhase.ts` — `BankConnectReturnPhase`, `ConnectionCardOperation` |

`AppState` still exposes `isLoading`, `isRestoring`, and `error` as **derived** from `workspacePhase` for existing callers; prefer `workspacePhase` for new code.

## Repository layout

```
web/src/
├── app/                    # wiring only
│   ├── main.tsx            # entry, providers
│   ├── router.tsx          # composes feature routes
│   ├── shell.tsx           # root layout (nav, outlets; may import features for badges)
│   └── AppShellSidebar.tsx
├── features/
│   ├── overview/           # dashboard
│   ├── transactions/       # list, merchant drill-down, table, filters
│   ├── import/             # file upload UI
│   ├── review/             # review queue
│   ├── income/             # income classification
│   ├── analytics/          # charts & trends routes
│   ├── export/             # Google Sheets preview
│   ├── settings/           # sheet config, rules, rates
│   └── banking/            # open banking UI, API hooks, admin back-office
├── shared/
│   ├── components/         # layout (header, breadcrumbs), feedback (toast, errors)
│   ├── contexts/           # AppState provider
│   │   └── workspace/      # session store, import, mutations, bootstrap
│   ├── services/           # HTTP helpers (`API_BASE`, headers)
│   ├── types/              # shared TS types
│   └── utils/              # parsing, categorization, dates, storage, etc.
│       ├── parser/         # CSV/XLSX/OFX import (import via `@/shared/utils/parser` — thin `.ts` shim re-exports the folder)
│       ├── categorizer/    # rules + learned mappings
│       ├── anonymizer/     # optional PII masking
│       └── sheetLayout/    # Google Sheet column layout
└── styles/
    └── index.css
```

## Feature module shape

Add folders **only when they contain code**. Do not scaffold empty `api/`, `hooks/`, `tests/`, etc. “just in case.”

| Folder        | Role |
|---------------|------|
| `routes/`     | Route entry components; `index.tsx` re-exports the page |
| `components/` | Presentational UI; no data fetching |
| `hooks/`      | TanStack Query / local logic (e.g. `banking/hooks`, `transactions/hooks`) |
| `api/`        | Backend calls owned by this feature (**`export/api`** — Google Sheet layout/metadata; **`settings/api`** — sheet config & learned mappings; **`banking/api`** — open banking) |
| `constants/`  | Search params, durations, domain numbers (see `constants.ts`; time units in `@/shared/constants/time`) |
| `utils/`      | Pure helpers scoped to the feature |
| `tests/`      | Vitest specs (e.g. `transactions/tests`) |

Most features are UI over **`AppState`** and **`shared/utils`**; they need only `routes/` and `components/` unless you add feature-specific HTTP or hooks.

## Workspace state (`AppState`)

`shared/contexts/AppState.tsx` is a thin provider. Logic lives under `shared/contexts/workspace/`:

| Module | Role |
|--------|------|
| `useTransactionStore` | Refs + `commit` for transactions/raw/splits |
| `useWorkspaceBootstrap` | Init, sheet sync, session restore |
| `useWorkspaceImport` | File upload, bank import, duplicate confirm |
| `useWorkspaceMutations` | Edits, splits, clear, CSV, anonymize toggle |
| `useRecategorizeMutations` | Category changes + undo |
| `useMappingPersistence` | Batch save learned mappings to API |

## Known exceptions

- `app/shell.tsx` imports banking (nav badges) and review helpers for counts.
- Settings back-office tab embeds a banking component when banking is enabled.
- Settings sheet tab uses **`export/api`** for Google metadata (same backend routes as export).
- **`shared/utils/sheetLayout`** calls **`export/api`** to sync header layout from Sheets.

## Current route mapping

| Feature | Routes | Notes |
|---------|--------|--------|
| `overview` | `/` | Summary cards, empty state import |
| `transactions` | `/transactions`, `/transactions/merchants/$merchantKey` | Core table & filters |
| `review` | `/review` | Review queue |
| `income` | `/income` | Income review |
| `analytics` | `/analytics`, `/analytics/trends` | Charts |
| `export` | `/export` | Sheet export preview |
| `settings` | `/settings/*` | Sheet, columns, rules |
| `banking` | `/banks/*` | Optional; gated when API banking is off |
| `import` | (embedded) | File upload from overview / shell |

Shared **transaction pipeline** (parser, categorizer, anonymizer, splits, …) lives under `shared/utils/` because every feature reads the same workspace. Implementation modules live in subfolders (`categorizer/`, etc.); one-line **`*.ts` shims** next to them (e.g. `categorizer.ts`) re-export the folder so Vite and `@/` imports keep working.

## Import alias

Use `@/` for absolute imports (see `web/tsconfig.json`), e.g. `@/shared/types`, `@/features/banking/hooks/banking-queries`.

## Entry

The SPA entry is `web/app/index.html` → `/src/app/main.tsx`. The marketing landing page remains `web/index.html` at the repo root.
