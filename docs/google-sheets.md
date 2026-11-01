# Google Sheets export (optional)

Only runs when you set credentials and export from the app.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the Sheets API and create a service account.
2. Share only the spreadsheet FinKit should use with the service account email (Editor). Export calls pass a spreadsheet id from the app, so narrow sharing on the service account is what limits where it can write. See [users and access](./users-and-access.md#google-sheets-export).
3. Local API: set `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `api/.env`.
4. Docker production: mount the JSON key as a secret and set `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in the root `.env` (see [deployment](./deployment.md#key-files-only-for-bank-sync-or-google-sheets)).
5. In **Settings**, set the sheet URL/ID, tab name and category column mappings.

Tab names and column letters are validated before any Google API call. The export expects a monthly summary layout: a month row, category columns and totals.
