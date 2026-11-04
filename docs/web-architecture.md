# Web frontend architecture

Feature-based layout: **`app/`** wires the shell, **`features/`** own product areas, **`shared/`** holds cross-cutting code. Features may import from `shared/` only, not from other features.

## File size

Keep source files around **200 lines** or less (excluding generated assets). Split by component, hook, or pure module when a file grows beyond that. Vitest specs may live in several files under a feature’s `tests/` folder.

## Explicit state machines

Multi-step UI and async flows use **discriminated unions + reducers** (not scattered booleans). Prefer reading `workspacePhase`, `TableInteraction`, etc. over inferring from many flags.

| Area | Types / module |
|------|----------------|
| Workspace restore & import | `shared/contexts/workspace/workspacePhase.ts`: `WorkspacePhase`, `SheetBootstrapPhase` + `sheetBootstrapReducer` |
| Empty-state file upload UI | `features/import/components/fileUploadPhase.ts`: `FileUploadUiPhase` |
| Review triage | `features/review/components/reviewQueuePhase.ts`: discriminated `ReviewQueuePhase` + session reducer |
| Transaction table modals | `features/transactions/components/tableInteraction.ts`: `TableInteraction` |
| Settings sheet async | `features/settings/components/settingsAsyncPhase.ts`: `SettingsAsyncOperation` (save/reset sheet config only; not workspace restore) |
| Sheet bootstrap after restore | `shared/contexts/workspace/workspacePhase.ts`: `SheetBootstrapPhase` via `useSheetBootstrapPhase` / `sheetBootstrapReducer` (layout metadata for export; separate from settings async) |
| Bank OAuth return & card busy | `features/banking/bankingUiPhase.ts`: `BankConnectReturnPhase`; `ConnectionCardOperation` is **derived** from React Query mutation state on each card, not a global reducer |

`AppState` still exposes `isLoading`, `isRestoring`, and `error` as **derived** from `workspacePhase` for existing callers; prefer `workspacePhase` for new code.

## Repository layout

```
web/src/
├── app/                    # wiring only
│   ├── main.tsx            # entry, providers
│   ├── router.tsx          # router instance, search serialization
│   ├── routes/appRouteTree.tsx  # route definitions and `requireBanking`
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
│   ├── banking/            # open banking UI, API hooks, admin back-office
│   ├── trips/              # trips: tag bank transactions, per-trip breakdown
│   ├── budgets/            # monthly limit per category; spending is worked out in the browser
│   └── contracts/          # recurring payments found in synced history, plus ones added by hand, or made from rows picked in Transactions ("Recurring" in the bulk bar; synced rows only)
├── shared/
│   ├── components/         # layout (header, breadcrumbs), feedback (toast, errors), forms (Radix-based inputs, dialogs),
│   │                       #   transactions (the one transaction table, used by Transactions and Trips),
│   │                       #   CategoryIcon (a category's icon in its color) and Logo (the FinKit mark);
│   │                       #   forms/ also has SegmentedControl, TabLinks and DatePicker; Tooltip wraps the app once (`TooltipProvider` in `main.tsx`)
│   ├── contexts/           # AppState provider
│   │   └── workspace/      # session store, import, mutations, bootstrap
│   ├── services/           # HTTP helpers (`API_BASE`, headers) and `apiClient.ts` (`apiJson`, `ApiError`)
│   ├── types/              # shared TS types
│   └── utils/              # parsing, categorization, dates, storage, etc.
│       ├── parser/         # CSV/XLSX/OFX import (import via `@/shared/utils/parser`: thin `.ts` shim re-exports the folder)
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
| `api/`        | Backend calls owned by this feature (**`export/api`**: Google Sheet layout/metadata; **`settings/api`**: sheet config & learned mappings; **`banking/api`**: open banking) |
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

- `shared/components/layout/Breadcrumbs.tsx` reads connection and trip names from the banking and trips hooks.
- `app/shell.tsx` imports banking (nav badges) and review helpers for counts.
- `overview` reads the contracts hook and its insights to show recurring-payment lines under "Needs attention".
- `transactions` imports the trips move dialog (the bulk bar's "Trip" action opens it), and `transactions` and `overview` show `TripsMovedNote`.
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
| `analytics` | `/analytics`, `/analytics/year`, `/analytics/months`, `/analytics/trend` | One section, a page per view. Your year is the export sheet's columns, month by month, with copy-to-sheet |
| `export` | none (API calls only) | The Google Sheets layout and metadata calls used by Settings; the Export page became Your year |
| `settings` | `/settings/*` | Sheet, columns, rules |
| `banking` | `/banks/*` | Optional; gated when API banking is off |
| `trips` | `/trips`, `/trips/$tripId` | Needs banking: only synced transactions have a server ref |
| `budgets` | `/budgets` | Works without banking; limits are stored on the server, spending is computed in the browser. See [budgets](./budgets.md) |
| `contracts` | `/contracts` | Needs banking: detection runs on the server over stored transactions; only the server holds the history |
| `import` | (embedded) | File upload from overview / shell |

Shared **transaction pipeline** (parser, categorizer, anonymizer, splits, …) lives under `shared/utils/` because every feature reads the same workspace. Implementation modules live in subfolders (`categorizer/`, etc.); one-line **`*.ts` shims** next to them (e.g. `categorizer.ts`) re-export the folder so Vite and `@/` imports keep working.

## Import alias

Use `@/` for absolute imports (see `web/tsconfig.json`), e.g. `@/shared/types`, `@/features/banking/hooks/banking-queries`.

## Entry

The SPA entry is `web/app/index.html` → `/src/app/main.tsx`. The marketing landing page remains `web/index.html` at the repo root.

## Trips

Transactions in a trip are hidden from `displayTransactions` (`shared/contexts/workspace/useTripLinks.ts`), not removed from the workspace: it also holds copies saved from earlier syncs. `StoredBankTransactions` fills `tripLinks` from the server's list (each row has a `ref` and a `tripId`). Imported files have no ref and cannot join a trip.

The transaction table lives in `shared/components/transactions/` because two features use it. A feature changes what it shows through the table's `behaviour` prop (categories and colors, row actions, bulk actions), never by copying it.

## Sidebar groups and branding

Nav items and their groups are set in `app/shell.tsx`: Collect, Balance the month, Insights, Setup. A new page also needs a breadcrumb label in `shared/components/layout/Breadcrumbs.tsx` (its fallback prints the raw path), and, for the production static server, a rewrite in `web/public/serve.json` or a reload on that address returns 404.

The logo is drawn twice: `shared/components/Logo.tsx` (in the app) and `web/public/favicon.svg` (the tab icon and the public pages). Change both together. `favicon.ico` and `apple-touch-icon.png` are rendered from the SVG.

Selecting transactions: shift-click selects the range between two rows in List view (`useTransactionTableState`). Shift is tracked on the window because a checkbox's change event doesn't say whether it was held.
