# Home Shortcut / 宅LAN站 (English)

Self-hosted landing page for家庭局域网 services. Fully local assets; dependencies limited to Flask, PyYAML, Requests.

📙 [中文 README](README.zh.md)

## Quick Start
1. `python3 -m venv .venv && source .venv/bin/activate`
2. `pip install -r requirements.txt`
3. `python status_check.py` to generate `status.json`
4. `FLASK_APP=app.py flask run --host 0.0.0.0 --port 8000`

## Files
- `config.yaml` holds site metadata, LAN services, upstream internet tests, weather targets
- `status_check.py` reads config + writes `status.json`
- `app.py` serves UI + lightweight APIs
- `templates/`, `static/` deliver the terminal look UI
- `private/` reserved for personal overrides (git-ignore recommended)

## Notes
- Everything is self-contained; no CDN, fonts, or icon downloads needed
- Weather gracefully degrades when offline, site keeps working
- Modify `config.yaml` (or copy into `private/`) to adapt to your LAN

## Config Template
- A fully-commented starter lives at `config.yaml` in the repo root.
- For real deployments, copy it to `private/config.yaml`, adjust values, and keep secrets out of git.
