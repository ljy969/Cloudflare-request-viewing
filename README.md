# Cloudflare 使用情况追踪器

[英文](./README.en.md)


---

## 目录

- [一、项目简介](#一项目简介)
- [二、功能特性](#二功能特性)
- [三、技术栈](#三技术栈)
- [四、项目结构](#四项目结构)
- [五、工作原理](#五工作原理)
- [六、快速开始（5 步上手）](#六快速开始5-步上手)
  - [第 1 步：获取 Cloudflare Account ID](#第-1-步获取-cloudflare-account-id)
  - [第 2 步：创建 Cloudflare API Token](#第-2-步创建-cloudflare-api-token)
  - [第 3 步：部署 Worker 代理（解决跨域）](#第-3-步部署-worker-代理解决跨域)
  - [第 4 步：在应用中添加账户](#第-4-步在应用中添加账户)
  - [第 5 步：获取使用数据](#第-5-步获取使用数据)
- [七、本地运行](#七本地运行)
- [八、部署指南](#八部署指南)
  - [8.1 部署 Pages 前端](#81-部署-pages-前端)
  - [8.2 部署 Worker API 代理](#82-部署-worker-api-代理)
  - [8.3 自定义域名](#83-自定义域名)
- [九、使用教程（详细步骤）](#九使用教程详细步骤)
  - [9.1 仪表盘](#91-仪表盘)
  - [9.2 账户管理](#92-账户管理)
  - [9.3 多账户对比](#93-多账户对比)
  - [9.4 数据管理](#94-数据管理)
  - [9.5 设置](#95-设置)
  - [9.6 界面语言与主题切换](#96-界面语言与主题切换)
- [十、数据采集详解](#十数据采集详解)
- [十一、数据存储方案](#十一数据存储方案)
- [十二、API 认证说明](#十二api-认证说明)
- [十三、配置项详解](#十三配置项详解)
- [十四、常见问题（FAQ）](#十四常见问题faq)
- [十五、开发指南](#十五开发指南)
- [十六、许可证](#十六许可证)
- [十七、技术支持](#十七技术支持)

---

## 一、项目简介

**Cloudflare 使用情况追踪器（CF Usage Tracker）** 是一个纯前端、零后端数据库的 Cloudflare 资源监控工具。它可以帮助你：

- 实时监控 Cloudflare 账户的 **HTTP 请求数、Worker 调用数、带宽、页面浏览、独立访客** 等核心指标；
- 同时管理 **多个 Cloudflare 账户**，并在一个界面里汇总对比；
- 所有数据 **仅保存在你自己的浏览器**（IndexedDB）中，不上传任何第三方服务器；
- 完全兼容 **Cloudflare Pages + Workers** 一键部署，全球 CDN 加速、零服务器运维。

### 为什么需要它？

Cloudflare 官方 Dashboard 的 Analytics 数据分散、且默认只展示图表。本项目把数据拉取到本地，提供长期趋势、多账户对比、本地备份，并可以持续记录历史数据（最长 90 天回溯），便于成本分析与容量规划。

### 核心亮点

- ✅ **零构建**：原生 JavaScript + CSS，无需 Node 编译，直接静态托管。
- ✅ **隐私优先**：API Token 只存在浏览器本地，Worker 代理只做请求转发、不缓存、不记录。
- ✅ **优雅降级**：未配置 Worker 代理时自动使用模拟数据，你可先体验完整界面。
- ✅ **双语界面**：内置中文 / 英文 i18n，可一键切换。
- ✅ **深色模式**：深色 / 浅色 / 跟随系统三档主题，无闪烁切换。
- ✅ **响应式**：桌面、平板、手机全适配。

### 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                          你的浏览器                                  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  前端 SPA（index.html + js/*.js + Chart.js + idb）         │  │
│  │                                                             │  │
│  │   仪表盘 / 账户管理 / 多账户对比 / 数据管理 / 设置          │  │
│  │        │                              │                     │  │
│  │        │ 读取/写入                    │ 发起采集             │  │
│  │        ▼                              ▼                     │  │
│  │   IndexedDB (cf_tracker_db)     Cloudflare API 封装          │  │
│  │   accounts / usage_records /    (js/api.js)                 │  │
│  │   app_settings                   │                          │  │
│  └──────────────────────────────────┼─────────────────────────┘  │
│                                     │                              │
└─────────────────────────────────────┼──────────────────────────────┘
                                      │ HTTPS (POST)
                                      ▼
                       ┌──────────────────────────────────┐
                       │  Cloudflare Worker 代理           │
                       │  （仅做转发 + 添加 CORS 头）       │
                       │  → api.cloudflare.com/client/v4   │
                       │     GraphQL: httpRequests*Groups  │
                       └──────────────────────────────────┘
```

---

## 二、功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| **自动数据采集** | 定时（可配置）从 Cloudflare GraphQL Analytics API 获取请求数、Worker 调用、带宽等指标 |
| **多账户管理** | 支持添加多个 Cloudflare 账户，独立追踪、一键切换、汇总对比 |
| **数据可视化** | 基于 Chart.js 的趋势折线图（双 Y 轴）、资源分布环形图、多账户对比图 |
| **本地数据存储** | 所有数据仅保存在浏览器 IndexedDB 中，绝不上传远程服务器 |
| **数据备份恢复** | 一键导出 JSON 备份文件，支持从备份文件完整恢复（覆盖式导入） |
| **深色 / 浅色主题** | 支持深色、浅色、跟随系统三种模式，CSS 变量驱动无闪烁切换 |
| **响应式设计** | 桌面、平板、手机全适配，移动端汉堡菜单导航 |
| **双语界面** | 内置中文 / 英文，侧边栏底部一键切换，状态持久化 |
| **Cloudflare 部署** | 完全兼容 Cloudflare Pages 静态部署 + Worker API 代理 |

### 数据采集范围

应用从 Cloudflare GraphQL Analytics API 采集以下使用情况数据：

| 指标 | 说明 | 来源字段 |
|------|------|----------|
| 请求数 (Requests) | 每日 HTTP 请求总数 | `httpRequestsAdaptiveGroups.count` |
| Worker 调用 (Workers Invocations) | 由请求数按比例估算的每日 Worker 调用次数 | 代码中按 `requests × 0.08` 估算 |
| 带宽使用 (Bandwidth) | 每日出站带宽消耗（字节） | `httpRequestsAdaptiveGroups.sum.bytes` |
| 页面浏览 (Page Views) | 由请求数按比例估算的每日页面浏览数 | 代码中按 `requests × 1.2` 估算 |
| 独立访客 (Unique Visitors) | 由请求数按比例估算的每日独立访客数 | 代码中按 `requests × 0.35` 估算 |

> ⚠️ **关于估算指标**：Cloudflare 的免费 Analytics GraphQL 接口不直接返回「Worker 调用数 / 页面浏览 / 独立访客」的精确值。本项目基于请求数按固定比例做合理估算，用于趋势展示。若某天 API 返回真实 `bytes` 偏低，带宽也会回退到估算值（`requests × 2.5 × 1024` 字节）。精确的 Worker / Page Views 指标需开通 Cloudflare 付费 Analytics 产品。

### 采集频率

| 模式 | 说明 |
|------|------|
| 自动采集 | 可配置间隔：30 分钟 / 1 小时 / 6 小时 / 12 小时 / 每天 / 禁用 |
| 手动刷新 | 点击顶部「刷新」按钮立即获取所有账户最新数据 |
| 历史回溯 | 每次采集时自动回溯获取最近 7 / 30 / 90 天的历史数据 |

---

## 三、技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | 原生 JavaScript（ES6 模块 / 全局对象） | 零构建依赖，无需 Node.js 编译 |
| UI 样式 | CSS3 + CSS 变量 | 主题系统由 CSS 变量驱动 |
| 数据可视化 | Chart.js 4.4.1 | 通过 CDN 加载，折线图 / 环形图 / 对比图 |
| 本地存储 | IndexedDB（本地内置轻量 idb 兼容层） | 结构化存储，支持事务和索引 |
| API 代理 | Cloudflare Worker（ES Module 格式） | 解决浏览器 CORS 跨域限制 |
| 部署平台 | Cloudflare Pages + Workers | 全球 CDN 分发，零服务器维护 |
| 外部依赖 | Chart.js（CDN）、idb 兼容层（本地） | 均通过 CDN / 本地 vendor 加载，无 npm 依赖 |

> `js/vendor/idb.js` 为本地内置的轻量级 idb 兼容层（手写实现，API 与官方 idb 库一致），确保离线 / Pages 环境下也能正常初始化 IndexedDB（避免 `idb is not defined` 问题）。

---

## 四、项目结构

```
cloudflare request viewing/
├── index.html                  # 主页面（单页应用 SPA 入口）
├── css/
│   └── style.css               # 全局样式 + 深色/浅色主题变量
├── js/
│   ├── app.js                  # 主应用逻辑、页面路由、Toast、日期工具
│   ├── theme.js                # 主题管理（深色/浅色/跟随系统）
│   ├── i18n.js                 # 国际化模块（zh / en 翻译数据 + 切换）
│   ├── db.js                   # IndexedDB 存储层封装（idb）
│   ├── api.js                  # Cloudflare API 请求封装（含 Mock）
│   ├── usage.js                # 数据采集与统计模块（依赖 db、api）
│   ├── charts.js               # Chart.js 图表渲染模块
│   ├── accounts.js             # 多账户管理 UI 模块
│   ├── backup.js               # 数据备份与恢复模块
│   └── vendor/
│       └── idb.js              # 本地内置 idb 兼容层
├── worker/
│   ├── worker.js               # Cloudflare Worker API 代理脚本
│   └── wrangler.toml           # Worker 部署配置
├── wrangler.toml               # Cloudflare Pages 部署配置
├── .gitignore                  # Git 忽略规则
├── README.md             # 中文文档（本文件）
├── README.en.md                # 英文文档
└── README.md                   # 语言切换入口页
```

### 各模块职责

| 模块 | 职责 |
|------|------|
| `js/app.js` | 协调各模块初始化、SPA 路由、顶部栏刷新、Toast 通知、全局日期工具（`getLocalDateString` / `parseLocalDate`）、模拟数据横幅与空状态 |
| `js/theme.js` | 三种主题模式（light/dark/system），`localStorage` 持久化，监听系统主题变化，通过 `data-theme` 属性切换 |
| `js/i18n.js` | `TRANSLATIONS` 双语字典 + `I18n` 工具，扫描 `[data-i18n]` 节点渲染，`localStorage` 记住语言，按钮显示「将要切换到的语言」本名 |
| `js/db.js` | IndexedDB 三个对象存储的增删改查、批量导入导出、清空、存储统计 |
| `js/api.js` | 构建认证头、通过 Worker 代理或直接请求 Cloudflare、GraphQL 查询、解析结果、Mock 数据生成与降级 |
| `js/usage.js` | 自动采集定时器、单/全账户采集、汇总统计、趋势数据、多账户对比数据 |
| `js/charts.js` | 趋势图（双 Y 轴）、资源分布环形图、多账户对比图，随主题重绘 |
| `js/accounts.js` | 账户卡片渲染、增删改、切换/刷新，表单校验 |
| `js/backup.js` | 导出 JSON、导入恢复（二次确认）、清空（二次确认） |
| `worker/worker.js` | 仅接受 POST，校验目标 URL 必须指向 `api.cloudflare.com`，转发认证头并附加 CORS 头 |

### 模块依赖关系

```
theme.js ──┐
           ├──▶ app.js ──▶ 页面路由 / UI 更新 / 日期工具
db.js ─────┤
           │
api.js ────┤
           │
usage.js ──┘ (依赖 db.js, api.js)
           │
charts.js ─┘ (依赖 usage.js, theme.js, i18n.js, api.js)
           │
accounts.js ─┘ (依赖 db.js, usage.js, app.js)
           │
backup.js ──┘ (依赖 db.js, app.js)
```

---

## 五、工作原理

### 5.1 数据采集流程

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  自动定时器  │────▶│  检查间隔    │────▶│  调用 GraphQL │────▶│  存入 IndexedDB │
│  /手动刷新   │     │  是否到达？   │     │   API         │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                          ┌──────────────┐
                                          │  Cloudflare  │
                                          │  GraphQL API │
                                          │              │
                                          │ 成功 → 解析  │
                                          │ 失败 → Mock  │
                                          └──────────────┘
```

### 5.2 GraphQL 查询

应用使用 Cloudflare GraphQL Analytics API（`POST https://api.cloudflare.com/client/v4/graphql`），核心查询如下（见 `js/api.js` 的 `getUsageData`）：

```graphql
query GetUsage($accountId: String!, $since: String!, $until: String!) {
  viewer {
    accounts(filter: { accountTag: $accountId }) {
      httpRequestsAdaptiveGroups(filter: { dateRange: { since: $since, until: $until } }) {
        count
        dimensions { date }
        sum { bytes }
      }
    }
  }
}
```

- 一次请求即可拉取整个时间窗口（如最近 30 天）的全部数据，避免逐天串行请求（在 CORS 受限环境下逐天重试只会制造大量失败）。
- 若批量请求成功，按本地日期（`getLocalDateString`）把数据映射到每天；若失败（CORS / 401 / 403 等），直接降级为 Mock 数据。

### 5.3 Worker 代理原理

浏览器因同源策略不能直接访问 `api.cloudflare.com`。Worker 代理模式：

```
浏览器应用  ──POST {url, method, headers}──▶  Cloudflare Worker (代理)
                                                  │ 校验 url 必须以
                                                  │ https://api.cloudflare.com/client/v4 开头
                                                  │ 转发 Authorization / X-Auth-Email / X-Auth-Key
                                                  ▼
                                          api.cloudflare.com/client/v4/graphql
                                                  │
                                                  ▼
                                          Worker 在响应里附加 CORS 头后返回
```

Worker 关键行为（见 `worker/worker.js`）：

- 只接受 `POST`（其他方法返回 405），并对 `OPTIONS` 预检直接返回 CORS 头；
- 校验请求体中的 `url` 必须以 `https://api.cloudflare.com/client/v4` 开头，否则返回 400（防止被当作开放代理）；
- 仅转发 `Authorization`、`X-Auth-Email`、`X-Auth-Key` 三个认证头；
- 响应固定附加 `Access-Control-Allow-Origin: *` 等 CORS 头。

> ⚠️ 由于 Worker 会原样把你的 `Authorization` 头转发给 Cloudflare，请仅在自己控制的 Worker 上使用。**Worker 不记录、不缓存、不存储你的 Token。**

### 5.4 降级（Mock）机制

未配置 Worker 代理，或 API 请求失败时：

- `CF_API.getUsageRange` 返回按日期生成的随机 Mock 数据（请求数 3000–8000，其余指标按比例估算）；
- 仪表盘顶部显示黄色横幅「当前显示的是模拟数据」；
- 使用记录标记 `isMock: true`，不会污染真实统计（汇总时按日期合并：优先采用真实记录，缺失的日期才用 Mock 兜底）；
- Mock 数据仅在刷新期间写入 IndexedDB，刷新后可被真实数据覆盖。

---

## 六、快速开始（5 步上手）

> **首次使用？请严格按以下 5 步完成配置，即可看到真实数据。**

### 前置要求

- 一个 Cloudflare 账户（[免费注册](https://dash.cloudflare.com/sign-up)）
- 至少已添加一个域名到 Cloudflare（Analytics API 需要账户下存在域名）
- 本地可选安装 Node.js 18+（部署 Worker 用）或 Python 3（本地预览用）

---

### 第 1 步：获取 Cloudflare Account ID

Account ID 是识别你 Cloudflare 账户的唯一标识符，格式为 **32 位十六进制字符串**（如 `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`）。

**获取方式（任选其一）：**

#### 方式 A：域名概览页（最常用）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧栏点击任意一个已添加的域名 → 进入「概览」
3. 在右侧信息栏找到 **API** 区域
4. 点击 **Account ID** 旁的「复制」按钮

#### 方式 B：Workers & Pages 页面

1. 登录 Dashboard → 左侧 **构建** → **计算** → **Workers and Pages**
2. 右侧找到 **Account Details**
3. 下方显示 **Account ID**，复制即可

#### 方式 C：浏览器开发者工具

1. 登录 Dashboard，按 **F12**
2. 在 **Network** 标签中找到任意对 `api.cloudflare.com` 的请求
3. 查看请求 URL 中的 `/accounts/{accountId}` 部分

> 验证格式（浏览器 Console 运行）：
> ```javascript
> /^[a-f0-9]{32}$/.test('你的AccountID') // 返回 true 则格式正确
> ```

---

### 第 2 步：创建 Cloudflare API Token

API Token 用于程序化访问 Cloudflare API，遵循最小权限原则，比 Global API Key 安全。

#### 步骤 1：进入 API Token 管理页

- 右上角头像 → **My Profile** → **API Tokens**
- 或直接访问：https://dash.cloudflare.com/profile/api-tokens

#### 步骤 2：创建自定义 Token

1. 点击 **Create Token** → 选择 **Create Custom Token**
2. Token 名称：如 `CF Usage Tracker`
3. **权限配置（关键）**：

   | 权限组 | 资源 | 权限级别 |
   |--------|------|----------|
   | Account | Analytics | Read |
   | Zone | Analytics | Read |

4. **资源范围**：Include → Specific account → 选择你的账户
5. （可选）IP 地址过滤、Token 有效期（建议 6–12 个月）
6. 点击 **Continue**

#### 步骤 3：生成并保存

1. 确认权限后点击 **Create Token**
2. ⚠️ **Token 只显示一次！** 立即复制保存到密码管理器

#### 步骤 4：验证（可选）

在令牌列表点击该 Token，确认状态为「活跃」、权限包含 Account + Zone 的 Analytics Read。

---

### 第 3 步：部署 Worker 代理（解决跨域）

> **为什么需要？** 浏览器同源策略会阻止前端直接请求 `api.cloudflare.com`。通过部署一个 Cloudflare Worker 作中间代理即可绕过。
> **暂不想部署？** 应用会自动使用模拟数据，可先体验界面。

#### 3.1 安装 Wrangler CLI

```bash
node --version        # 需 18+
npm install -g wrangler
wrangler login        # 浏览器授权
```

#### 3.2 部署 Worker

```bash
cd "cloudflare request viewing/worker"
wrangler deploy
```

成功后终端输出类似：

```
 ⛅️ Worker deployed successfully
 📦 Version ID: abc123...
 🔗 URL: https://cf-tracker-proxy-worker-xxxx.workers.dev
```

**复制这个 `.workers.dev` 地址**。

#### 3.3 在应用中配置代理地址

1. 打开应用（Pages 地址或本地 `http://localhost:3000`）
2. 进入侧边栏 **设置**
3. 在 **API 代理地址** 输入框粘贴 Worker URL
4. 失焦 / 切换页面即自动保存到 IndexedDB

---

### 第 4 步：在应用中添加账户

1. 侧边栏 **账户管理**
2. 点击右上角 **+ 添加账户**
3. 填写表单：

   | 字段 | 必填 | 说明 |
   |------|------|------|
   | 账户名称 | ✅ | 便于识别，如「生产环境」 |
   | Cloudflare 账户 ID | ✅ | 32 位十六进制 ID |
   | API 令牌 | ✅ | API Token 模式必填（第 2 步创建） |
   | API 邮箱 | ⬜ | 仅 Global API Key 模式需要（与 API Key 一起） |
   | API Key | ⬜ | 仅 Global API Key 模式需要（与 API 邮箱一起） |

4. 点击 **保存**（第一个账户自动设为当前）

> 认证字段说明：使用 **API Token**（推荐）时只需填写「API 令牌」，API 邮箱 / API Key 留空；使用 **Global API Key** 时需同时填写「API 邮箱」与「API Key」。

---

### 第 5 步：获取使用数据

1. 在 **账户管理** 找到账户卡片，点击 **🔄 刷新**
2. 顶部提示：
   - ✅ 「数据更新成功」→ 真实数据
   - ⚠️ 「已使用模拟数据」→ Worker 未配置或 API 失败
3. 切到 **仪表盘** 查看数据

若看到黄色横幅「当前显示的是模拟数据」：检查 Worker 地址、Token、Account ID，并在 Console（F12）查看错误。

---

## 七、本地运行

应用是纯静态文件，只需启动一个 HTTP 服务器：

### 方式一：Python

```bash
cd "cloudflare request viewing"
python -m http.server 3000
# 浏览器访问 http://localhost:3000
```

### 方式二：Node.js http-server

```bash
npx http-server -p 3000
```

### 方式三：直接打开

直接打开 `index.html` 也可运行，但 `file://` 协议下 IndexedDB 可能受限，建议使用 HTTP 服务器。

> **注意**：本地运行时浏览器 CORS 可能阻止直接请求 Cloudflare API，此时应用自动使用 Mock 数据。要拿真实数据请部署 Worker 代理。

---

## 八、部署指南

### 8.1 部署 Pages 前端

#### 方法一：Cloudflare Dashboard（推荐新手）

1. Dashboard → **Workers & Pages** → **Create application** → **Pages**
2. 选择 **Upload assets**
3. 项目名如 `cf-usage-tracker`
4. 上传根目录所有文件（含 `index.html`、`css/`、`js/` 等）
5. 点击 **Deploy**，获得 `https://cf-usage-tracker.pages.dev`

#### 方法二：Wrangler CLI

```bash
npm install -g wrangler
wrangler login
cd "cloudflare request viewing"
wrangler pages deploy . --project-name=cf-usage-tracker
```

#### 方法三：Git 连接

1. 推送到 GitHub/GitLab
2. Pages 中选 **Connect to Git**，构建命令留空，输出目录 `/`
3. **Save and Deploy**

> 本仓库根目录已提供 `wrangler.toml`（Pages 配置），使用 `public_output = "."`，无需构建步骤。

### 8.2 部署 Worker API 代理

```bash
cd "cloudflare request viewing/worker"
wrangler deploy
```

部署后把输出的 Worker URL 填入应用 **设置 → API 代理地址**。

### 8.3 自定义域名

#### Pages 自定义域名

Dashboard → Pages 项目 → **Custom domains** → 输入域名 → 添加 CNAME。

#### Worker 自定义路由

编辑 `worker/wrangler.toml`：

```toml
name = "cf-tracker-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

然后 `wrangler deploy`。

---

## 九、使用教程（详细步骤）

> 本教程以「已按第六/八章完成部署与基础配置」为前提，按页面逐一讲解点击路径与典型场景。

### 9.1 仪表盘

仪表盘是默认首页，展示「当前账户」的使用总览。

#### 页面元素

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ 模拟数据提示（仅 Mock 数据时显示）                         │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐           │
│  │ 今日请求  │ │ Worker调用│ │ 本月请求  │ │ 带宽使用│           │
│  │ 5,404    │ │ 432      │ │ 142,500  │ │ 3.2 GB │           │
│  │ ████░░  │ │ ██░░░░  │ │ 累计     │ │ 本月   │           │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  请求趋势（最近30天）      [7天][30天][90天]             │  │
│  │  📈 折线图：请求数(左轴) + Worker 调用(右轴)            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐ ┌───────────────────────────────┐  │
│  │ 资源分布（环形图）    │  使用情况详情（表格，最近10天） │  │
│  │ 请求 / Worker / 带宽  │ 日期  请求  Worker  带宽  状态   │  │
│  │ / 页面浏览 占比       │ ...                              │  │
│  └──────────────────────┘ └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 操作流程

1. **切换账户**：点击顶部栏账户名，或在「账户管理」页点「设为当前」。
2. **切换时段**：趋势图上方下拉框选 7 / 30 / 90 天。
3. **刷新数据**：点顶部栏 🔄 刷新（会刷新所有账户）。
4. **查看详情表**：表格按日期倒序展示最近 10 天；Mock 行带「模拟」徽标，无流量日显示「无流量」。

#### 统计卡片含义

| 卡片 | 含义 | 进度条 |
|------|------|--------|
| 今日请求 | 当日累计 HTTP 请求 | 对 100,000 配额的百分比 |
| Worker 调用 | 当日 Worker 调用（估算） | 对 100,000 配额的百分比 |
| 本月请求 | 当月累计请求 | 无（显示月度总计） |
| 带宽使用 | 当月累计出站带宽 | 无（显示字节总量，自动换算 B/KB/MB/GB/TB） |

#### 场景示例：判断今日流量是否异常

- 看「今日请求」进度条是否接近 100%（即接近 10 万）；
- 在趋势图选 30 天，观察今日相对历史是否突增；
- 若今日偏低，属正常（Cloudflare 数据有约 1 小时延迟，次日补全）。

---

### 9.2 账户管理

#### 查看列表

进入「账户管理」看到所有账户卡片，每张卡显示：今日请求、本月累计、Worker、记录天数，以及「设为当前 / 编辑 / 刷新 / 删除」按钮；当前账户带绿色「当前」徽标。

#### 添加账户（点击路径）

1. 右上角 **+ 添加账户**
2. 弹窗填写：账户名称、账户 ID、API 令牌（或 Global API Key 模式下的「API 邮箱 + API Key」）
3. **保存**

#### 编辑账户

1. 卡片 **编辑** → 弹窗预填原值
2. 修改后 **保存**

#### 切换当前账户

1. 目标卡片 **设为当前**
2. 卡片高亮，仪表盘立即切到该账户数据

#### 刷新单个账户

1. 卡片 **刷新**
2. 该账户重新拉取数据，卡片统计更新

#### 删除账户

1. 卡片 **删除** → 确认弹窗
2. ⚠️ 该账户所有使用记录一并删除
3. 若删除的是当前账户，系统自动把第一个剩余账户设为当前

#### 场景示例：团队多客户管理

- 为每个客户建一个账户（如「客户A」「客户B」）；
- 在「多账户对比」页横向比较流量；
- 切换「当前」账户查看各自仪表盘。

---

### 9.3 多账户对比

此页可同时查看多个账户，横向对比。

#### 操作流程

1. 侧边栏 **多账户对比**
2. 选指标：**请求数 / Worker 调用 / 带宽使用**
3. 选范围：**今日 / 近7天 / 近30天（默认）**
4. 折线图 + 汇总表自动更新

#### 汇总表字段

| 字段 | 说明 |
|------|------|
| 账户 | 账户名 |
| 请求总数 | 范围内请求累计 |
| Worker 调用 | 范围内 Worker 累计（估算） |
| 带宽 | 范围内带宽累计 |
| 活跃天数 | 范围内有流量（请求>0）的天数 |

#### 场景示例

- 对比生产 / 测试环境流量差异；
- 对比不同客户资源消耗；
- 验证流量突增是否与某事件相关（看折线拐点）。

---

### 9.4 数据管理

#### 导出备份

1. **数据管理** → **导出数据**
2. 浏览器下载 `cf-tracker-backup-<时间戳>.json`
3. 文件含 `accounts`、`usageRecords`、`settings` 三段

```json
{
  "version": 1,
  "exportedAt": "2026-08-13T14:30:00.000Z",
  "accounts": [ { "id": 1, "name": "生产环境", "accountId": "abc...", "apiToken": "abc...", "isActive": true, "createdAt": "..." } ],
  "usageRecords": [ { "id": 1, "accountId": 1, "date": "2026-08-13", "requests": 5404, "workersInvocations": 432, "bandwidth": 3435973836, "isMock": false, "fetchedAt": "..." } ],
  "settings": [ { "key": "workerUrl", "value": "https://..." }, { "key": "autoFetchInterval", "value": "60" } ]
}
```

> ⚠️ 备份文件含 **明文的 API Token**，请妥善保管，不要提交到公开仓库。

#### 导入恢复

1. **导入数据** → 选择备份 `.json`
2. 确认框显示账户数 / 记录数
3. 确认后 **覆盖** 当前所有数据并刷新界面

> ⚠️ 导入会覆盖现有数据！建议先导出备份。

#### 清空数据

1. **清空所有数据**
2. 第一次确认 → 第二次确认（「真的要清空吗？」）
3. 确认后所有数据被清除（不可恢复）

#### 存储统计

页面底部显示：账户数量、使用记录数、最近同步时间、IndexDB 占用字节数。

---

### 9.5 设置

#### 外观设置（主题）

| 选项 | 行为 |
|------|------|
| 浅色 | 固定浅色 |
| 深色 | 固定深色 |
| 跟随系统（默认） | 跟随操作系统 |

**切换方式**：
- 快捷：侧边栏底部 🌙/☀️ 按钮，点击循环切换 light → dark → system；
- 详细：设置页 → 外观设置 → 点对应选项。

#### 数据采集设置

| 设置 | 选项 |
|------|------|
| 自动采集间隔 | 禁用 / 30 分钟 / 1 小时（默认）/ 6 小时 / 12 小时 / 每天 |
| 采集历史天数 | 最近 7 天 / 30 天（默认）/ 90 天 |

修改后立即生效（自动采集定时器会按新间隔重建）。

#### 部署信息（API 代理地址）

- 填写 Worker URL（以 `https://` 开头，通常 `.workers.dev` 结尾）；
- 留空 → 浏览器直连可能被 CORS 拦截，应用用 Mock；
- 修改后立即生效，无需重启。

---

### 9.6 界面语言与主题切换

- **语言**：侧边栏底部 🌐 按钮，点击在 中文 / English 之间切换；选择持久化在 `localStorage`（键 `cf_tracker_lang`）。按钮显示的是「将要切换到的语言」本名（中文界面显示「English」，英文界面显示「中文」）。
- **主题**：同区域 🌙/☀️ 按钮，或在设置页选择。

---

## 十、数据采集详解

### 采集策略

- **批量获取**：单次 GraphQL 请求拿整个时间窗数据，减少 API 调用。
- **降级机制**：API 失败自动生成 Mock，保证 UI 可预览。
- **去重策略**：每次采集前 `deleteUsageRecords(account.id)`，再 `addUsageRecords`，避免重复。
- **失败隔离**：单账户失败不影响其他账户（见 `UsageTracker.fetchAllAccounts`）。

### 自动采集间隔计算

| 设置值(分) | 实际间隔(ms) | 每日调用 | 每月调用 |
|------------|--------------|----------|----------|
| 30 | 1,800,000 | 48 | ~1,440 |
| 60（默认） | 3,600,000 | 24 | ~720 |
| 360 | 21,600,000 | 4 | ~120 |
| 720 | 43,200,000 | 2 | ~60 |
| 1440 | 86,400,000 | 1 | ~30 |

> 免费版 Workers 每日 100,000 次请求；本项目 Worker 仅转发，消耗极低。

### 数据延迟

| 数据类型 | 延迟 |
|----------|------|
| 实时数据 | ~1 小时才出现 |
| 准确数据 | ~24 小时稳定 |
| 今日数据 | 不完整，次日补全 |

---

## 十一、数据存储方案

### 存储架构

```
浏览器
 ├─ IndexedDB (cf_tracker_db, v1)
 │   ├─ accounts       (keyPath id, autoIncrement; 索引 name, isActive)
 │   ├─ usage_records  (keyPath id, autoIncrement; 索引 accountId, date)
 │   └─ app_settings   (keyPath key)
 └─ localStorage
     ├─ cf_tracker_theme  (light/dark/system)
     └─ cf_tracker_lang    (zh/en)
```

### 隐私保证

- 数据仅存本地浏览器，不上传任何远程服务器；
- 唯一网络请求是对 Cloudflare API 的只读查询；
- API Token 仅存本地，不经 Worker 存储/记录；
- Worker 代理只转发、不缓存、不记录。

### 存储容量

- IndexedDB 上限通常为可用磁盘 50%+；
- 单条使用记录约 200–300 字节，1000 条约 300KB，日常不会触顶。

### 使用记录字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 自增主键 |
| accountId | number | 关联账户 |
| date | string | 本地日期 `YYYY-MM-DD` |
| requests | number | HTTP 请求数 |
| workersInvocations | number | Worker 调用（估算） |
| bandwidth | number | 出站带宽（字节） |
| pageViews | number | 页面浏览（估算） |
| uniqueVisitors | number | 独立访客（估算） |
| isMock | boolean | 是否模拟数据 |
| fetchedAt | string | ISO 采集时间 |
| rawData | object | 原始 API 数据 |

### 带宽换算

内部统一字节，展示时自动换算：B → KB → MB → GB → TB（1024 进制）。

---

## 十二、API 认证说明

### 两种方式对比

| 对比项 | API Token（推荐） | Global API Key（不推荐） |
|--------|-------------------|------------------------|
| 安全性 | 高（最小权限） | 低（全账户权限） |
| 所需字段 | Account ID + API Token | Account ID + API Key + 邮箱 |
| 有效期 | 可设过期 | 永久（除非重置） |
| 适用 | 日常 / 团队 | 临时测试 |

### API Token 创建

见 [第 2 步](#第-2-步创建-cloudflare-api-token)。需 Account + Zone 的 Analytics **Read**。

### Global API Key（不推荐）

Dashboard → My Profile → API Tokens → 底部 **API Keys** → **Global API Key** → View（需二次密码）。应用内填写时需同时提供「API 邮箱」与「API Key」。

> ⚠️ Global API Key 拥有账户完全控制权，泄露可被判完全失控，强烈不建议。

### 认证请求示例

应用经 Worker 代理发起（见 `js/api.js` 与 `worker/worker.js`）：

```http
POST https://<your-worker>.workers.dev
Content-Type: application/json

{
  "url": "https://api.cloudflare.com/client/v4/graphql",
  "method": "POST",
  "headers": { "Authorization": "Bearer <apiToken>", "Content-Type": "application/json" },
  "body": "{\"query\":\"...\"}"
}
```

Worker 回包附加：

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Email, X-Auth-Key
```

### 排查认证问题

| 错误 | 原因 | 解决 |
|------|------|------|
| 401 Unauthorized | Token 错误/过期 | 重建 Token |
| 403 Forbidden | 权限不足 | 加 Analytics Read |
| 404 Not Found | Account ID 错 | 重确认 ID |
| CORS Error | 未配 Worker | 部署并填地址 |
| 超时 | 网络/限流 | 重试 |

---

## 十三、配置项详解

### 应用设置（IndexedDB `app_settings`）

| 键 | 类型 | 默认 | 说明 |
|----|------|------|------|
| `workerUrl` | string | `''` | Worker 代理地址 |
| `autoFetchInterval` | number(分) | `60` | 自动采集间隔，0=禁用 |
| `fetchHistoryDays` | number | `30` | 历史回溯天数 |
| `lastSync` | string(ISO) | `null` | 最近同步时间 |

### 主题（localStorage）

| 键 | 值 |
|----|-----|
| `cf_tracker_theme` | light / dark / system |
| `cf_tracker_lang` | zh / en |

### Worker 配置（`worker/wrangler.toml`）

```toml
name = "cf-tracker-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"
# routes = [{ pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }]
```

### Pages 配置（`wrangler.toml`）

```toml
name = "cf-usage-tracker"
compatibility_date = "2024-01-01"
public_output = "."
# routes = [{ pattern = "your-domain.pages.dev/*" }]
```

---

## 十四、常见问题（FAQ）

**Q1：刷新提示「获取数据失败」怎么办？**
按顺序排查：①账户 ID/Token 是否完整；②Worker 地址是否填写且可访问；③Token 权限是否含 Analytics Read；④Console 错误（CORS/401/403/404）；⑤账户下是否有域名。

**Q2：黄色横幅「当前显示的是模拟数据」？**
API 失败降级。检查 Worker 地址、Token、Account ID；可临时用 Mock 体验 UI。

**Q3：API Token 安全吗？**
仅存本地 IndexedDB；HTTPS 传输；Worker 不记录；建议最小权限 + 定期轮换。

**Q4：Account ID 格式？**
32 位十六进制 `a-f0-9`，非邮箱、非 Zone ID。

**Q5：手机能用吗？**
能，响应式；移动端与桌面端数据独立（不同浏览器=不同数据），可用备份迁移。

**Q6：数据会丢失吗？**
不会：正常关浏览器、清 Cookie/缓存、代码更新。会：手动清站点数据、卸载浏览器、无痕模式、磁盘不足、手动清空。

**Q7：支持哪些浏览器？**
Chrome/Edge 80+、Firefox 75+、Safari 14+，需 IndexedDB 2.0+、CSS 变量、Fetch。

**Q8：Worker 必须吗？**
Pages/其他托管强烈建议；本地 localhost 建议；临时预览可不用（Mock）。

**Q9：如何更新应用？**
重新上传/Pages Git/WRangler 部署前端；`cd worker && wrangler deploy` 更新 Worker。IndexedDB 数据不受影响。

**Q10：免费版能用吗？**
完全兼容。Workers 免费 10 万次/天，本项目消耗极低。

**Q11：如何管理多账户？**
账户管理逐个添加；「设为当前」切换；多账户对比横向看；顶部刷新批量拉取。

**Q12：数据延迟多久？**
实时 ~1h，准确 ~24h，今日不完整次日补。

**Q13：如何清空重来？**
先导出备份 → 清空所有数据 → 重配 → 必要时导入恢复。

---

## 十五、开发指南

### 本地调试

```bash
python -m http.server 3000
```

浏览器 Console 可直接调试：

```javascript
DB.getAccounts()                 // 所有账户
DB.getStats()                    // 存储统计
ThemeManager.apply('dark')       // 切主题
UsageTracker.getSummary(1)       // 账户1汇总
I18n.toggle()                    // 切语言
```

### 添加新指标

1. `js/api.js` 的 GraphQL 查询加字段；
2. `parseUsageResultByDate` 解析；
3. `js/usage.js` 的 `getTrendData` 暴露；
4. `js/charts.js` 渲染。

### 添加新图表

1. `index.html` 加 `<canvas>`；
2. `js/charts.js` 加渲染方法；
3. `js/app.js` 对应页面调用。

### 自定义主题

编辑 `css/style.css` 的 `:root` 与 `[data-theme="dark"]` CSS 变量（如 `--accent`）。

### 注意事项

- 所有日期用 `getLocalDateString` / `parseLocalDate`（本地时区，避免 UTC 错位）；
- idb v8 用 `tx.objectStore(name)` 而非 `tx.store`；
- 修改 `DB_VERSION` 会触发 `upgrade`，注意数据迁移。

---

## 十六、许可证

本项目可自由使用、修改和分发。

---

## 十七、技术支持

### 快速检查清单

```
✅ 1. 已添加 Cloudflare 账户
✅ 2. Account ID 为 32 位十六进制
✅ 3. API Token 有效且含 Analytics Read
✅ 4. Worker 已部署且地址正确（新标签页可打开）
✅ 5. 设置中已填 Worker 地址
✅ 6. 账户下至少有一个域名
✅ 7. 浏览器支持 IndexedDB
✅ 8. F12 Console / Network 查看错误
```

### 错误信息速查

| 信息 | 含义 | 解决 |
|------|------|------|
| 获取数据失败 | API 失败 | 查配置/Worker/Token |
| 已使用模拟数据 | 无法连 API | 配 Worker |
| 401 | Token 无效 | 重建 |
| 403 | 权限不足 | 加 Read |
| 404 | Account ID 错 | 重确认 |
| CORS Error | 跨域 | 用 Worker |
| net::ERR_ABORTED | 请求中止 | 检查网络 |

### 报告问题请提供

浏览器/系统/部署方式/Worker 状态/错误截图/账户类型/域名数量/时区。

---

## 十八、最近更新

本节记录近期的代码与文档维护，主要为代码质量、去重与文档准确性改进，不改变数据模型与既有存储结构：

- **修正文档错误**：`usage_records` 仅建立 `accountId` 与 `date` 两个索引，此前文档误写了不存在的复合索引 `[accountId,date]`。
- **清理死代码**：移除从未被调用的 `DB.getUsageRecordCount()`、`DB.deleteSetting()` 与 `App.escapeHtml()`。
- **合并重复实现**：`formatBytes` 现统一复用 `CF_API.formatBytes`；`App.escapeHtml` 的重复实现已删除（`AccountManager.escapeHtml` 保留）。
- **查询窗口更精确**：`DB.getUsageRecords(days)` 的日期下界由 `today - days` 调整为 `today - days + 1`，使“最近 N 天”精确包含今天在内的 N 天，与采集窗口保持一致。
- **数字格式化跟随语言**：`CF_API.formatNumber` 现在根据当前界面语言选择 `zh-CN` / `en-US` 区域，切换语言后数字格式同步更新。

## 十九、代码修复

- 修复了 `js/db.js` 中 `deleteAccount` 和 `setActiveAccount` 函数中的 IndexedDB 事务在中间 await 导致可能提前提交的问题。
- 修复了 `js/charts.js` 中趋势图提示框对请求数和 Worker 调用数使用 `formatBytes` 的错误，改为使用 `formatNumber`.

---

> 🇺🇸 **Want English?** 打开 [README.en.md](./README.en.md) 查看完整英文文档。
