#!/usr/bin/env python3
"""
Genererer nye legacy ANON_KEY / SERVICE_ROLE_KEY (HS256-JWT) for et
selvhostet Supabase-oppsett.

Kjøres LOKALT på Supabase-serveren (der du har .env), aldri send
secreten videre. Ingen eksterne avhengigheter (kun standardbiblioteket).

Nyere selvhostede oppsett bruker `PGRST_JWT_SECRET: ${JWT_JWKS:-${JWT_SECRET}}`
(se docker-compose.yml) — er `JWT_JWKS` satt, er DET som gjelder for
PostgREST, ikke den enkle `JWT_SECRET`-strengen. En JWKS kan inneholde
flere nøkler; det er den symmetriske ("oct", alg HS256) nøkkelen i settet
som faktisk brukes til å signere/verifisere legacy anon/service_role-JWTer.
Dette skriptet plukker den ut automatisk. Har du ikke JWT_JWKS satt i det
hele tatt, faller det tilbake på å bruke JWT_SECRET direkte.

Bruk:
  cd ~/supabase/docker
  export JWT_JWKS=$(grep '^JWT_JWKS=' .env | cut -d= -f2-)
  export JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)
  python3 /root/supabase/scripts/generate-supabase-keys.py

Deretter: erstatt ANON_KEY og SERVICE_ROLE_KEY i .env med de nye verdiene,
og restart HELE stacken (docker compose down && docker compose up -d) —
inkludert api-gw (Envoy), som også må restartes separat etterpå
(docker compose restart api-gw) siden den ellers kan bli hengende med
"no healthy upstream" etter en full restart.

Husk å oppdatere:
  - VITE_SUPABASE_ANON_KEY i supabase-chat-app/.env og i Netlify sine
    environment variables (ny ANON_KEY)
  - SUPABASE_SERVICE_KEY i cronjobben for ups-poller.py (ny SERVICE_ROLE_KEY)

Test alltid med curl før du stoler på en ny nøkkel, f.eks.:
  curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" \\
    -X POST "https://<din-supabase-url>/rest/v1/device_status?on_conflict=device_id" \\
    -H "apikey: $NY_NOKKEL" -H "Authorization: Bearer $NY_NOKKEL" \\
    -H "Content-Type: application/json" \\
    -H "Prefer: resolution=merge-duplicates,return=minimal" \\
    -d '[{"device_id":"test","status":"OL"}]'
"""
import base64
import hashlib
import hmac
import json
import os
import sys
import time


def b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def find_secret_bytes():
    jwks_raw = os.environ.get("JWT_JWKS")
    if jwks_raw:
        jwks = json.loads(jwks_raw)
        oct_keys = [k for k in jwks.get("keys", []) if k.get("kty") == "oct"]
        if oct_keys:
            return b64url_decode(oct_keys[0]["k"]), oct_keys[0].get("kid")
        print(
            "Advarsel: JWT_JWKS er satt, men inneholder ingen symmetrisk (oct) nøkkel — "
            "legacy HS256-nøkler kan ikke genereres for dette oppsettet.",
            file=sys.stderr,
        )

    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret.encode(), None

    return None, None


def make_jwt(secret_bytes: bytes, kid, role: str, years: int = 10) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    if kid:
        header["kid"] = kid
    now = int(time.time())
    payload = {
        "role": role,
        "iss": "supabase",
        "iat": now,
        "exp": now + years * 365 * 24 * 3600,
    }
    segments = [
        b64url_encode(json.dumps(header, separators=(",", ":")).encode()),
        b64url_encode(json.dumps(payload, separators=(",", ":")).encode()),
    ]
    signing_input = ".".join(segments).encode()
    signature = hmac.new(secret_bytes, signing_input, hashlib.sha256).digest()
    segments.append(b64url_encode(signature))
    return ".".join(segments)


def main():
    secret_bytes, kid = find_secret_bytes()
    if not secret_bytes:
        print("Sett JWT_JWKS og/eller JWT_SECRET i miljøet før du kjører dette.", file=sys.stderr)
        return 1

    print("ANON_KEY=" + make_jwt(secret_bytes, kid, "anon"))
    print("SERVICE_ROLE_KEY=" + make_jwt(secret_bytes, kid, "service_role"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
