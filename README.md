# 宅LAN站 · Home Shortcut

> **Home Shortcut (宅LAN站)** is a LAN-only home portal and status dashboard for self-hosted services.  
> 宅LAN站是一个完全本地、断网也能用的家庭内网导航与状态面板。

📘 [English README](README.en.md) · 📙 [中文 README](README.zh.md)

---

## Name / 名字由来

**中文名：宅LAN站**

- 「宅」：来自中文“宅在家里”的“宅”，也带一点 otaku / homelab 的感觉——  
  喜欢在家折腾 NAS、软路由、下载器、Home Assistant 的那群人。
- 「LAN」：局域网，本项目只关心你家里的 192.168.x.x 那一片。
- 「站」：一个小站点、门户站，所有服务先到这儿集合。

**英文名：Home Shortcut**

- 表达的是：**家里所有服务的一键入口 / 快捷方式集合**。
- 在英文环境中我们会写成：

> **Home Shortcut (宅LAN站, “zhái” ≈ cozy homebody / homelab vibe)**

让英文用户知道：“宅”大概就是那种很在乎家、在乎局域网、喜欢折腾自建服务的氛围。

---

## What is this? / 这是个啥？

一句话版本：

> **A cozy LAN portal for your homelab and all the gadgets living at home.**  
> 一个给你家 NAS、软路由、下载器、Home Assistant 等“住户”准备的内网入口。

稍微展开一点：

- 你在家里有一堆服务：NAS、下载器、软路由后台、Home Assistant、监控、各种 Web UI。
- IP 和端口永远记不住，内网服务是不是挂了也不知道，家里到底是没网还是就你这台设备没网，更不知道。
- **宅LAN站 · Home Shortcut** 就是：
  - 把这些服务全部拖到一个首页，用卡片导航。
  - 定期用 HTTP / ping / TCP 帮你看它们是不是还活着。
  - 测一测“家里到底有木有外网”。
  - 有网时顺便展示一下天气；没网时自己也能好好活着。

---

## Features / 特性

### 🧭 LAN Portal / 内网导航

- 网格卡片展示常用服务：NAS、下载器、软路由、Home Assistant，etc
- 一键跳转 Web UI，无需再手敲 `http://192.168.1.x:port`.

### 🧯 Only Noisy When Things Break / 出事才嚷嚷

- 支持三种健康检查：
  - `http`：发 HTTP 请求，看状态码 + 响应时间（ms）。
  - `ping`：系统级 ping，看 Up/Down + RTT。
  - `tcp`：尝试建立 TCP 连接。
- 正常服务乖乖呆在“全部服务状态表”里。
- **只有 Down 或异常的服务才会出现在“异常面板”**，提醒你去管。

### 🌐 “到底是家里没网，还是只有我没网？”检测

- 从 `config.yaml` 里读取要探测的外网目标：
  - 例如 1.1.1.1 / 8.8.8.8 / Cloudflare / AWS 等。
- 聚合出一个状态：
  - `Internet: Online (avg 23 ms)`  
  - 或 `Internet: Offline（可能是运营商去喝咖啡了）`

### ☁️ Weather Card / 天气卡片（优雅降级）

- 默认使用无需 API Key 的天气服务（例如 Open-Meteo）。
- 后端做简单缓存（例如 10 分钟），降低请求频率。
- 断网时不拖累整站：
  - 前端只会看到：`Weather: unavailable (internet may be down)` / `天气暂不可用（外网可能断开）`
  - 导航和状态面板依然正常使用。

### ⚙️ Config-Driven / 配置驱动

- 所有内网服务、分类、检测方式通过一份 `config.yaml` 管理：
  - `name`：展示名称
  - `type`: `http` / `ping` / `tcp`
  - `url` 或 `host` / `port`
  - `category`: `Storage` / `Smart Home` / `Network` / `Media` …
  - `important`: `true/false` 用于异常排序和高亮
- 同一份配置里也定义：
  - 互联网探测目标列表；
  - 天气经纬度与时区；
  - TrendRadar 是否启用、使用 link / iframe / api 等模式。

### 🔭 TrendRadar Integration (Planned) / 趋势雷达集成（规划）

- 假定 TrendRadar 独立以 Docker / 服务形式跑在内网。
- 宅LAN站只做两件事：
  - 提供一个 TrendRadar 快捷入口（卡片 + 链接）；
  - 可选用 `<iframe>` 嵌入简单报告页面。
- 将来如果有 JSON/API，可以在首页展示简版的：
  - `Today’s Hot Repos / 今日热点 TOP N`

---

## Architecture Overview / 架构概览

> 目标：**配置 → 定时检查 → API → 前端展示**，互相解耦，方便扩展。

- `config.yaml`  
  - 描述：
    - 所有内网服务（名称、类型、URL/host、分类、重要程度）。
    - 外网探测目标列表。
    - 天气经纬度、时区与缓存设置。
    - TrendRadar 的开关与模式（link / iframe / api）。

- `status_check.py`（定时状态检查脚本）
  - 周期性运行（cron / systemd timer / 宿主机上的调度）。
  - 读取 `config.yaml`，按服务类型执行检查：
    - `http` → 发请求，记录 `up/down`、状态码、响应时间 ms。
    - `ping` → `ping -c 2 -W 1 host`，记录 `up/down`、平均 RTT。
    - `tcp` → 尝试连接指定端口。
  - 检测外网探测目标。
  - 把所有结果写入 `status.json`：
    - `checked_at` / `status` / `latency_ms` / `last_change` 等字段。

- `app.py`（Web 后端：Flask 或 FastAPI）
  - 提供 Web UI + API：
    - `GET /` → 首页：导航 + 状态面板 + 天气 + TrendRadar 区。
    - `GET /api/status` → 从 `status.json` 读取并返回当前状态。
    - `GET /api/weather` → 请求天气服务（有缓存、可断网降级）。
  - 所有 `CSS` / `JS` / 图标放在 `static/` 目录本地提供，**不依赖任何外部 CDN**。

- `templates/index.html`
  - 顶部：
    - Logo（宅LAN站 · Home Shortcut）
    - 当前时间（前端 JS 每秒刷新）
  - 中部：
    - 常用服务的卡片网格（可按分类分组）。
  - 下方：
    - 互联网状态条；
    - 只显示异常的“报警面板”；
    - 可折叠/展开的“全部服务状态表”；
    - 天气卡片；
    - TrendRadar 卡片（按配置决定是链接还是 iframe）。

---

## Example Config / 配置示例（草案）

```yaml
# config.yaml

site:
  title: "宅LAN站 · Home Shortcut"
  timezone: "America/Indiana/Indianapolis"

network:
  internet_targets:
    - host: "1.1.1.1"
      type: "ping"
    - host: "8.8.8.8"
      type: "ping"

weather:
  enabled: true
  provider: "open-meteo"
  latitude: 39.48
  longitude: -87.32
  cache_ttl_seconds: 600

services:
  - name: "NAS"
    type: "http"
    url: "http://192.168.68.10:5000/"
    category: "Storage"
    important: true

  - name: "Home Assistant"
    type: "http"
    url: "http://192.168.68.50:8123/"
    category: "Smart Home"
    important: true

  - name: "Soft Router"
    type: "ping"
    host: "192.168.68.1"
    category: "Network"
    important: true

  - name: "qbittorrent"
    type: "http"
    url: "http://192.168.68.96:8080/"
    category: "Media"
    important: false

trentradar:
  enabled: false
  mode: "link"      # link / iframe / api
  url: "http://192.168.68.99:9000/"
````

---

## Getting Started / 快速开始（预期用法）

> 这里是预期目录结构和命令，实际实现时可以根据需要微调。

### 1. Clone / 克隆仓库

推荐仓库名：`home-shortcut`。

```bash
git clone https://github.com/yourname/home-shortcut.git
cd home-shortcut
```

### 2. Create venv & install deps / 创建虚拟环境并安装依赖

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Edit config / 配置 `config.yaml`

根据你家实际 IP、服务、经纬度修改示例配置。

### 4. Run status check once / 手动跑一次状态检查

```bash
python status_check.py
# 生成 status.json
```

### 5. Start web app / 启动 Web 服务

```bash
python app.py
# 默认监听 http://0.0.0.0:5001（具体视实现而定）
```

浏览器访问：

* `http://<这台机子的 IP>:5001`
* 或者在软路由 / 内网 DNS 中把 `home.myland` 解析到这台机子上，
  然后直接访问：`http://home.myland`

---

## One-Line Launch & Auto-Start / 一行启动 + 自启

1. **配置好 config**  
   - 推荐把真实配置放进 `private/config.yaml`（gitignore，可保护隐私）。

2. **一行启动 / One-liner run**
   ```bash
   ./portalctl.sh run
   ```
   脚本会自动创建 `.venv`、安装依赖，并执行 `flask run --host 0.0.0.0 --port 8000`。

3. **开机自启**
   ```bash
   ./portalctl.sh install
   ```
   - **macOS**：写入 `~/Library/LaunchAgents/com.home.portal.plist` 并通过 `launchctl load -w` 注册。
   - **Linux（Debian/Ubuntu 等）**：写入 `~/.config/systemd/user/home-portal.service` 并执行 `systemctl --user enable --now ...`。（如需无登陆运行，可执行 `loginctl enable-linger $USER`）
   - 日志输出到 `logs/flask.out.log` & `logs/flask.err.log`

4. **移除自启**
   ```bash
   ./portalctl.sh uninstall
   ```
   - macOS 卸载 LaunchAgent；Linux 卸载 systemd user service。

> On non-macOS hosts feel free to adapt `portalctl.sh` for systemd or other init systems; the `run` subcommand仍可本地开发使用。

## Roadmap / 路线图（草案）

* [ ] V0：最小可用版

  * 导航网格 + 外网检测 + 全部服务状态表。
* [ ] V1：异常面板

  * 只显示 down/degraded 的服务。
* [ ] V2：天气模块

  * Open-Meteo 集成 + 缓存 + 断网降级。
* [ ] V3：TrendRadar 集成

  * 链接 + iframe 模式。
* [ ] V4：状态历史 & 简单图表。
* [ ] V5：Docker 化部署（`docker-compose` 示例）。

---

## License / 许可
TBD
