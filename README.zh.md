# 宅LAN站 / Home Shortcut（中文）

面向家庭内网的统一入口，全部静态资源本地化，仅依赖 Flask / PyYAML / Requests。

📘 [English README](README.en.md)

## 快速开始
1. `python3 -m venv .venv && source .venv/bin/activate`
2. `pip install -r requirements.txt`
3. `python status_check.py` 生成 `status.json`
4. `FLASK_APP=app.py flask run --host 0.0.0.0 --port 8000`

## 目录说明
- `config.yaml`：站点标题、内网服务、外网连通性、天气等配置
- `status_check.py`：根据配置执行 HTTP/Ping/TCP 检查并输出 `status.json`
- `app.py`：Flask 页面 + API（状态 / 天气）
- `templates/`、`static/`：前端模板与样式脚本
- `private/`：留给个人私密配置或素材，建议加入 .gitignore

## 其他提示
- 不依赖任何外部 CDN 或图标库，断网可用
- 天气接口失败会优雅降级，页面不会报错
- 如需自定义，建议复制配置到 `private/` 下再引用
