# templates/ (EN)

Terse Jinja2 layer. Server renders static structure; JS paints live data.

- `index.html` includes the Wabi-sabi header, LAN cards, signal panels, tables.
- Receives `site_title`, `services`, `categories` from `config.yaml`.
- Weather, internet, alerts are refreshed via `static/js/main.js`.
- No external CDNs/icons; keep assets local.
