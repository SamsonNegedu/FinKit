#!/usr/bin/env bash
# Generates the signing key and certificate Enable Banking asks for when you register an application.
#
#   private.key  stays on your machine / server only. NEVER paste it anywhere or commit it.
#   public.crt   is the part you paste into the Enable Banking form.
#
# Usage: ./scripts/gen-banking-keys.sh [name]      (default name: finkit)
set -euo pipefail

NAME="${1:-finkit}"
DIR="${FINKIT_SECRETS_DIR:-$HOME/.finkit-secrets/enablebanking}"
KEY="$DIR/$NAME.private.key"
CRT="$DIR/$NAME.public.crt"

if [ -e "$KEY" ] || [ -e "$CRT" ]; then
  echo "Refusing to overwrite existing files in $DIR for '$NAME'." >&2
  echo "Pick another name: ./scripts/gen-banking-keys.sh other-name" >&2
  exit 1
fi

umask 077
mkdir -p "$DIR"
openssl genrsa -out "$KEY" 4096 2>/dev/null
# ~3 years so the certificate doesn't expire in the middle of use
openssl req -new -x509 -days 1095 -key "$KEY" -out "$CRT" -subj "/C=DE/O=FinKit/CN=$NAME" 
chmod 600 "$KEY"
chmod 644 "$CRT"

echo
echo "Created:"
echo "  private key  $KEY   (keep secret)"
echo "  certificate  $CRT"
echo
echo "Paste the certificate below into the Enable Banking form (step 5):"
echo "------------------------------------------------------------------"
cat "$CRT"
echo "------------------------------------------------------------------"
