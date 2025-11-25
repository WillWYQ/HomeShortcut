# static/js/（中文）

原生 JavaScript 行为层。

- `main.js` 负责：
  - 时钟显示、暗/亮主题切换、语言切换
  - 定时请求 `/api/status`、`/api/weather`
  - 更新互联网状态 pill、异常面板、服务表格
  - 渲染天气图标、小时预报、极光状态
- 不依赖框架/打包工具，保持离线友好。
