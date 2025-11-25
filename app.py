"""Flask app for Home Portal MVP."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import re
import subprocess
import sys
import threading
import time

from flask import Flask, jsonify, render_template
import requests
import yaml

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.yaml"
PRIVATE_CONFIG_PATH = BASE_DIR / "private" / "config.yaml"
STATUS_PATH = BASE_DIR / "status.json"
STATUS_SCRIPT = BASE_DIR / "status_check.py"
STATUS_MAX_AGE = 30  # seconds
NOAA_HEADERS = {
    "User-Agent": "HomePortal/1.0 (local)",
    "Accept": "application/geo+json",
}

app = Flask(__name__)
_config_cache = None
_status_lock = threading.Lock()


def load_config(force=False):
    """Load config.yaml once and cache the result."""
    global _config_cache
    if _config_cache is None or force:
        path = PRIVATE_CONFIG_PATH if PRIVATE_CONFIG_PATH.exists() else CONFIG_PATH
        if not path.exists():
            raise FileNotFoundError(
                f"Config file not found: {path}. Please create config.yaml or private/config.yaml."
            )
        with path.open("r", encoding="utf-8") as fh:
            _config_cache = yaml.safe_load(fh) or {}
    return _config_cache


def status_file_is_fresh(max_age=STATUS_MAX_AGE):
    if not STATUS_PATH.exists():
        return False
    mtime = STATUS_PATH.stat().st_mtime
    return (time.time() - mtime) < max_age


def run_status_check():
    """Invoke the standalone status_check.py script."""
    try:
        subprocess.run(
            [sys.executable, str(STATUS_SCRIPT)],
            check=False,
            cwd=str(BASE_DIR),
        )
    except OSError:
        # swallow errors; API will report missing file
        pass


def ensure_status_fresh():
    """Run status check if cached data is stale (>=30s)."""
    if status_file_is_fresh():
        return
    with _status_lock:
        if status_file_is_fresh():
            return
        run_status_check()


def read_status():
    ensure_status_fresh()
    if not STATUS_PATH.exists():
        return {"available": False, "error": "status file not found"}
    try:
        with STATUS_PATH.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError:
        return {"available": False, "error": "status file malformed"}


@app.route("/")
def index():
    config = load_config()
    categories = {}
    for svc in config.get("services", []):
        cat = svc.get("category", "Misc") or "Misc"
        categories.setdefault(cat, []).append(svc)
    return render_template(
        "index.html",
        site_title=config.get("site_title", "Home Portal"),
        services=config.get("services", []),
        categories=categories,
    )


@app.route("/api/status")
def api_status():
    data = read_status()
    return jsonify(data)


def is_us_location(lat, lon):
    if lat is None or lon is None:
        return False
    return 18 <= lat <= 72 and -170 <= lon <= -60


def fahrenheit_to_c(temp):
    if temp is None:
        return None
    return round((float(temp) - 32) * 5 / 9, 1)


def parse_wind_speed(value):
    if not value:
        return None
    matches = re.findall(r"[-+]?[0-9]*\.?[0-9]+", value)
    if not matches:
        return None
    try:
        mph = float(matches[-1])
    except ValueError:
        return None
    return round(mph * 1.60934, 1)


def map_noaa_condition(text):
    if not text:
        return 0
    normalized = text.lower()
    mapping = [
        ("thunder", 95),
        ("snow", 85),
        ("sleet", 77),
        ("hail", 96),
        ("rain", 63),
        ("showers", 80),
        ("drizzle", 55),
        ("fog", 45),
        ("cloudy", 3),
        ("overcast", 3),
        ("sunny", 0),
        ("clear", 0),
    ]
    for keyword, code in mapping:
        if keyword in normalized:
            return code
    return 0


def fetch_noaa_weather(lat, lon):
    try:
        points_resp = requests.get(
            f"https://api.weather.gov/points/{lat},{lon}",
            headers=NOAA_HEADERS,
            timeout=5,
        )
        points_resp.raise_for_status()
        properties = points_resp.json().get("properties", {})
        hourly_url = properties.get("forecastHourly")
        if not hourly_url:
            return None
        hourly_resp = requests.get(hourly_url, headers=NOAA_HEADERS, timeout=5)
        hourly_resp.raise_for_status()
        periods = hourly_resp.json().get("properties", {}).get("periods", [])
        if not periods:
            return None
        current = periods[0]
        hourly = []
        for period in periods[:12]:
            temp_c = fahrenheit_to_c(period.get("temperature"))
            if temp_c is None:
                continue
            precip = period.get("probabilityOfPrecipitation") or {}
            hourly.append(
                {
                    "time": period.get("startTime"),
                    "temperature": temp_c,
                    "precipitation_probability": precip.get("value"),
                    "weathercode": map_noaa_condition(period.get("shortForecast")),
                }
            )

        wind_kmh = parse_wind_speed(current.get("windSpeed"))
        return {
            "available": True,
            "provider": "noaa",
            "temperature": fahrenheit_to_c(current.get("temperature")),
            "windspeed": wind_kmh,
            "weathercode": map_noaa_condition(current.get("shortForecast")),
            "is_day": bool(current.get("isDaytime", True)),
            "hourly": hourly,
            "aurora": {
                "available": False,
                "reason": "aurora data not provided for NOAA",
            },
            "raw": {"noaa": {"current": current}},
        }
    except requests.RequestException:
        return None


def build_hourly_forecast(hourly, current=None, limit=6):
    if not hourly:
        return build_fallback_forecast(current, limit)

    times = hourly.get("time", []) or []
    temps = hourly.get("temperature_2m") or []
    pops = hourly.get("precipitation_probability") or []
    codes = hourly.get("weathercode") or []
    if not times:
        return build_fallback_forecast(current, limit)
    now = datetime.now(timezone.utc)
    forecast = []
    for idx, t_str in enumerate(times):
        temp = temps[idx] if idx < len(temps) else None
        pop = pops[idx] if idx < len(pops) else None
        code = codes[idx] if idx < len(codes) else None
        try:
            ts = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
        except ValueError:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts < now or temp is None:
            continue
        forecast.append(
            {
                "time": t_str,
                "temperature": temp,
                "precipitation_probability": pop,
                "weathercode": code,
            }
        )
        if len(forecast) >= limit:
            break
    return forecast or build_fallback_forecast(current, limit)


def build_fallback_forecast(current, limit):
    if not current:
        return []
    base_temp = current.get("temperature")
    if base_temp is None:
        return []
    code = current.get("weathercode")
    now = datetime.now(timezone.utc)
    fallback = []
    for i in range(limit):
        ts = now + timedelta(hours=i + 1)
        fallback.append(
            {
                "time": ts.isoformat(),
                "temperature": base_temp,
                "precipitation_probability": None,
                "weathercode": code,
                "fallback": True,
            }
        )
    return fallback


def fetch_aurora(lat, lon, enabled):
    if not enabled:
        return {"available": False, "reason": "aurora check disabled"}
    try:
        resp = requests.get(
            "https://api.open-meteo.com/v1/aurora",
            params={
                "latitude": lat,
                "longitude": lon,
                "forecast_hours": 1,
                "forecast_days": 1,
                "hourly": "aurora_probability",
            },
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        hourly = data.get("hourly", {})
        probs = hourly.get("aurora_probability") or hourly.get("probability")
        times = hourly.get("time", [])
        if not probs:
            return {"available": False, "reason": "aurora probability missing"}
        probability = probs[0]
        timestamp = times[0] if times else None
        return {
            "available": True,
            "probability": probability,
            "time": timestamp,
            "active": probability is not None and probability >= 50,
        }
    except requests.RequestException:
        return {
            "available": True,
            "probability": 0,
            "time": None,
            "active": False,
            "degraded": True,
        }


@app.route("/api/weather")
def api_weather():
    config = load_config()
    weather_cfg = config.get("weather", {})
    if not weather_cfg.get("enabled", False):
        return jsonify({"available": False, "reason": "weather disabled in config"})

    lat = weather_cfg.get("lat")
    lon = weather_cfg.get("lon")
    timezone = weather_cfg.get("timezone")

    if is_us_location(lat, lon):
        noaa_data = fetch_noaa_weather(lat, lon)
        if noaa_data:
            return jsonify(noaa_data)

    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": True,
        "hourly": "temperature_2m,precipitation_probability,weathercode",
        "forecast_days": 1,
    }
    if timezone:
        params["timezone"] = timezone
    try:
        resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params=params,
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        current = data.get("current_weather", {})
        hourly = build_hourly_forecast(data.get("hourly"), current)
        aurora = fetch_aurora(
            lat,
            lon,
            weather_cfg.get("aurora_check", False),
        )
        return jsonify(
            {
                "available": True,
                "temperature": current.get("temperature"),
                "windspeed": current.get("windspeed"),
                "weathercode": current.get("weathercode"),
                "is_day": bool(current.get("is_day", 1)),
                "hourly": hourly,
                "aurora": aurora,
                "raw": data,
            }
        )
    except requests.RequestException:
        return jsonify({"available": False, "reason": "network error or API unavailable"})


if __name__ == "__main__":
    load_config()
    app.run(host="0.0.0.0", port=8000, debug=False)
