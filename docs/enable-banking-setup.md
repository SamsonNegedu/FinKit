# Enable Banking: getting production access

Do these in order. Steps marked **you** need your accounts; the rest is already in the repo.

## 1. Make the public pages reachable (you)

Enable Banking's form requires a Privacy URL and a Terms URL, and its reviewers must be able to open them without logging in.

1. Deploy the latest images: on the Pi run `./deploy.sh`.
2. In Cloudflare Zero Trust, add a **Bypass** rule for exactly these two paths:
   - Access, Applications, Add an application, Self-hosted
   - Hostname: your FinKit domain. Paths: `/privacy.html` and `/terms.html`
   - Policy: action **Bypass**, include **Everyone**
   - (Labels can differ slightly in the dashboard. The more specific path takes precedence over the main app.)
3. Check from a logged-out context (private window or `curl`):
   ```
   curl -sI https://YOUR-DOMAIN/privacy.html | head -1   # expect: HTTP/2 200
   curl -sI https://YOUR-DOMAIN/terms.html   | head -1   # expect: HTTP/2 200
   ```
   A `302` to `cloudflareaccess.com` means the bypass isn't applied yet.

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
