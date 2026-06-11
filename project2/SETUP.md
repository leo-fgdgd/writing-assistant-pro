# 语灵 AI — 云开发部署指南

## 一、开通云开发

1. 用微信开发者工具打开 `project2` 目录
2. 点击顶部工具栏「**云开发**」按钮
3. 开通云开发（选择基础版即可，免费额度足够日常使用）

## 二、配置环境 ID

1. 在云开发控制台「设置 → 环境设置」中复制你的**环境 ID**
2. 将环境 ID 填入 `miniprogram/app.js` 的 `globalData.env` 字段：
   ```js
   env: 'your-env-id-xxxx',
   ```

## 三、创建数据库集合

在云开发控制台「**数据库**」中，创建以下集合（全部设为「仅创建者可读写」）：

| 集合名 | 用途 | 权限 |
|---|---|---|
| `users` | 用户信息 | 仅创建者可读写 |
| `conversations` | 对话记录 | 仅创建者可读写 |
| `polishes` | 润色记录 | 仅创建者可读写 |
| `history` | 操作历史 | 仅创建者可读写 |
| `feedback` | 用户反馈 | 仅创建者可读写 |
| `logs` | 操作日志 | 仅创建者可读写 |
| `settings` | 系统设置 | 仅创建者可读写 |

> 如果某集合提示已存在，跳过即可。

## 四、配置 AI API Key

1. 在云开发控制台「**云函数 → api → 版本与配置 → 环境变量**」中添加：
   - `AI_API_KEY` = 你的 DeepSeek API Key（从 https://platform.deepseek.com/api_keys 获取）
   - `AI_PROVIDER` = `deepseek`（默认）或 `moonshot`

2. 保存后重新上传云函数使其生效

## 五、上传云函数

```bash
# 在微信开发者工具中：
# 右键单击 cloudfunctions/api 目录 → 上传并部署：云端安装依赖
```

等待部署完成（约 1-2 分钟，首次需要安装 wx-server-sdk 依赖）。

## 六、初始化系统设置（可选）

在小程序 `app.js` 中添加一次性初始化代码，或者通过管理后台手动设置。

## 七、模式切换

`miniprogram/utils/config.js` 中：
- `mode: 'cloud'` → 使用云函数（当前默认）
- `mode: 'http'` → 使用自建 HTTP 后端

---

部署完成后，小程序即可完全通过云开发运行，无需自建服务器。
