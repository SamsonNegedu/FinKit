# Enable Banking: getting production access

Do these in order. Steps marked **you** need your accounts; the rest is already in the repo.

## 1. Public site, protected app (you)

The site has two parts. The landing page at `/`, plus `/privacy.html` and `/terms.html`, are public: Enable Banking's reviewers must be able to open them without logging in. The app itself lives at `/app/` and the API at `/api/`, and both stay behind Cloudflare Access.

1. Deploy the latest images: on the Pi run `./deploy.sh`.
2. In Cloudflare Zero Trust, change the existing Access application so it protects only the app and the API:
   - Access, Applications, your FinKit application, Edit
   - Hostname: your FinKit domain. Add two paths: `/app` (also covers `/app/*`) and `/api`
   - Remove any rule that covers the whole hostname. Keep your existing "only my email" policy on these two paths.
   - Everything else (`/`, `/privacy.html`, `/terms.html`) is then public.
   - (Labels can differ slightly in the dashboard. If paths are entered as separate applications, create one for `/app` and one for `/api`, each with the same policy.)
3. Check from a logged-out context (private window or `curl`). Public pages must return `200`; protected ones must redirect to Cloudflare's login:
   ```
   curl -sI https://YOUR-DOMAIN/            | head -1   # expect: HTTP/2 200
   curl -sI https://YOUR-DOMAIN/privacy.html | head -1  # expect: HTTP/2 200
   curl -sI https://YOUR-DOMAIN/terms.html   | head -1  # expect: HTTP/2 200
   curl -sI https://YOUR-DOMAIN/app/         | head -1  # expect: HTTP/2 302 (login)
   curl -sI https://YOUR-DOMAIN/api/health   | head -1  # expect: HTTP/2 302 (login)
   ```
   If `/api/health` returns `200` or JSON, the API is unprotected. Fix that before anything else.

The old address `/` used to be the app. Bookmarks should now point to `/app/`.

If `/` or `/app/` ever shows an "Index of dist/" folder listing, the web container isn't serving the built files correctly. Check `docker compose -f docker-compose.prod.yml exec finkit-web ls dist` (it must contain `index.html` and `app/index.html`) and `... logs --tail 30 finkit-web`.

## 2. Generate the signing key (you)

```
./scripts/gen-banking-keys.sh
```

It writes `~/.finkit-secrets/enablebanking/finkit.private.key` (keep secret, never paste or commit) and `finkit.public.crt` (paste into the form).

## 3. Register the applications (you)

Control Panel, Add a new application. Choose **Generate outside the browser and import public certificate**.

| Field | Production | Sandbox (for development) |
|---|---|---|
| Environment | Production | Sandbox |
| Name | `FinKit (personal)` | `FinKit (sandbox)` |
| Redirect URLs | `https://YOUR-DOMAIN/api/banking/callback` | `http://localhost:5173/api/banking/callback` |
| Description | Personal finance tracker for my own bank accounts | same |
| Data protection email | your contact address | same |
| Privacy URL | `https://YOUR-DOMAIN/privacy.html` | same |
| Terms URL | `https://YOUR-DOMAIN/terms.html` | same |
| Public certificate | contents of `finkit.public.crt` | same (a second key is fine too) |

Production applications are reviewed by Enable Banking, so submit early. The sandbox one activates automatically.

## 4. Link your own accounts (you)

In the Control Panel, link your personal accounts (N26, Wise, Revolut) to the production application. The free tier only covers accounts of the logged-in user, and not business accounts.

## 5. Configuration the app will need (later, on the Pi)

Set in `.env` (values you get from the steps above and from Cloudflare):

```
BANKING_PROVIDER=enablebanking
EB_APP_ID=...                      # shown in the Control Panel after registering
EB_PRIVATE_KEY_PATH=/run/secrets/enablebanking.key
BANKING_REDIRECT_URL=https://YOUR-DOMAIN/api/banking/callback
BANKING_ENCRYPTION_KEY=...         # openssl rand -base64 32
CF_ACCESS_TEAM_DOMAIN=...          # the part before .cloudflareaccess.com
CF_ACCESS_AUD=...                  # Access, Applications, your app, Overview: AUD tag
BANKING_ADMIN_EMAILS=you@example.com
```

Mount the private key into the API container read-only (for example `./secrets/enablebanking.key:/run/secrets/enablebanking.key:ro`). Never put it in the image or in git.
