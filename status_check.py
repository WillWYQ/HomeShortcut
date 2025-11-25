#!/usr/bin/env python3
"""Service and internet status checker for Home Portal."""
import json
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from statistics import mean

import requests
import yaml

try:  # Python 3.9+
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - fallback for <3.9
    ZoneInfo = None

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.yaml"
PRIVATE_CONFIG_PATH = BASE_DIR / "private" / "config.yaml"
STATUS_PATH = BASE_DIR / "status.json"


def load_config():
    """Load YAML config."""
    path = PRIVATE_CONFIG_PATH if PRIVATE_CONFIG_PATH.exists() else CONFIG_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Config file not found: {path}. Please create config.yaml or private/config.yaml."
        )
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def get_now(tz_name=None):
    """Return timezone-aware datetime string."""
    tzinfo = None
    if tz_name and ZoneInfo:
        try:
            tzinfo = ZoneInfo(tz_name)
        except Exception:
            tzinfo = None
    now = datetime.now(tzinfo)
    return now.isoformat()


def read_prev_status():
    if STATUS_PATH.exists():
        try:
            with STATUS_PATH.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except json.JSONDecodeError:
            return {}
    return {}


def run_ping(host):
    """Run ping and parse average RTT (ms)."""
    cmd = ["ping", "-c", "2", "-W", "1", host]
    if sys.platform == "darwin":
        cmd = ["ping", "-c", "2", "-W", "1000", host]
    try:
        start = time.perf_counter()
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
        )
        duration_ms = (time.perf_counter() - start) * 1000
    except FileNotFoundError:
        return {"status": "down", "avg_rtt_ms": None}

    if result.returncode != 0:
        return {"status": "down", "avg_rtt_ms": None}

    avg_rtt = None
    for line in result.stdout.splitlines():
        if "avg" in line and "/" in line:
            parts = line.split("=")[-1].strip().split("/")
            if len(parts) >= 2:
                try:
                    avg_rtt = float(parts[1])
                except ValueError:
                    avg_rtt = None
            break
    if avg_rtt is None:
        avg_rtt = duration_ms
    return {"status": "up", "avg_rtt_ms": round(avg_rtt, 2) if avg_rtt else None}


def check_http(service):
    url = service.get("url")
    start = time.perf_counter()
    try:
        resp = requests.get(url, timeout=3)
        duration = (time.perf_counter() - start) * 1000
        status = "up" if resp.ok else "down"
        return {
            "status": status,
            "http_status": resp.status_code,
            "response_time_ms": round(duration, 2),
        }
    except requests.RequestException:
        return {"status": "down", "http_status": None, "response_time_ms": None}


def check_tcp(service):
    host = service.get("host")
    port = int(service.get("port", 0))
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    start = time.perf_counter()
    try:
        sock.connect((host, port))
        duration = (time.perf_counter() - start) * 1000
        sock.close()
        return {"status": "up", "latency_ms": round(duration, 2)}
    except OSError:
        return {"status": "down", "latency_ms": None}
    finally:
        sock.close()


def check_service(service):
    stype = service.get("type")
    if stype == "http":
        return check_http(service)
    if stype == "ping":
        return run_ping(service.get("host"))
    if stype == "tcp":
        return check_tcp(service)
    return {"status": "unknown"}


def compute_last_change(service_name, status, prev_map, now):
    prev = prev_map.get(service_name)
    if not prev:
        return now
    if prev.get("status") != status:
        return now
    return prev.get("last_change", now)


def summarize_internet(targets):
    results = []
    for host in targets:
        res = run_ping(host)
        if res["status"] == "up" and res.get("avg_rtt_ms") is not None:
            results.append(res["avg_rtt_ms"])
    online = len(results) > 0
    avg = round(mean(results), 2) if results else None
    return {
        "online": online,
        "reachable_targets": len(results),
        "total_targets": len(targets),
        "avg_rtt_ms": avg,
    }


def main():
    config = load_config()
    prev = read_prev_status()
    prev_map = {svc.get("name"): svc for svc in prev.get("services", [])}
    prev_external_map = {svc.get("name"): svc for svc in prev.get("internet_services", [])}
    now = get_now(config.get("timezone"))

    services_output = []
    for service in config.get("services", []):
        result = check_service(service)
        status = result.get("status", "unknown")
        payload = {
            "name": service.get("name"),
            "category": service.get("category"),
            "type": service.get("type"),
            "important": bool(service.get("important")),
            "icon": service.get("icon"),
            "status": status,
            "last_change": compute_last_change(service.get("name"), status, prev_map, now),
        }
        if service.get("url"):
            payload["url"] = service.get("url")
        if service.get("host"):
            payload["host"] = service.get("host")
        if service.get("port"):
            payload["port"] = service.get("port")
        payload.update(result)
        services_output.append(payload)

    internet_services_output = []
    for ext in config.get("internet_services", []):
        result = check_http(ext)
        status = result.get("status", "unknown")
        payload = {
            "name": ext.get("name"),
            "type": "http",
            "url": ext.get("url"),
            "status": status,
            "last_change": compute_last_change(ext.get("name"), status, prev_external_map, now),
        }
        payload.update(result)
        internet_services_output.append(payload)

    internet_summary = summarize_internet(config.get("internet_targets", []))

    output = {
        "checked_at": now,
        "internet": internet_summary,
        "services": services_output,
        "internet_services": internet_services_output,
    }

    with STATUS_PATH.open("w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
