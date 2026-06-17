# 写作助手 Pro — 项目文件与逐文件说明

## 概述
本仓库包含小程序 `写作助手 Pro` 的运营后台示例工程：

- 前端：`web/`（Vue 3 + Vite + Element Plus）
- 后端：`web-server/`（Node.js + Express 简单骨架）

下文为逐文件说明（按功能分组），包含每个主要文件的用途、关键字段或 props、示例与注意事项。

---

**一、前端（路径：web/）**

- 文件：[web/package.json](web/package.json)
  - 作用：项目依赖与脚本。
  - 关键脚本：`dev`（开发服务器），`build`（生产构建），`preview`（预览构建）。

- 文件：[web/vite.config.ts](web/vite.config.ts)
  - 作用：Vite 配置，默认监听端口 4173，加载 `@vitejs/plugin-vue`。

- 文件：[web/tsconfig.json](web/tsconfig.json)
  - 作用：TypeScript 编译选项，包含 `ES2020`、`DOM` 和模块解析设置。

- 文件：[web/index.html](web/index.html)
  - 作用：单页应用 HTML，入口脚本为 `/src/main.ts`，挂载点 `#app`。

- 文件：[web/src/main.ts](web/src/main.ts)
  - 作用：创建 Vue 应用，挂载 Element Plus、路由并挂载到 DOM。

- 文件：[web/src/App.vue](web/src/App.vue)
  - 作用：顶层页面壳，布局包括：左侧 `SidebarMenu`、顶部 `TopBar`、`router-view`。
  - 交互要点：根据路由名判断是否为登录页，隐藏或展示侧栏与顶部栏。

- 文件：[web/src/shims-vue.d.ts](web/src/shims-vue.d.ts)
  - 作用：为 `.vue` 文件提供 TypeScript 类型声明。

- 文件：[web/src/router/index.ts](web/src/router/index.ts)
  - 作用：定义路由表，路由名与路径对照：
    - `/` → `Login`
    - `/dashboard` → `Dashboard`
    - `/users` → `Users`
    - `/ai-config` → `AiConfig`
    - `/templates` → `Templates`
    - `/review` → `Review`
    - `/orders` → `Orders`
    - `/logs` → `Logs`
    - `/settings` → `Settings`

组件与页面（路径：`web/src/components/` 与 `web/src/views/`）

- 组件：`SidebarMenu.vue` ([web/src/components/SidebarMenu.vue](web/src/components/SidebarMenu.vue))
  - 用途：左侧导航栏。
  - 关键点：使用 `el-menu` 的 `router` 模式联动路由，`default-active` 绑定当前路由路径。

- 组件：`TopBar.vue` ([web/src/components/TopBar.vue](web/src/components/TopBar.vue))
  - 用途：顶部信息栏。
  - Props/State：内部维护 `currentTime`，显示管理员名与退出按钮。

- 组件：`StatsCard.vue` ([web/src/components/StatsCard.vue](web/src/components/StatsCard.vue))
  - 用途：仪表盘数值卡片。
  - Props：`title: string`、`value: string`、`subtitle: string`、`status: string`、`statusClass: string`。
  - 示例：`<StatsCard title="今日用户" value="128" status="正常" statusClass="success" />`

- 页面：`LoginView.vue` ([web/src/views/LoginView.vue](web/src/views/LoginView.vue))
  - 用途：管理员登录表单（当前为前端路由跳转模拟登录）。
  - 注意：生产应对接后端 `POST /api/auth/login`，并使用 JWT 或 Session 管理。

- 页面：`DashboardView.vue` ([web/src/views/DashboardView.vue](web/src/views/DashboardView.vue))
  - 用途：运营数据看板，包含统计卡与折线图占位。
  - 建议：接入 ECharts 或 AntV G2 绘制趋势图，并通过 API 拉取近 7 日数据。

- 页面：`UserManagementView.vue` ([web/src/views/UserManagementView.vue](web/src/views/UserManagementView.vue))
  - 用途：用户列表（示例数据为静态数组）。
  - 建议字段：微信昵称、头像、注册时间、会员等级、剩余次数、账号状态。

- 页面：`AiConfigView.vue` ([web/src/views/AiConfigView.vue](web/src/views/AiConfigView.vue))
  - 用途：AI 接口密钥、地址、全局/单用户限额、超时与重试设置。
  - 建议：敏感配置存储在服务端并加密，前端仅做配置面板。

- 页面：`TemplateManagementView.vue` ([web/src/views/TemplateManagementView.vue](web/src/views/TemplateManagementView.vue))
  - 用途：文案模板的增删改查与上下架。

- 页面：`ContentReviewView.vue` ([web/src/views/ContentReviewView.vue](web/src/views/ContentReviewView.vue))
  - 用途：查看用户生成文案、自动关键词标记与人工复核操作。

- 页面：`MembershipOrderView.vue` ([web/src/views/MembershipOrderView.vue](web/src/views/MembershipOrderView.vue))
  - 用途：会员套餐设置、订单列表、导出流水与退款操作。

- 页面：`SystemLogsView.vue` ([web/src/views/SystemLogsView.vue](web/src/views/SystemLogsView.vue))
  - 用途：查看 AI 调用日志、管理员操作日志、异常报错日志。

- 页面：`SystemSettingsView.vue` ([web/src/views/SystemSettingsView.vue](web/src/views/SystemSettingsView.vue))
  - 用途：后台基础设置（管理员密码、小程序信息、公告、客服、版权）。

- 文件：`web/README.md`（详见仓库）

- 文件：`web/.gitignore`（忽略 `node_modules/`、`dist/`）

---

**二、后端（路径：web-server/）**

- 文件：[web-server/package.json](web-server/package.json)
  - 作用：后端依赖与 `start` 脚本。

- 文件：[web-server/server.js](web-server/server.js)
  - 作用：Express 简单示例服务。
  - 暴露的示例接口：
    - `GET /api/health`：返回 `{ status: 'ok', message: '写作助手 Pro 后端已启动' }`
    - `POST /api/auth/login`：示例登录（示例硬编码：用户名 `admin`、密码 `admin123`，返回 `token: 'demo-token'`）
  - 推荐扩展点：
    - 将路由拆分为 `routes/`，并将数据库操作封装到 `services/`。
    - 添加中间件：认证（JWT）、输入校验、错误处理、请求日志。

- 文件：[web-server/README.md](web-server/README.md)
  - 说明后端启动方式与接口示例。

- 文件：`web-server/.gitignore`（忽略 `node_modules/`）

---

## 运行与构建（复制粘贴命令）

前端（开发）：

```powershell
cd "e:\小程序资料\web"
npm install
npm run dev
```

前端（构建生产包并预览）：

```powershell
cd "e:\小程序资料\web"
npm install
npm run build
npm run preview
```

后端（运行）：

```powershell
cd "e:\小程序资料\web-server"
npm install
npm start
```

本地开发建议：前端使用 `npm run dev`（默认 http://localhost:4173），后端使用 `npm start`（默认 http://localhost:3000），在前端请求中使用 `/api/*` 前缀代理或在生产环境配置反向代理。

---

## 后续可交付项（建议优先级）

1. 接入 MySQL：创建 `users`, `orders`, `templates`, `logs` 表，并实现 CRUD API。
2. 登录鉴权：后端实现 JWT 登录并在前端保存 token，保护路由。
3. 内容审核：实现自动关键词匹配 + 人工复核工作流，违规记录保存在 `logs`。
4. 支付打通：对接微信支付或第三方支付完成订单并实现回调与对账。
5. 仪表盘：使用 ECharts 从后端拉取统计数据并渲染趋势图。

---

文件已更新：项目根目录下 `DOCUMENTATION.md`。

如果需要，我可以把每个组件拆成独立的 Markdown（例如 `components/StatsCard.md`、`views/Dashboard.md`），或者自动生成 API 文档（OpenAPI / Swagger）供后端使用。请选择下一步。

---

## 小程序端调用示例
下面给出若干常用调用示例，假设小程序端与后台同域名或已配置跨域/代理，后端 API 前缀为 `/api`。示例均使用微信小程序 `wx.request` API，生产请加上错误处理与重试逻辑。

- 登录并保存 token

```javascript
// pages/login/login.js
wx.request({
  url: 'https://your-domain.com/api/auth/login',
  method: 'POST',
  data: { username: 'admin', password: 'admin123' },
  success(res) {
    if (res.data && res.data.token) {
      wx.setStorageSync('token', res.data.token)
      wx.navigateTo({ url: '/pages/dashboard/index' })
    }
  }
})
```

- 带 token 的请求示例（获取用户列表）

```javascript
const token = wx.getStorageSync('token')
wx.request({
  url: 'https://your-domain.com/api/users',
  method: 'GET',
  header: { Authorization: 'Bearer ' + token },
  success(res) { console.log(res.data) }
})
```

- 获取 AI 配置（示例）

```javascript
wx.request({
  url: 'https://your-domain.com/api/ai/config',
  method: 'GET',
  header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
  success(res) { /* 展示或填充配置表单 */ }
})
```

- 提交人工复核操作（示例）

```javascript
wx.request({
  url: `https://your-domain.com/api/review/${recordId}/review`,
  method: 'POST',
  header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
  data: { result: '通过', note: '人工判定为合规' },
  success(res) { /* 刷新列表 */ }
})
```

注意：小程序端请不要在代码中明文存储任何第三方 AI 密钥或重要凭证，所有敏感配置应保存在后端并通过受控接口读取或设置。

---

## 生产部署建议（要点）
以下为将该后台系统部署为面向真实小程序运营的生产环境时建议的配置与注意事项：

- 域名与 HTTPS
  - 使用固定域名并强制 HTTPS（小程序要求后端接口使用 HTTPS），证书可由 Let's Encrypt 或云服务提供。

- 反向代理与负载均衡
  - 使用 Nginx/云负载均衡器做反向代理与 SSL 终端，后端服务运行在私有网络。

- 接口安全与鉴权
  - 后端实现 JWT 或其它会话机制，前端/小程序使用短期 token。接口对敏感操作（退款、配置修改）做权限校验与操作审计。

- 配置与密钥管理
  - 所有第三方 API Key（大模型密钥、支付密钥）应保存在服务端环境变量或安全的密钥管理服务（如腾讯云密钥管理 KMS）。

- 数据库与备份
  - 使用 MySQL 等关系型数据库保存用户、订单、模板与日志；配置自动备份与异地备份。

- 日志与监控
  - 集中化日志（如 ELK / 腾讯云日志服务），添加错误告警、接口延时监控与调用量统计。

- 内容审核与合规
  - 组合自动关键词、第三方审核接口与人工复核流程；保留审计轨迹以便应对平台抽查或投诉。

- 支付与对账
  - 对接微信支付需在后端实现支付签名、回调验证与服务器端对账逻辑。

- 缓存与 CDN
  - 静态资源（前端构建产物）使用 CDN 分发；接口可在边缘或中间层使用缓存降低数据库压力。

- 性能与扩缩容
  - 使用容器化部署（Docker）、云托管或 K8s，配合水平扩展与自动伸缩策略。

- CI/CD 与蓝绿发布
  - 建立持续集成/持续部署流程，支持灰度/蓝绿发布与快速回滚。

- 隐私与法律合规
  - 按平台要求与法律法规保存用户数据（隐私政策、数据最少化、定期删除过期数据）。

---

如果你希望，我可以：

- 把上述小程序示例整合到 `web-server/README.md` 的“对接说明”部分；
- 为后端生成一份 OpenAPI（Swagger）规范并放到 `web-server/docs/`；
- 或者为前端生成组件级文档（每个 Vue 组件的 Props/Events）。

请选择下一步要我实现的项。 