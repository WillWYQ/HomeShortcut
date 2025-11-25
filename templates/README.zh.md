# templates/（中文）

轻量的 Jinja2 模板层，仅负责静态结构。

- `index.html`：侘寂风主页，含导航、网络状态、天气、异常面板等。
- 数据来源：`config.yaml` 注入站点标题与服务列表。
- 实时状态/天气由 `static/js/main.js` 定期调用后端 API 渲染。
- 全站禁止使用外部 CDN / icon，保持离线依赖。
