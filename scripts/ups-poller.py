#!/usr/bin/env python3
"""
Leser UPS-status direkte fra NUT (upsd) på 10.0.100.79:3493 og skriver den
til `device_status`-tabellen i Supabase, slik at lab5235.no kan vise live
status uten selv å nå inn i hjemmenettverket (som er blokkert av CORS og
mixed content siden PeaNUT kun snakker http://).

Kjøres periodisk (f.eks. hvert 2. minutt) via cron på en maskin som har
nettverkstilgang til UPS-en, f.eks. samme host som kjører Supabase.

Kun standardbiblioteket brukes, ingen pip-install nødvendig.

Miljøvariabler:
  NUT_HOST              default: 10.0.100.79
  NUT_PORT              default: 3493
  UPS_NAME              default: ups
  SUPABASE_URL          f.eks. https://supabase.atkins.nu
  SUPABASE_SERVICE_KEY  service_role-nøkkelen (IKKE anon-nøkkelen — denne
                        må kunne skrive forbi RLS). Hold den hemmelig,
                        legg den kun i en lokal .env / systemd-unit, aldri
                        i git.
"""
import json
import os
import socket
import sys
import urllib.request

NUT_HOST = os.environ.get("NUT_HOST", "10.0.100.79")
NUT_PORT = int(os.environ.get("NUT_PORT", "3493"))
UPS_NAME = os.environ.get("UPS_NAME", "ups")
DEVICE_ID = os.environ.get("DEVICE_ID", "ups")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def fetch_ups_vars(host, port, ups_name, timeout=5):
    end_marker = f"END LIST VAR {ups_name}".encode()
    with socket.create_connection((host, port), timeout=timeout) as sock:
        sock.sendall(f"LIST VAR {ups_name}\n".encode())
        buf = b""
        while end_marker not in buf:
            chunk = sock.recv(4096)
            if not chunk:
                break
            buf += chunk
        try:
            sock.sendall(b"LOGOUT\n")
        except OSError:
            pass

    data = {}
    prefix = f'VAR {ups_name} '
    for line in buf.decode(errors="replace").splitlines():
        if not line.startswith(prefix):
            continue
        rest = line[len(prefix):]
        key, _, value = rest.partition(" ")
        data[key] = value.strip().strip('"')
    if not data:
        raise RuntimeError(f"Fikk ingen VAR-linjer fra {host}:{port} for ups '{ups_name}'")
    return data


def to_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def upsert_status(supabase_url, service_key, device_id, data):
    payload = [{
        "device_id": device_id,
        "status": data.get("ups.status", "UNKNOWN"),
        "battery_charge": to_int(data.get("battery.charge")),
        "battery_runtime": to_int(data.get("battery.runtime")),
        "load_percent": to_int(data.get("ups.load")),
        "input_voltage": to_float(data.get("input.voltage")),
        "raw": data,
    }]
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/device_status?on_conflict=device_id",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def insert_metrics(supabase_url, service_key, device_id, metrics: dict):
    # metrics: { "battery_charge": 100, "load_percent": 54, ... } - None-verdier hoppes over.
    payload = [
        {"device_id": device_id, "metric": metric, "value": value}
        for metric, value in metrics.items()
        if value is not None
    ]
    if not payload:
        return
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/device_metrics",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Mangler SUPABASE_URL eller SUPABASE_SERVICE_KEY", file=sys.stderr)
        return 1

    try:
        data = fetch_ups_vars(NUT_HOST, NUT_PORT, UPS_NAME)
        upsert_status(SUPABASE_URL, SUPABASE_SERVICE_KEY, DEVICE_ID, data)
        insert_metrics(SUPABASE_URL, SUPABASE_SERVICE_KEY, DEVICE_ID, {
            "battery_charge": to_int(data.get("battery.charge")),
            "load_percent": to_int(data.get("ups.load")),
        })
        print(f"OK: {DEVICE_ID} -> {data.get('ups.status')}")
        return 0
    except Exception as exc:
        print(f"FEIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
