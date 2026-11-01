# Users and access

## Who you are

FinKit has no login of its own. In production, Cloudflare Access signs people in and attaches a signed token to every request. The API verifies the token itself (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`) and reads the email from it. If those settings are missing when `NODE_ENV=production`, the server refuses to start. Locally there is no Cloudflare, so you are `dev@localhost`. `ALLOWED_ORIGIN` (the web app's address) is also required in production, and the server refuses to start without it. Changing requests must carry exactly that `Origin` header (no `Referer` fallback). Locally, with it unset, Origin isn't checked.

## Who gets in

One list: `ALLOWED_USER_EMAILS`. Anyone on it is let in. Anyone else is refused, even with a valid Cloudflare sign-in.

- Everyone on the list is equal. There are no roles.
- The list is checked on every request, so taking someone off it locks them out at once.
- With nobody listed (outside local development) nobody gets in. The API logs this at start-up.
- `BANKING_ADMIN_EMAILS` is the old name for the same list and still works.

## What each person sees

Only their own: learned merchant rules, settings (including the Google Sheet layout), bank connections, and the Back office (their sync history, their activity, their connection counts). Asking for someone else's bank connection returns 404. Synced bank transactions are stored on the server, each row tagged with its owner. Every read and delete is limited to the signed-in user, and the descriptive fields (text, names, IBANs) are encrypted at rest. Disconnecting a bank deletes what came through it; Banks → Stored bank data deletes everything. Transactions from imported files are never sent to the server.

The bank's return after approval carries no sign-in, so the connection belongs to whoever started it.

## Upgrading an existing install

Older databases kept one global list of rules, settings and connections. On first start of this version they stay unowned, and are handed to the first address in `ALLOWED_USER_EMAILS` the first time that person signs in, whatever order people arrive in. Put your own address first, and back up the database file before upgrading.

## Setting it up

```
ALLOWED_USER_EMAILS=you@example.com,partner@example.com
CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com
CF_ACCESS_AUD=<audience tag of the Access application>
```

Also add each person to the Cloudflare Access policy. Cloudflare decides who may reach the site, and FinKit's list decides who gets an account.

## Locked out?

The email in the sign-in token isn't on `ALLOWED_USER_EMAILS`. Fix the variable and restart the API. If the old data went to the wrong person on first start, stop the API, restore the database backup, put the right address first, and start again.

## Google Sheets export

Export, layout and metadata calls take the spreadsheet id from the request, on purpose: any signed-in person on the allowed list may export to any spreadsheet the Google service account can open. So the service account must only be shared on the one spreadsheet FinKit should write to (the README's Google Sheets steps do this). Tab names and column letters are validated before they reach Google.

## Not built yet

Invitations, a user list and profile screen, preferences stored on the server, deleting one person's data.

## For developers

`X-Dev-User: someone@example.com` acts as another person in local development. It is ignored in production.
