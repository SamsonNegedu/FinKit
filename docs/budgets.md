# Budgets

A monthly spending limit per category, with progress for the current month. Page: `/budgets` (sidebar: Insights).

## Where things live

| Part | Where | Notes |
|------|-------|-------|
| Limits | API, table `budgets` (`user_id`, `category`, `currency`, `amount`, `rollover`, `starts_month`) | One limit per user, category and currency. Saving again replaces it |
| Overall cap | API, table `budget_caps` (`user_id`, `currency`, `amount`) | One cap on all spending in a month, per currency |
| Spending | The browser | Worked out from the workspace transactions, so file-imported transactions never reach the API |
| API | `api/src/budgets/` | `GET /api/budgets` (limits and caps), `PUT /api/budgets`, `DELETE /api/budgets/:currency/:category`, `PUT /api/budget-cap`, `DELETE /api/budget-cap/:currency` |
| Web | `web/src/features/budgets/` | `utils/budgetProgress.ts` holds all the maths |

Budgets do **not** need banking: `BudgetsModule` is registered in `app.module.ts` directly, not through `banking-features.ts`.

## Rules the code relies on

- Spending is counted exactly as Analytics counts it: expenses only, no `Transfer`, nothing excluded. A budget and the category breakdown must never disagree.
- `Income` and `Transfer` can't be budgeted (`NOT_BUDGETABLE`). They aren't spending.
- The page works in the base currency. A limit in another currency is kept but not shown.
- The page opens on this month and can step back to the first month with data. There is no looking ahead.
- **Rollover** (per budget): unspent money carries into the next month, and only unspent money: an overspend is never taken off the next month. Counting starts in `starts_month` (the month the budget was created; changing the limit later does not move it) and uses the limit as it is now, because limits are not kept per month. It is worked out in the browser from the transactions (`carriedInto`), looking back at most 36 months.
- **Overall cap**: one number for everything spent in a month, budgeted or not. It counts spending as Analytics' "Spent" does, so Savings and Investment are left out (`SET_ASIDE`, exported from `analysis/analyze.ts`). It lives on its own path (`/api/budget-cap`) so it can never be mistaken for a category.
- The limit is not a bank field, so it is stored in plain text. Every query filters on `user_id`.

## What the page shows

- A summary: what's left or over, spent of budgeted, and how many are over or close (`WATCH_AT` = 80%).
- One row per budget, worst first. Past 100% the bar rescales: a white tick marks the limit and the overshoot is solid red. A thin line marks how far through the month it is (`paceAt`).
- Each row has a carry-over toggle, an edit pencil and a delete. The limit shown includes anything carried in, and a note says how much.
- With more than 8 budgets: search, a filter, and the on-track ones fold away.
- "Spent this month with no budget": categories with spending and no limit, with a one-click "Set budget".
- "Add budget" keeps the dialog open so several can be added in one sitting. "Set up from my spending" suggests a limit per category (the last three full months' average, rounded up to 10) and saves the ticked ones together.
- The Overview's "Needs attention" shows one line when a budget is over or close (`alertLine`).

## Tests

`api/src/budgets/budgets.test.ts`: saving, replacing, deleting, per-user scoping, validation and CSRF. `web/src/features/budgets/utils/budgetProgress.test.ts`: the spending, state, pace, suggestion, alert, rollover and cap maths. The API tests also cover an older database (before rollover and caps) upgrading with its rows intact.
