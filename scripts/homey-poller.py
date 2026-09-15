#!/usr/bin/env python3
"""
Leser CPU-temperatur og ledig minne fra Homey Pro sitt innebygde
system-("SysInternals")-device via Homey sitt Cloud API, og skriver til
`device_status`-tabellen i Supabase — samme mønster som ups-poller.py.

Kjøres periodisk (f.eks. hvert 5. minutt) via cron, et sted med utgående
internett-tilgang (trenger IKKE være på samme LAN som Homey-en, siden
dette går via Homey sin sky, ikke det lokale nettverket).

Kun standardbiblioteket, ingen pip-install nødvendig.

Miljøvariabler (par per Homey, kan ha flere — se HOMEYS under):
  HOME_HOMEY_ID / HOME_HOMEY_TOKEN     Homey-ID og Personal Access Token for @Home
  HYTTA_HOMEY_ID / HYTTA_HOMEY_TOKEN   samme for @Hytta

  SUPABASE_URL          f.eks. https://supabase.atkins.nu
  SUPABASE_SERVICE_KEY  service_role-nøkkelen (samme som ups-poller.py bruker)

Personal Access Token lages på my.homey.app eller i Homey-appen under
kontoinnstillinger → API-nøkler. IKKE legg tokens i git — kun i
crontab/systemd-unit, aldri committet.

Test alltid manuelt før du stoler på cronjobben, f.eks.:
  HOME_HOMEY_ID=... HOME_HOMEY_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
    python3 homey-poller.py
"""
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# device_id i Supabase-tabellen -> (env-prefiks for ID/token, visningsnavn)
HOMEYS = [
    ("homey-home", "HOME", "@Home Pro"),
    ("homey-hytta", "HYTTA", "@Hytta Pro"),
]

# Homey sitt innebygde system-device har navnet "Homey Pro (...)" og
# ligger i en sone som heter "SysInternals" i begge husene her.
SYSTEM_DEVICE_NAME_HINT = "Homey Pro"

# Strøm-enheter i @Home sin enhetsliste (faste device-ID-er, hentet fra
# samme /api/manager/devices/device-kall som system-enheten - ingen ekstra
# API-kall trengs). Kun for HOME-Homeyen.
POWER_DEVICES = {
    "home-power-consumption": ("c700e97e-2ddd-4102-ad3e-ea0ed73e4227", "Strømforbruk (@Home)", "Pulse Nordåsvegen 211"),
    "home-power-production": ("91ecaabe-5d1a-41f9-83c0-c1a362ec45ad", "Solproduksjon (@Home)", "Inverter: Solceller"),
}


def homey_api_get(homey_id: str, token: str, path: str, timeout: int = 10):
    url = f"https://{homey_id}.connect.athom.com{path}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def find_system_device(devices: dict):
    # /api/manager/devices/device returnerer { deviceId: {...} }.
    # NB: det finnes også en "Alarms Homey Pro (...)" -device (kun alarmer,
    # ingen temperatur/minne) — bruk startswith, ikke "in", for å ikke
    # treffe den ved en feil.
    for device_id, device in devices.items():
        name = device.get("name", "")
        if name.startswith(SYSTEM_DEVICE_NAME_HINT):
            return device_id, device
    return None, None


def extract_metrics(device: dict):
    caps = device.get("capabilitiesObj", {})

    def cap_value(cap_id):
        entry = caps.get(cap_id)
        return entry.get("value") if entry else None

    return {
        "temperature": cap_value("measure_temperature"),
        "freemem_percent": cap_value("measure_percentage.freemem"),
        "totalmem_mb": cap_value("measure_mem.totalmem"),
        "freemem_mb": cap_value("measure_mem.freemem"),
        "uptime_hours": cap_value("measure_hours.uptime"),
        "connected_wifi": cap_value("connectedwifi"),
        "connected_lan": cap_value("connectedlan"),
    }


def extract_power(device: dict):
    caps = device.get("capabilitiesObj", {})

    def cap_value(cap_id):
        entry = caps.get(cap_id)
        return entry.get("value") if entry else None

    return {
        "watts": cap_value("measure_power"),
        "kwh_today": cap_value("day_energy_capability"),
    }


def upsert_status(device_id: str, label: str, metrics: dict, online: bool):
    payload = [{
        "device_id": device_id,
        "status": "online" if online else "offline",
        "raw": {"label": label, **metrics},
    }]
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/device_status?on_conflict=device_id",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def insert_metrics(device_id: str, metrics: dict):
    # metrics: { "temperature": 61.2, "freemem_percent": 66, ... } - None-verdier hoppes over.
    payload = [
        {"device_id": device_id, "metric": metric, "value": value}
        for metric, value in metrics.items()
        if value is not None
    ]
    if not payload:
        return
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/device_metrics",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def poll_one(device_id: str, env_prefix: str, label: str) -> bool:
    homey_id = os.environ.get(f"{env_prefix}_HOMEY_ID")
    token = os.environ.get(f"{env_prefix}_HOMEY_TOKEN")
    if not homey_id or not token:
        print(f"Hopper over {label}: mangler {env_prefix}_HOMEY_ID/{env_prefix}_HOMEY_TOKEN", file=sys.stderr)
        return False

    try:
        devices = homey_api_get(homey_id, token, "/api/manager/devices/device")
        sys_device_id, sys_device = find_system_device(devices)
        if not sys_device:
            print(f"FEIL ({label}): fant ikke system-device blant {len(devices)} enheter", file=sys.stderr)
            return False

        metrics = extract_metrics(sys_device)
        upsert_status(device_id, label, metrics, online=True)
        insert_metrics(device_id, {
            "temperature": metrics["temperature"],
            "freemem_percent": metrics["freemem_percent"],
        })
        print(f"OK: {label} -> temp={metrics['temperature']} freemem%={metrics['freemem_percent']}")

        if env_prefix == "HOME":
            poll_power_devices(devices)

        return True
    except Exception as exc:
        print(f"FEIL ({label}): {exc}", file=sys.stderr)
        return False


def poll_power_devices(devices: dict):
    for power_id, (homey_device_id, label, device_name) in POWER_DEVICES.items():
        device = devices.get(homey_device_id)
        if not device:
            print(f"FEIL ({label}): fant ikke device-id {homey_device_id} ({device_name})", file=sys.stderr)
            continue
        try:
            power = extract_power(device)
            upsert_status(power_id, label, power, online=True)
            insert_metrics(power_id, {"watts": power["watts"]})
            print(f"OK: {label} -> watt={power['watts']} kwh_today={power['kwh_today']}")
        except Exception as exc:
            print(f"FEIL ({label}): {exc}", file=sys.stderr)


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Mangler SUPABASE_URL eller SUPABASE_SERVICE_KEY", file=sys.stderr)
        return 1

    ok = True
    for device_id, env_prefix, label in HOMEYS:
        ok = poll_one(device_id, env_prefix, label) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
