# Deployment (Docker)

You host the containers; data stays in volumes you control.

## Steps

1. Copy [.env.example](../.env.example) to `.env` and set at least `ALLOWED_USER_EMAILS`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` and `ALLOWED_ORIGIN`. The API will not start in production without Cloudflare Access config and a fixed web origin. See [users and access](./users-and-access.md).
2. Deploy:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

- Health check: `GET /health`.
- SQLite data lives in the `finkit-api-data` volume on your host.
- The root [docker-compose.yml](../docker-compose.yml) builds the same images for local or CI use. Wire ports or a reverse proxy so the browser reaches the web container and `/api` reaches the API.

## Key files (only for bank sync or Google Sheets)

`EB_PRIVATE_KEY_PATH` and `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` are paths inside the API container. The compose file mounts the `secrets/` folder next to it, read-only, at `/run/secrets`. So `secrets/enablebanking.pem` on your server is `/run/secrets/enablebanking.pem` for the API.

Run this from the folder with `docker-compose.prod.yml`. It generates the Enable Banking signing key and prints the certificate to paste into the Enable Banking form. The private key never leaves the server.

```bash
[ -e secrets/enablebanking.pem ] && echo "already exists, not overwriting" || {
  mkdir -p secrets &&
  openssl genrsa -out secrets/enablebanking.pem 4096 2>/dev/null &&
  openssl req -new -x509 -days 1095 -key secrets/enablebanking.pem -out secrets/enablebanking.crt -subj "/C=DE/O=FinKit/CN=finkit" &&
  chmod 644 secrets/enablebanking.pem secrets/enablebanking.crt &&
  cat secrets/enablebanking.crt
}
```

For Sheets export, save the JSON key from Google as `secrets/google-sa.json`. The API runs as a non-root user, hence the `644`.

Then set these in `.env` and restart:

```
EB_PRIVATE_KEY_PATH=/run/secrets/enablebanking.pem
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/run/secrets/google-sa.json
```

The `secrets/` folder is gitignored; copy the files to the server yourself.
