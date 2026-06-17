# 语灵 AI · 智能写作助手

> 一款基于微信云开发的小程序 AI 写作助手，支持多场景创作、文风润色、草稿收藏、创作成就等能力。

[![WeChat Mini Program](https://img.shields.io/badge/微信小程序-3.16.1+-07C160?logo=wechat)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![CloudBase](https://img.shields.io/badge/CloudBase-云开发-0E65C2)](https://cloud.tencent.com/product/tcb)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 目录

- [功能概览](#-功能概览)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [配置详解](#-配置详解)
- [API 文档](#-api-文档)
- [Token 预算系统](#-token-预算系统)
- [Caveman 压缩模式](#-caveman-压缩模式)
- [成就系统](#-成就系统)
- [部署指南](#-部署指南)
- [技术栈](#-技术栈)
- [常见问题](#-常见问题)

---

## ✨ 功能概览

### 🏠 工作台
- **创作统计**：展示累计创作次数、连续创作天数、累计消耗词元数
- **每日额度**：可视化 Token 用量进度条，超 80% 自动预警
- **场景入口**：学术写作、商务公文、创意故事、求职简历四大专业场景
- **最近创作**：快速查看和恢复最近的创作记录

### 💬 AI 智能对话
- 支持 **4 大专业场景**：学术写作、商务公文、创意故事、求职简历
- **场景模板**：进入指定场景自动填充格式模板，引导用户精准表达
- **多轮对话**：保留上下文（最近 10 轮），支持重新生成
- **一键复制**：AI 回复内容一键复制到剪贴板
- **草稿保存**：未完成的输入可保存为草稿，随时恢复
- **内容收藏**：喜欢的 AI 回复可收藏，永久保存

### ✨ 文风润色
- **4 种润色模式**：文字润色、句式改写、正式化、口语化
- 实时预览效果，支持复制和保存

### 📋 历史记录
- 对话和润色记录统一管理
- 支持搜索和按类型筛选
- 支持单条删除

### 👤 个人中心
- 昵称 / 头像编辑（头像上传至云存储）
- **创作成就系统**：累计创作数、连续天数、词元消耗量等多维度成就
- 草稿箱、收藏夹快捷入口
- 通用设置、隐私协议、帮助反馈

### 🔧 高级功能
- **Caveman 压缩模式**：4 级可调（标准 → 精简 → 压缩 → 极限），最高节省 85% Token
- **Token 预算控制**：每人每日 5,000 tokens 免费额度，凌晨自动重置
- **管理员后台**：反馈管理、日志查询、系统设置
- **邮件通知**：用户反馈自动邮件推送

---

## 📁 项目结构

```
project2/
├── miniprogram/                    # 小程序前端
│   ├── app.js                      # 入口文件（云开发初始化 + 自动登录）
│   ├── app.json                    # 全局配置（页面路由 + 底部 Tab）
│   ├── app.wxss                    # 全局样式
│   ├── components/
│   │   └── cloudTipModal/          # 云开发提示组件
│   ├── images/
│   │   ├── avatar.png              # 默认头像
│   │   └── icons/                  # Tab 图标
│   ├── pages/
│   │   ├── index/                  # 工作台首页
│   │   ├── chat/                   # AI 对话页
│   │   ├── polish/                 # 文风润色页
│   │   ├── history/                # 历史记录页
│   │   ├── drafts/                 # 草稿箱
│   │   ├── favorites/              # 收藏夹
│   │   ├── profile/                # 个人中心
│   │   ├── settings/               # 通用设置
│   │   ├── privacy/                # 隐私协议
│   │   └── feedback/               # 帮助与反馈
│   ├── utils/
│   │   ├── api.js                  # 统一 API 层（cloud/http 双模式）
│   │   ├── config.js               # 全局配置
│   │   ├── logger.js               # 日志上报
│   │   ├── markdown.js             # Markdown 清理
│   │   └── storage.js              # 本地存储（草稿/收藏）
│   └── envList.js                  # 环境列表
├── cloudfunctions/
│   ├── api/                        # 核心 API 云函数
│   │   ├── index.js                # 主逻辑（路由 + AI + 预算 + 邮件）
│   │   ├── package.json            # 依赖
│   │   └── config.json             # 云函数配置
│   └── quickstartFunctions/        # 快速入门示例函数
│       ├── index.js
│       ├── package.json
│       └── config.json
├── project.config.json             # 微信开发者工具配置
├── project.private.config.json     # 私有配置（不提交）
├── uploadCloudFunction.sh          # 云函数快捷上传脚本
└── SETUP.md                        # 详细部署指南
```

---

## 🚀 快速开始

### 前置条件

1. [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（最新稳定版）
2. 已注册的微信小程序 AppID
3. 微信云开发环境（在开发者工具中开通即可，基础版免费）

### 1 分钟跑起来

```bash
# 1. 克隆仓库
git clone https://github.com/leo-fgdgd/writing-assistant-pro.git
cd writing-assistant-pro

# 2. 用微信开发者工具打开 project2 目录

# 3. 修改 miniprogram/utils/config.js 中的 cloudEnvId 为你的环境 ID

# 4. 开通云开发，创建所需数据库集合（详见 SETUP.md）

# 5. 配置 AI API Key（详见下方配置详解）

# 6. 右键 cloudfunctions/api → 上传并部署：云端安装依赖

# 7. 点击「编译」开始体验
```

> 完整部署流程请查看 [SETUP.md](./SETUP.md)

---

## ⚙️ 配置详解

### 全局配置 (`miniprogram/utils/config.js`)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'cloud'` \| `'http'` | `'cloud'` | 部署模式 |
| `cloudEnvId` | `string` | `cloud1-d3gviafeg6e004666` | CloudBase 环境 ID |
| `httpBaseUrl` | `string` | `http://127.0.0.1:3001` | HTTP 模式后端地址 |
| `cloudFunctionName` | `string` | `'api'` | 云函数名称 |
| `requestTimeout` | `number` | `10000` | 普通请求超时（ms） |
| `aiRequestTimeout` | `number` | `30000` | AI 请求超时（ms） |

### AI 提供商配置

在云函数环境变量中设置：

| 环境变量 | 必填 | 说明 | 示例 |
|----------|------|------|------|
| `AI_API_KEY` | ✅ | AI API 密钥 | `sk-xxxxx` |
| `AI_PROVIDER` | ❌ | AI 提供商 | `deepseek`（默认）或 `moonshot` |

**支持的 AI 提供商：**

| 提供商 | 模型 | API 地址 |
|--------|------|----------|
| DeepSeek | `deepseek-chat` | `api.deepseek.com` |
| Moonshot | `moonshot-v1-8k` | `api.moonshot.cn` |

### 邮件通知配置（可选）

| 环境变量 | 必填 | 说明 |
|----------|------|------|
| `EMAIL_HOST` | ❌ | SMTP 服务器（默认 `smtp.qq.com`） |
| `EMAIL_PORT` | ❌ | SMTP 端口（默认 `465`） |
| `EMAIL_SECURE` | ❌ | 启用 SSL（默认 `true`） |
| `EMAIL_USER` | ❌ | 发件邮箱地址 |
| `EMAIL_PASS` | ❌ | SMTP 授权码 |
| `EMAIL_TO` | ❌ | 接收通知的邮箱 |

### 管理员配置

| 环境变量 | 说明 |
|----------|------|
| `ADMIN_OPENIDS` | 管理员 OPENID 列表，逗号分隔 |

---

## 📡 API 文档

所有 API 通过 `wx.cloud.callFunction({ name: 'api', data: { action, payload } })` 调用。

### Auth
| Action | 说明 |
|--------|------|
| `auth/login` | 微信登录（自动获取 OPENID） |

### Chat
| Action | 说明 |
|--------|------|
| `chat/send` | 发送消息 |
| `chat/list` | 对话列表 |
| `chat/get` | 获取对话详情 |
| `chat/delete` | 删除对话 |

### Polish
| Action | 说明 |
|--------|------|
| `polish` | 文风润色 |
| `polish/get` | 获取润色记录 |

### History
| Action | 说明 |
|--------|------|
| `history` | 历史列表（支持 search/filter） |
| `history/delete` | 删除历史记录 |

### Profile
| Action | 说明 |
|--------|------|
| `profile` | 获取个人资料 |
| `profile/update` | 更新昵称/头像 |

### Feedback
| Action | 说明 | 权限 |
|--------|------|------|
| `feedback` | 提交反馈 | 所有用户 |
| `feedback/list` | 反馈列表 | 管理员 |
| `feedback/update` | 更新反馈状态 | 管理员 |

### Others
| Action | 说明 |
|--------|------|
| `budget` | 查询当日 Token 用量 |
| `settings` | 获取系统设置 |
| `settings/update` | 更新系统设置（管理员） |
| `logs` | 提交日志 |
| `logs/query` | 查询日志（管理员） |
| `health` | 健康检查 |

---

## 🎯 Token 预算系统

### 规则

| 项目 | 值 |
|------|-----|
| 每日免费额度 | **5,000 tokens** |
| 重置时间 | 每日凌晨 00:00 |
| 超额处理 | 返回 429，提示额度用完 |

### 用量跟踪

- 基于 `users` 集合的 `dailyTokens` 字段
- 每次 AI 调用后自动累加实际消耗的 token 数
- 工作台首页显示用量进度条，超 80% 预警

### 额度检查流程

```
用户发送消息
  → 预估消耗 (chat: 1024 tokens, polish: 512 tokens)
  → 查询当日已用量
  → 判断剩余额度是否足够
  → ✅ 足够 → 调用 AI → 累加用量
  → ❌ 不足 → 返回 429 错误
```

---

## 🗜️ Caveman 压缩模式

通过精简系统提示词和压缩输出，大幅降低 Token 消耗。

| 级别 | 标签 | 预估节省 | 说明 |
|------|------|----------|------|
| 标准 | — | 0% | 完整输出，适合专业场景 |
| 精简 | `lite` | ~40% | 去掉冗余修饰，直接说重点 |
| 压缩 | `full` | ~70% | 去虚词、短句优先、信息密度最大化 |
| 极限 | `ultra` | ~85% | 词语缩写、省略主语连词 |

**切换方式**：在对话页点击 ☰ 按钮循环切换。

---

## 🏆 成就系统

| 成就 | 条件 |
|------|------|
| ✍️ 初次创作 | 完成第 1 次 AI 创作 |
| 🔥 笔耕不辍 | 累计创作 10 次 |
| 📚 著作等身 | 累计创作 50 次 |
| 👑 创作大师 | 累计创作 100 次 |
| 📅 连续 3 天 | 连续创作 3 天 |
| 🗓️ 周常创作 | 连续创作 7 天 |
| 🏅 月度之星 | 连续创作 30 天 |
| ⚡ 万字产出 | 累计消耗 1 万 tokens |
| 💎 高产作者 | 累计消耗 10 万 tokens |

---

## 🗄️ 数据库集合

| 集合名 | 用途 | 权限 |
|--------|------|------|
| `users` | 用户信息、Token 用量、统计 | 仅创建者可读写 |
| `conversations` | AI 对话记录 | 仅创建者可读写 |
| `polishes` | 润色记录 | 仅创建者可读写 |
| `history` | 操作历史 | 仅创建者可读写 |
| `feedback` | 用户反馈 | 仅创建者可读写 |
| `logs` | 操作日志 | 仅创建者可读写 |
| `settings` | 系统设置 | 仅创建者可读写 |

---

## 🛠️ 技术栈

### 前端（小程序）
- 微信小程序原生框架（基础库 3.16.1+）
- CloudBase JS SDK (`wx.cloud`)
- 原生 CSS（WXSS）+ Flexbox 布局

### 后端（云函数）
- Node.js + `wx-server-sdk`
- DeepSeek / Moonshot AI API（原生 `https` 模块 + 连接池）
- Nodemailer（邮件通知）
- 内存安全的集合代理（自动降级 + 错误恢复）

### 运维
- 微信云开发（CloudBase）
- 云函数日志 + CLS 日志服务
- 管理员后台（反馈管理 + 日志查询 + 系统设置）

---

## ❓ 常见问题

<details>
<summary><b>Q: 云函数调用超时怎么办？</b></summary>

首次超时后，前端会自动降级为离线模式（不再尝试调用云函数）。请检查：

1. 云函数是否已部署（`cloudfunctions/api` 右键 → 上传并部署）
2. `AI_API_KEY` 环境变量是否已配置
3. AI API 服务是否可正常访问
4. 重启微信开发者工具再试

</details>

<details>
<summary><b>Q: 如何切换 AI 提供商？</b></summary>

在云函数环境变量中修改 `AI_PROVIDER`：
- `deepseek` → DeepSeek（默认，推荐）
- `moonshot` → Moonshot

修改后需重新上传云函数生效。

</details>

<details>
<summary><b>Q: 每日额度可以调整吗？</b></summary>

修改 `cloudfunctions/api/index.js` 中的 `DAILY_TOKEN_LIMIT` 常量，然后重新部署云函数即可。

> 当前默认值：**5,000 tokens/天**
</details>

<details>
<summary><b>Q: Caveman 模式和标准模式有什么区别？</b></summary>

Caveman 模式通过修改系统提示词，让 AI 输出更精简的回复，从而节省 Token：

- 从专业场景进入的对话默认使用标准模式（保持专业输出质量）
- 自由对话默认使用极限模式（节省 Token）
- 用户可随时通过 ☰ 按钮手动切换

</details>

<details>
<summary><b>Q: 如何成为管理员？</b></summary>

在云函数环境变量中配置 `ADMIN_OPENIDS`：

```
ADMIN_OPENIDS = oXXXXX-yyyyyy
```

多个 OPENID 用逗号分隔。获取 OPENID：在小程序中任意调用一次云函数，查看云函数日志中的 `openid` 字段。

</details>

---

## 📄 License

MIT License © 2025 语灵 AI

---

## 🔗 相关链接

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [CloudBase 文档](https://cloud.tencent.com/product/tcb)
- [DeepSeek API](https://platform.deepseek.com/api_keys)
- [Moonshot API](https://platform.moonshot.cn)

---

<p align="center">
  <sub>Made with ❤️ by 语灵 AI Team</sub>
</p>
