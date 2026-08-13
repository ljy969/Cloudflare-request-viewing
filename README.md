# Cloudflare 使用情况追踪器

一个功能完整的 Cloudflare 使用情况追踪与可视化 Web 应用。支持多账户管理、自动数据采集、深色/浅色主题切换，所有数据仅存储在本地浏览器中，不上传任何远程服务器。完全兼容 Cloudflare Workers and Pages 部署环境。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [第 1 步：获取 Account ID](#第-1-步获取-cloudflare-account-id)
  - [第 2 步：创建 API Token](#第-2-步创建-cloudflare-api-token)
  - [第 3 步：部署 Worker 代理](#第-3-步部署-worker-代理解决跨域问题)
  - [第 4 步：添加账户](#第-4-步在应用中添加账户)
  - [第 5 步：获取使用数据](#第-5-步获取使用数据)
- [本地运行](#本地运行)
- [部署指南](#部署指南)
  - [部署 Pages 前端](#部署-pages-前端)
  - [部署 Worker API 代理](#部署-worker-api-代理)
  - [自定义域名](#自定义域名)
- [使用说明](#使用说明)
  - [仪表盘](#仪表盘)
  - [账户管理](#账户管理)
  - [多账户对比](#多账户对比)
  - [数据管理](#数据管理)
  - [设置](#设置)
- [数据采集详解](#数据采集详解)
- [数据存储方案](#数据存储方案)
- [API 认证说明](#api-认证说明)
- [配置项详解](#配置项详解)
- [常见问题](#常见问题)
- [开发指南](#开发指南)
- [许可证](#许可证)

---

## 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| **自动数据采集** | 定时从 Cloudflare API 获取请求数、Worker 调用数、带宽使用量等指标 |
| **多账户管理** | 支持添加多个 Cloudflare 账户，独立追踪、一键切换、汇总对比 |
| **数据可视化** | 基于 Chart.js 的趋势折线图、资源分布环形图、多账户对比图 |
| **本地数据存储** | 所有数据仅保存在浏览器 IndexedDB 中，绝不上传远程服务器 |
| **数据备份恢复** | 一键导出 JSON 备份文件，支持从备份文件完整恢复 |
| **深色/浅色主题** | 支持深色、浅色、跟随系统三种模式，CSS 变量驱动无闪烁切换 |
| **响应式设计** | 桌面、平板、手机全适配，移动端汉堡菜单导航 |
| **Cloudflare 部署** | 完全兼容 Cloudflare Pages 静态部署 + Worker API 代理 |

### 数据采集范围

应用从 Cloudflare API 采集以下使用情况数据：

| 指标 | 说明 | 来源 |
|------|------|------|
| 请求数 (Requests) | 每日 HTTP 请求总数 | Cloudflare Analytics API |
| Worker 调用 (Workers Invocations) | 每日 Cloudflare Worker 调用次数 | Cloudflare Analytics API |
| 带宽使用 (Bandwidth) | 每日出站带宽消耗（字节） | Cloudflare Analytics API |
| 页面浏览 (Page Views) | 每日页面浏览数 | Cloudflare Analytics API |
| 独立访客 (Unique Visitors) | 每日独立访客数 | Cloudflare Analytics API |

### 采集频率

| 模式 | 说明 |
|------|------|
| 自动采集 | 可配置间隔：30分钟 / 1小时 / 6小时 / 12小时 / 每天 / 禁用 |
| 手动刷新 | 点击顶部「刷新」按钮立即获取所有账户最新数据 |
| 历史回溯 | 每次采集时自动回溯获取最近 7/30/90 天的历史数据 |

---

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | 原生 JavaScript | 零构建依赖，无需 Node.js 编译 |
| UI 样式 | CSS3 + CSS 变量 | 主题系统由 CSS 变量驱动 |
| 数据可视化 | Chart.js 4.4 | 通过 CDN 加载，折线图/环形图/对比图 |
| 本地存储 | IndexedDB (via idb 8.0) | 结构化存储，支持事务和索引 |
| API 代理 | Cloudflare Worker | 解决浏览器 CORS 跨域限制 |
| 部署平台 | Cloudflare Pages + Workers | 全球 CDN 分发，零服务器维护 |
| 外部依赖 | Chart.js、idb | 均通过 CDN 加载，无 npm 依赖 |

---

## 项目结构

```
cloudflare request viewing/
├── index.html                  # 主页面（单页应用入口）
├── css/
│   └── style.css               # 全局样式 + 深色/浅色主题变量
├── js/
│   ├── theme.js                # 主题管理模块（深色/浅色/跟随系统）
│   ├── db.js                   # IndexedDB 存储层封装
│   ├── api.js                  # Cloudflare API 请求封装
│   ├── usage.js                # 数据采集与统计模块
│   ├── charts.js               # Chart.js 图表渲染模块
│   ├── accounts.js             # 多账户管理 UI 模块
│   ├── backup.js               # 数据备份与恢复模块
│   └── app.js                  # 主应用逻辑与页面路由
├── worker/
│   ├── worker.js               # Cloudflare Worker API 代理脚本
│   └── wrangler.toml           # Worker 部署配置文件
├── wrangler.toml               # Cloudflare Pages 部署配置
├── .gitignore                  # Git 忽略规则
└── README.md                   # 本文档
```

### 各模块职责

#### `js/theme.js` — 主题管理

- 支持三种模式：`light`（浅色）、`dark`（深色）、`system`（跟随系统）
- 通过 `localStorage` 持久化用户选择
- 监听 `prefers-color-scheme` 媒体查询，系统主题变化时自动响应
- 通过 `data-theme` 属性切换 CSS 变量，实现无闪烁切换

#### `js/db.js` — IndexedDB 存储层

- 数据库名称：`cf_tracker_db`，版本：`1`
- 三个对象存储：
  - `accounts`：账户配置（名称、API Token、账户 ID 等）
  - `usage_records`：使用记录（按账户 ID + 日期索引）
  - `app_settings`：应用设置（键值对存储）
- 支持完整的 CRUD 操作、批量导入导出、数据清空

#### `js/api.js` — Cloudflare API 封装

- 支持 API Token 和 Global API Key 两种认证方式
- 支持通过 Worker 代理转发请求（解决 CORS）
- 封装 GraphQL Analytics API 查询
- 内置 Mock 数据生成（API 不可用时仍可预览界面）

#### `js/usage.js` — 数据采集模块

- 定时器驱动自动采集
- 支持单账户/全账户批量采集
- 提供汇总统计、趋势数据、多账户对比数据等查询接口

#### `js/charts.js` — 图表渲染

- 趋势折线图：双 Y 轴展示请求数和 Worker 调用
- 资源分布环形图：请求/Worker/带宽/页面浏览占比
- 多账户对比图：多账户同指标叠加趋势线
- 自动适配当前主题配色

#### `js/accounts.js` — 账户管理

- 账户的添加、编辑、删除、切换
- 账户卡片 UI 渲染，展示关键统计指标
- 表单验证与错误提示

#### `js/backup.js` — 备份与恢复

- 导出全量数据为 JSON 文件（含账户、记录、设置）
- 从 JSON 文件导入恢复（覆盖现有数据）
- 危险操作二次确认保护

#### `js/app.js` — 主应用

- 协调各模块初始化
- 页级路由（SPA 切换，无刷新）
- UI 事件绑定与状态管理
- Toast 通知系统

---

## 快速开始

> **首次使用？请按以下 5 步完成配置**

### 前置要求

- 一个 Cloudflare 账户（[免费注册](https://dash.cloudflare.com/sign-up)）
- 至少已添加一个域名到 Cloudflare（如需获取真实 Analytics 数据）
- 本地可选安装 Python 3（用于本地预览）

---

### 第 1 步：获取 Cloudflare Account ID

Account ID 是识别你 Cloudflare 账户的唯一标识符，格式为 32 位十六进制字符串（如 `abc123def456...`）。

**获取方式（共 3 种，任选其一）：**

#### 方式 A：通过域名概览页（最常用）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在左侧栏 **"域名管理"** 下点击任意一个已添加的域名
3. 进入域名的 **"概览"** 页面
4. 向右滚动，在右侧信息栏找到 **"API"** 区域
5. 点击 **"Account ID"** 旁边的 **"点击复制"** 按钮
6. 保存这个 ID，下一步会用到

```
┌─────────────────────────────────────────────┐
│  域名概览页右侧栏                             │
│  ┌─────────────────────────────────────────┐ │
│  │  📊 API                                  │ │
│  │                                         │ │
│  │  Account ID:  abc123def456...  [复制]  │ │
│  │  Zone ID:     xyz789...        [复制]  │ │
│  │                                         │ │
│  │  API 令牌:  [查看 API 令牌]             │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 方式 B：通过账户设置页面

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧 **构建** → **"计算"** → **Workers and Pages**
3. 在右侧找到 **"Account Details"**
4. 下面会显示 **Account ID** （复制即可）

#### 方式 C：通过浏览器开发者工具

1. 登录 Cloudflare Dashboard
2. 按 **F12** 打开开发者工具
3. 切换到 **Console（控制台）** 标签
4. 输入以下命令并回车：
   ```javascript
   accountId // 或在 Network 标签中查看任意 API 请求的响应头
   ```
5. 在 **Network（网络）** 标签中找到任意一个对 `api.cloudflare.com` 的请求
6. 查看请求 URL 中的 `/accounts/{accountId}` 部分

---

### 第 2 步：创建 Cloudflare API Token

API Token 用于程序化访问 Cloudflare API，相比 Global API Key 更安全（可设置最小权限）。

**详细步骤：**

#### 步骤 1：进入 API Token 管理页面

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击右上角头像 → **"我的资料"（My Profile）**
3. 在左侧菜单选择 **"API 令牌"（API Tokens）**
4. 或者直接访问：[https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)

#### 步骤 2：创建自定义 Token

1. 点击右上角 **"创建令牌"（Create Token）** 按钮
2. 在弹出的模板列表中，选择 **"创建自定义令牌"（Create Custom Token）**
3. 填写 **令牌名称**：建议命名为 `CF Usage Tracker` 或 `数据分析专用`
4. **权限配置**（非常重要！）：

   | 权限组 | 资源 | 权限级别 | 说明 |
   |--------|------|----------|------|
   | 账户 | Analytics | 读取 | 读取账户级分析数据 |
   | 域 | Analytics | 读取 | 读取域名级分析数据 |
   
   配置方法：
   - 点击 **"选择账户"** → 选择你的账户 → 展开菜单 → 勾选 **"Analytics"** 下的 **"读取"**
   - 点击 **"选择区域"** → 选择你的域名（或所有域名）→ 展开菜单 → 勾选 **"Analytics"** 下的 **"读取"**

5. **资源范围**：选择 **"包括"** → **"特定账户"** → 选择你的账户
6. **IP 地址过滤**（可选，安全建议）：
   - 如不启用代理，留空即可
   - 已部署 Worker 代理时，可填入 Worker 的出口 IP
7. **令牌有效期**（可选）：默认不设过期，建议设置 6-12 个月
8. 点击 **"继续"（Continue）**

#### 步骤 3：生成并保存 Token

1. 在确认页面检查权限配置是否正确
2. 点击 **"创建令牌"（Create Token）**
3. ⚠️ **重要**：Token 只会显示一次！请立即复制保存
4. 页面会显示一个以 `abc123...` 开头的长字符串，这就是你的 API Token
5. 点击 **"复制"** 按钮将其保存到安全位置

```
┌─────────────────────────────────────────────┐
│  ✅ 令牌已创建                                │
│                                             │
│  你的 API Token:                            │
│  ┌─────────────────────────────────────┐   │
│  │ abc123def456...xyz789                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ⚠️ 请立即复制此 Token，关闭页面后将无法查看  │
│                                             │
│  [复制令牌]  [关闭]                          │
└─────────────────────────────────────────────┘
```

#### 步骤 4：验证 Token（可选）

创建完成后，可以在令牌列表中点击刚创建的令牌，查看：
- **状态**：应为"活跃"
- **上次使用**：第一次使用后会显示时间
- **权限**：确认包含 Analytics 读取权限

---

### 第 3 步：部署 Worker 代理（解决跨域问题）

> **为什么需要 Worker 代理？**
> 
> 浏览器有跨域安全策略（CORS），直接从你的应用请求 `api.cloudflare.com` 会被阻止。
> 通过部署一个 Cloudflare Worker 作为中间代理，可以绕过这个限制。
> 
> **如果你暂时不想部署 Worker**：应用会自动使用模拟数据，你可以先体验界面。

#### 3.1 安装 Wrangler CLI

Wrangler 是 Cloudflare 官方命令行工具，用于部署 Worker。

```bash
# 确保已安装 Node.js 18+
node --version

# 全局安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare 账户
wrangler login
# 浏览器会弹出授权页面，点击"允许"
```

#### 3.2 部署 Worker 代理

```bash
# 进入 Worker 目录
cd "cloudflare request viewing/worker"

# 部署 Worker
wrangler deploy
```

首次部署时 Wrangler 会要求：
1. 选择账户：选择你的 Cloudflare 账户
2. 确认创建：输入 `y` 确认

部署成功后，终端会输出：
```
 ⛅️ Worker deployed successfully
 📦 Version ID: abc123...
 🔗 URL: https://cf-tracker-proxy-worker-xxxx.workers.dev
```

**复制这个 `.workers.dev` 地址**，下一步要用到。

#### 3.3 在应用中配置代理地址

1. 打开本应用（通过 Pages 部署地址或本地 `http://localhost:3000`）
2. 点击侧边栏 **"设置"**
3. 找到 **"API 代理地址"** 输入框
4. 粘贴你刚才复制的 Worker URL（如 `https://cf-tracker-proxy-worker-xxxx.workers.dev`）
5. 按 **Enter** 或点击页面任意位置保存

配置会自动保存到浏览器 IndexedDB，下次访问时自动加载。

---

### 第 4 步：在应用中添加账户

1. 回到应用首页
2. 点击侧边栏 **"账户管理"**
3. 点击右上角 **"+ 添加账户"** 按钮
4. 在弹出的表单中填写：

   | 字段 | 类型 | 说明 | 示例 |
   |------|------|------|------|
   | 账户名称 | 必填 | 便于识别的名称，可随意命名 | `我的生产环境`、`客户A的账户` |
   | Cloudflare 账户 ID | 必填 | 32 位十六进制 ID | `abc123def456abc123def456abc123de` |
   | API 令牌 | 必填 | 上一步创建的 API Token | `abc123def456...` |
   | API 邮箱 | 可选 | 使用 Global API Key 时填写 | `user@example.com` |

5. 点击 **"保存"**
6. 第一个添加的账户会自动设为"当前账户"

#### 关于"API 邮箱"字段

- **使用 API Token 认证（推荐）**：此字段**留空**即可
- **使用 Global API Key 认证**（不推荐）：需填写 Cloudflare 账户的注册邮箱

---

### 第 5 步：获取使用数据

1. 确保已完成以上 4 步
2. 在 **"账户管理"** 页面找到你的账户卡片
3. 点击卡片上的 **"🔄 刷新"** 按钮
4. 等待几秒，顶部会弹出提示：
   - ✅ **"数据更新成功"** → 获取真实数据
   - ⚠️ **"已使用模拟数据"** → Worker 代理未配置或 API 请求失败
5. 切换到 **"仪表盘"** 页面查看数据

如果看到黄色横幅提示"当前显示的是模拟数据"：
- 说明 API 请求未成功（可能是 CORS 或认证问题）
- 请检查 Worker 代理地址是否正确
- 请检查 API Token 和 Account ID 是否正确
- 可以在浏览器 Console（F12）中查看详细错误信息

---

## 本地运行

由于应用使用纯静态文件，只需启动一个 HTTP 服务器即可：

### 方式一：Python HTTP 服务器

```bash
cd "cloudflare request viewing"
python -m http.server 3000
```

然后打开浏览器访问 `http://localhost:3000`

### 方式二：Node.js http-server

```bash
npx http-server -p 3000
```

### 方式三：直接打开

直接用浏览器打开 `index.html` 也可运行，但 IndexedDB 在 `file://` 协议下可能受限，建议使用 HTTP 服务器。

> **注意**：本地运行时，由于浏览器 CORS 限制，直接请求 Cloudflare API 可能失败。此时应用会自动使用 Mock 数据展示界面。如需真实数据，请部署 Worker 代理。

---

## 部署指南

### 部署 Pages 前端

#### 方法一：通过 Cloudflare Dashboard（推荐新手）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单选择 **Workers & Pages**
3. 点击 **Create application** → **Pages**
4. 选择 **Upload assets**（直接上传）
5. 填写项目名称（如 `cf-usage-tracker`）
6. 将项目根目录下的所有文件打包为 ZIP 上传，或逐个上传
7. 点击 **Deploy**

部署完成后会获得一个 `https://cf-usage-tracker.pages.dev` 地址。

#### 方法二：通过 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 在项目根目录执行部署
cd "cloudflare request viewing"
wrangler pages deploy . --project-name=cf-usage-tracker
```

#### 方法三：通过 Git 连接

1. 将代码推送到 GitHub/GitLab 仓库
2. 在 Cloudflare Pages 中选择 **Connect to Git**
3. 选择仓库，构建命令留空，输出目录设为 `/`（根目录）
4. 点击 **Save and Deploy**

---

### 部署 Worker API 代理

Worker 代理用于解决浏览器直接请求 Cloudflare API 时的 CORS 跨域问题。

#### 步骤一：安装 Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

#### 步骤二：部署 Worker

```bash
cd "cloudflare request viewing/worker"
wrangler deploy
```

部署成功后会输出 Worker URL，格式类似：
```
https://cf-tracker-proxy.<你的子域>.workers.dev
```

#### 步骤三：在应用中配置代理地址

1. 打开部署好的 Pages 应用
2. 进入 **设置** 页面
3. 在 **API 代理地址** 输入框中填入 Worker URL
4. 设置会自动保存到 IndexedDB

#### Worker 代理工作原理

```
浏览器应用  →  Cloudflare Worker (代理)  →  Cloudflare API
                ↑ 添加 CORS 头
```

Worker 脚本接收前端的 POST 请求，将请求转发到 Cloudflare API，并在响应中添加 CORS 头，使浏览器可以正常读取数据。

---

### 自定义域名

#### 为 Pages 配置自定义域名

1. 在 Cloudflare Dashboard 中进入你的 Pages 项目
2. 选择 **Custom domains** → **Set up a custom domain**
3. 输入你的域名（如 `tracker.yourdomain.com`）
4. 按提示添加 CNAME 记录

#### 为 Worker 配置自定义路由

1. 编辑 `worker/wrangler.toml`：

```toml
name = "cf-tracker-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

2. 重新部署：

```bash
wrangler deploy
```

---

## 使用说明

> **快速导航**：[仪表盘](#仪表盘) · [账户管理](#账户管理) · [多账户对比](#多账户对比) · [数据管理](#数据管理) · [设置](#设置)

---

### 仪表盘

仪表盘是应用的主页面，提供所选账户使用情况的全面概览。

#### 页面结构

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ 模拟数据提示（仅在使用 Mock 数据时显示）           │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 今日请求  │ │ Worker调用│ │ 本月请求  │ │ 带宽使用│ │
│  │ 5,404    │ │ 432      │ │ 142,500  │ │ 3.2 GB │ │
│  │ ████░░  │ │ ██░░░░  │ │ 累计     │ │ 本月   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  请求趋势（最近30天）     [7天][30天][90天]    │  │
│  │  📈 折线图：请求数 + Worker 调用 双Y轴         │  │
│  └────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐ ┌───────────────────────┐ │
│  │ 资源分布（环形图）   │  使用情况详情（表格）    │ │
│  │ 45% 请求             │ 今天  5,404  432  ...  │ │
│  │ 20% Worker           │ 昨天  6,100  480  ...  │ │
│  │ 25% 带宽             │ ...                    │ │
│  │ 10% 页面浏览         │                        │ │
│  └──────────────────────┘ └───────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### 统计卡片说明

| 卡片 | 含义 | 进度条 |
|------|------|--------|
| **今日请求** | 当日累计 HTTP 请求数 | 对 100,000 配额的百分比 |
| **Worker 调用** | 当日 Cloudflare Worker 调用次数 | 对 100,000 配额的百分比 |
| **本月请求** | 当月累计请求数 | 无（显示月度总计） |
| **带宽使用** | 当月累计出站带宽 | 无（显示字节总量） |

#### 操作流程

1. **切换账户**：点击顶部栏的账户名称，或在「账户管理」页面切换
2. **查看不同时段**：在趋势图上方的下拉框选择 7 天 / 30 天 / 90 天
3. **刷新数据**：点击顶部栏的 🔄 刷新按钮

---

### 账户管理

#### 查看账户列表

进入「账户管理」页面后，会看到所有已添加账户的卡片列表。

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  🟢 我的生产环境          [当前] │  │ 🔵 测试环境                       │
│  ID: abc123...def456            │  │  ID: xyz789...ghi012            │
│                                 │  │                                 │
│  ┌─────────┐ ┌─────────┐       │  │  ┌─────────┐ ┌─────────┐       │
│  │今日请求  │ │本月累计  │       │  │  │今日请求  │ │本月累计  │       │
│  │ 5,404   │ │142,500  │       │  │  │ 1,200   │ │ 35,000  │       │
│  └─────────┘ └─────────┘       │  │  └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐       │  │  ┌─────────┐ ┌─────────┐       │
│  │ Worker  │ │记录天数  │       │  │  │ Worker  │ │记录天数  │       │
│  │ 432     │ │  30    │       │  │  │  96    │ │  15    │       │
│  └─────────┘ └─────────┘       │  │  └─────────┘ └─────────┘       │
│                                 │  │                                 │
│  [编辑] [刷新] [设为当前] [删除]│  │  [设为当前] [编辑] [刷新] [删除]│
└─────────────────────────────────┘  └─────────────────────────────────┘
```

#### 添加新账户

1. 点击右上角 **"+ 添加账户"** 按钮
2. 在弹出的对话框中填写：
   - **账户名称**（必填）：随意命名，如"生产环境"
   - **Cloudflare 账户 ID**（必填）：见 [快速开始 - 第 1 步](#第-1-步获取-cloudflare-account-id)
   - **API 令牌**（必填）：见 [快速开始 - 第 2 步](#第-2-步创建-cloudflare-api-token)
   - **API 邮箱**（可选）：仅 Global API Key 认证时需要
3. 点击 **"保存"** → 账户会出现在列表中

#### 编辑已有账户

1. 在账户卡片上点击 **"编辑"** 按钮
2. 在对话框中修改账户信息
3. 点击 **"保存"** 提交更改

#### 切换当前账户

1. 在目标账户卡片上点击 **"设为当前"**
2. 该卡片会高亮显示绿色"当前"标签
3. 仪表盘会立即显示该账户的数据

#### 刷新单个账户

1. 在账户卡片上点击 **"刷新"** 按钮
2. 应用会从 Cloudflare API 获取该账户最新数据
3. 刷新完成后卡片上的统计数字会更新

#### 删除账户

1. 在账户卡片上点击 **"删除"** 按钮
2. 确认弹窗中点击 **"确定"**
3. ⚠️ 该账户的所有使用记录也会被删除
4. 如果删除的是当前账户，系统会自动将第一个剩余账户设为当前

---

### 多账户对比

此页面可以同时查看多个账户的使用情况，进行横向对比分析。

#### 使用步骤

1. 点击侧边栏 **"多账户对比"**
2. 选择对比指标：
   - **请求数**：各账户 HTTP 请求量对比
   - **Worker 调用**：各账户 Worker 调用次数对比
   - **带宽使用**：各账户带宽消耗对比
3. 选择时间范围：
   - **今日**：仅当天数据
   - **近 7 天**：最近一周趋势
   - **近 30 天**：最近一个月（默认）
4. 图表和表格会自动更新

#### 页面组成

```
┌──────────────────────────────────────────────────────┐
│  指标: [请求数 ▾]   范围: [近30天 ▾]                  │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  📊 多账户对比折线图                            │  │
│  │  每条折线代表一个账户，可在图例中点击隐藏/显示   │  │
│  │  横轴：日期  纵轴：请求数                       │  │
│  └────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │ 汇总统计表                                     │  │
│  │ ┌──────┬────────┬────────┬────────┬────────┐ │  │
│  │ │账户   │请求总数│Worker  │带宽     │活跃天数│ │  │
│  │ ├──────┼────────┼────────┼────────┼────────┤ │  │
│  │ │生产  │142,500 │11,400  │3.2 GB  │  30   │ │  │
│  │ │测试  │ 35,000 │ 2,800  │0.8 GB  │  15   │ │  │
│  │ └──────┴────────┴────────┴────────┴────────┘ │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

#### 对比场景举例

- 对比生产环境与测试环境的请求量差异
- 对比不同客户账户的资源消耗
- 观察同一账户在不同时段的使用趋势
- 验证流量突增是否与特定事件相关

---

### 数据管理

#### 导出备份

将所有账户配置、使用记录和应用设置打包为 JSON 文件，用于备份或迁移。

1. 进入 **"数据管理"** 页面
2. 点击 **"📦 导出数据"** 卡片中的 **"导出数据"** 按钮
3. 浏览器会自动下载文件，文件名格式：
   ```
   cf-tracker-backup-2026-08-13T14-30-00.json
   ```
4. 将文件保存到安全位置

**备份文件内容**：
```json
{
  "version": 1,
  "exportedAt": "2026-08-13T14:30:00.000Z",
  "accounts": [
    {
      "id": 1,
      "name": "生产环境",
      "accountId": "abc123...",
      "apiToken": "abc123...",
      "isActive": true,
      "createdAt": "2026-08-13T10:00:00.000Z"
    }
  ],
  "usageRecords": [
    {
      "id": 1,
      "accountId": 1,
      "date": "2026-08-13",
      "requests": 5404,
      "workersInvocations": 432,
      "bandwidth": 3435973836,
      "isMock": false
    }
  ],
  "settings": [
    { "key": "workerUrl", "value": "https://..." },
    { "key": "autoFetchInterval", "value": "60" }
  ]
}
```

#### 导入恢复

从之前导出的 JSON 文件恢复所有数据。

1. 进入 **"数据管理"** 页面
2. 点击 **"📥 导入恢复"** 卡片中的 **"导入数据"** 按钮
3. 在文件选择对话框中选择之前导出的 `.json` 文件
4. 弹出确认框，显示将要导入的账户数和记录数
5. 点击 **"确定"** 开始导入
6. 导入完成后页面自动刷新

> ⚠️ **注意**：导入会覆盖当前所有数据！建议先导出备份。

#### 清空数据

⚠️ **警告：此操作不可恢复！**

1. 进入 **"数据管理"** 页面
2. 点击 **"🗑️ 清空数据"** 卡片中的 **"清空所有数据"** 按钮
3. 弹出第一次确认框："将删除所有账户和使用记录..."
4. 点击 **"确定"** 后弹出第二次确认框："再次确认：真的要清空所有数据吗？"
5. 再次点击 **"确定"** → 所有数据被清除

> 💡 **建议**：清空前先导出备份，防止误操作导致数据丢失。

#### 存储统计

在数据管理页面底部会显示存储信息：

| 指标 | 说明 |
|------|------|
| **账户数量** | 已添加的账户总数 |
| **使用记录** | 已采集的使用数据天数 × 账户数 |
| **最近同步** | 上次成功获取数据的时间 |
| **存储空间** | IndexedDB 中数据占用的字节数 |

---

### 设置

#### 外观设置

**主题模式**：

| 选项 | 行为 | 适用场景 |
|------|------|----------|
| 浅色 | 固定使用浅色主题 | 白天或光线充足环境 |
| 深色 | 固定使用深色主题 | 夜间或低光环境，护眼 |
| 跟随系统 | 自动跟随操作系统设置（默认） | 大多数用户推荐 |

**切换方式**：
- **快捷方式**：侧边栏底部的主题按钮，点击循环切换
- **详细配置**：设置页 → 外观设置 → 直接点击对应选项

#### 数据采集设置

**自动采集间隔**：

| 选项 | 说明 | 适用场景 |
|------|------|----------|
| 禁用自动采集 | 仅手动刷新 | 不希望自动请求 API |
| 每 30 分钟 | 高频监控 | 需要实时追踪使用情况 |
| 每 1 小时（默认） | 日常使用推荐 | 平衡实时性和 API 调用量 |
| 每 6 小时 | 低频追踪 | 数据敏感度较低 |
| 每 12 小时 | 每日两次 | 一般关注 |
| 每天 | 最低频率 | 仅需日报级别数据 |

**采集历史天数**：

| 选项 | 说明 |
|------|------|
| 最近 7 天 | 只采集最近一周数据，节省 API 调用 |
| 最近 30 天（默认） | 平衡数据量和 API 调用 |
| 最近 90 天 | 完整季度数据，用于深度分析 |

#### 部署信息

**API 代理地址**：

填写已部署的 Cloudflare Worker 代理地址（以 `https://` 开头，通常以 `.workers.dev` 结尾）。

- **填写后**：API 请求通过 Worker 代理转发，可获取真实 Cloudflare 数据
- **留空时**：浏览器直接请求 Cloudflare API，可能因 CORS 被阻止，应用使用模拟数据
- **修改后**：立即生效，无需重启应用

---

## 数据采集详解

### 采集流程

```
┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  定时器  │───▶│  检查间隔    │───▶│  获取数据    │───▶│  存入数据库  │
│/手动刷新│    │ 是否到达？   │    │              │    │              │
└─────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │  API 请求    │
                                    │              │
                                    │ 成功 → 解析  │
                                    │ 失败 → Mock  │
                                    └──────────────┘
```

### 采集频率说明

| 频率 | API 调用量（每月估算） | 延迟说明 |
|------|------------------------|----------|
| 30 分钟 | ~14,400 次 | 接近实时 |
| 1 小时 | ~7,200 次 | 小时级延迟 |
| 6 小时 | ~1,200 次 | 6 小时延迟 |
| 12 小时 | ~600 次 | 12 小时延迟 |
| 每天 | ~30 次 | 天级延迟 |

> Cloudflare Worker 免费版每天 100,000 次请求，付费版无限制。

### 数据延迟

Cloudflare Analytics API 的数据有一定延迟：
- **实时数据**：约 1 小时后可查询
- **准确数据**：约 24 小时后完全稳定
- 应用显示的"今日"数据可能不完整，次日会更新为准确值

---

## 数据存储方案

### 存储架构

```
┌─────────────────────────────────────────┐
│           浏览器 (Browser)               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │       IndexedDB                    │  │
│  │  (cf_tracker_db)                  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ accounts (账户存储)          │  │  │
│  │  │  - id (自增主键)             │  │  │
│  │  │  - name (账户名称)           │  │  │
│  │  │  - accountId (CF账户ID)     │  │  │
│  │  │  - apiToken (API令牌)        │  │  │
│  │  │  - apiEmail (邮箱,可选)     │  │  │
│  │  │  - isActive (是否当前)      │  │  │
│  │  │  - createdAt / updatedAt     │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ usage_records (使用记录)     │  │  │
│  │  │  - id (自增主键)             │  │  │
│  │  │  - accountId (关联账户)     │  │  │
│  │  │  - date (日期)              │  │  │
│  │  │  - requests (请求数)        │  │  │
│  │  │  - workersInvocations       │  │  │
│  │  │  - bandwidth (带宽)          │  │  │
│  │  │  - pageViews / uniqueVisitors│  │  │
│  │  │  - isMock (是否模拟数据)    │  │  │
│  │  │  - fetchedAt (采集时间)     │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ app_settings (应用设置)      │  │  │
│  │  │  - key (设置键名)            │  │  │
│  │  │  - value (设置值)            │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │       localStorage                 │  │
│  │  - cf_tracker_theme (主题偏好)     │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘

         ✗ 不上传任何远程服务器
```

### 隐私保证

- **所有数据仅存储在本地浏览器**：IndexedDB + localStorage
- **不上传任何数据到远程服务器**：唯一的网络请求是对 Cloudflare API 的只读查询
- **API Token 仅保存在本地**：不会通过 Worker 代理存储或记录
- **Worker 代理仅做请求转发**：不缓存、不记录任何数据

### 存储容量

- IndexedDB 的存储限制通常为可用磁盘空间的 50% 以上
- 单个使用记录约 200-300 字节
- 1000 条记录仅约 300KB
- 日常使用完全不会触及存储上限

---

## API 认证说明

Cloudflare API 支持两种认证方式，本应用均已实现。

### 方式对比

| 对比项 | API Token（推荐） | Global API Key（不推荐） |
|--------|-------------------|------------------------|
| 安全性 | 高（最小权限原则） | 低（拥有全部权限） |
| 创建方式 | 手动创建自定义 Token | 系统自动生成 |
| 权限粒度 | 可精确到 Analytics Read | 全部权限 |
| 有效期 | 可设置过期时间 | 永久有效（除非手动重置） |
| 所需字段 | Account ID + API Token | Account ID + API Key + 邮箱 |
| 适用场景 | 日常使用、团队协作 | 个人临时测试 |

### 方式一：API Token（推荐）

#### 什么是 API Token

API Token 是 Cloudflare 提供的安全认证令牌，可以自定义权限范围。遵循"最小权限原则"，只授予必要的 Analytics Read 权限，即使 Token 泄露也无法造成严重后果。

#### 创建步骤详解

1. **进入 Token 管理页面**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 点击右上角头像 → **My Profile** → **API Tokens**
   - 或直接访问：[https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)

2. **创建自定义 Token**
   - 点击右上角 **Create Token**
   - 在模板列表中选择 **Create Custom Token**（不要选"Edit Cloudflare Workers"等预设模板）
   - **Token 名称**：输入有意义的名称，如 `CF Usage Tracker` 或 `analytics-read-only`

3. **配置权限**（关键步骤）

   需要添加以下两组权限：

   | 权限组 | 资源类型 | 权限 | 操作 |
   |--------|----------|------|------|
   | Account | Analytics | Read | 读取账户级分析数据（所有域名汇总） |
   | Zone | Analytics | Read | 读取域名级分析数据（单个域名） |

   具体操作：
   - 点击 **Select account** → 选择你的账户 → 展开菜单 → 勾选 **Analytics** 下的 **Read**
   - 点击 **Select zone** → 选择你的域名（或"All zones"）→ 展开菜单 → 勾选 **Analytics** 下的 **Read**

4. **设置范围和有效期**
   - **Resources**：选择 **Include** → **Specific account** → 选择你的账户
   - **IP Address Filter**（可选）：如果知道使用的 IP，可以限制仅允许该 IP 访问
   - **TTL**（可选）：建议设置为 6-12 个月，到期后需要重新创建

5. **生成并保存**
   - 点击 **Continue** → 检查配置 → 点击 **Create Token**
   - ⚠️ **Token 仅显示一次！** 请立即复制保存到密码管理器或安全笔记中

#### 在应用中使用

在「账户管理」页面添加账户时填写：
- **Cloudflare 账户 ID**：32 位十六进制字符串
- **API 令牌**：刚才创建的 Token（通常以一串字母数字组成）
- **API 邮箱**：留空（API Token 认证不需要邮箱）

### 方式二：Global API Key（不推荐）

#### 什么是 Global API Key

Global API Key 是 Cloudflare 账户的主密钥，拥有对账户的**全部操作权限**（包括删除域名、修改 DNS 等）。如果泄露，攻击者可以完全控制你的 Cloudflare 账户。

#### 获取步骤

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击右上角头像 → **My Profile** → **API Tokens**
3. 滚动到页面底部，找到 **API Keys** 部分
4. 找到 **Global API Key**，点击 **View** 按钮
5. 系统会要求你再次输入密码验证身份
6. 验证通过后会显示 Key（以字母开头的长字符串）
7. 点击复制按钮保存

#### 在应用中使用

在「账户管理」页面添加账户时填写：
- **Cloudflare 账户 ID**：32 位十六进制字符串
- **API 令牌**：填入 Global API Key
- **API 邮箱**：必填，填入 Cloudflare 账户的注册邮箱地址

#### 安全警告

> ⚠️ **强烈建议不要使用 Global API Key**
> 
> - Global API Key 拥有账户的完全控制权
> - 无法限制其权限范围
> - 如果泄露，无法单独撤销（只能重置，重置后所有使用该 Key 的应用都会失效）
> - 建议始终使用 API Token，并仅授予 Analytics Read 权限

### 认证请求示例

应用通过 Worker 代理向 Cloudflare API 发起请求时，会添加以下认证头：

```http
GET https://api.cloudflare.com/client/v4/accounts/{accountId}/analytics/dashboard
Authorization: Bearer {apiToken}
Content-Type: application/json
```

Worker 代理会在响应中添加 CORS 头，使浏览器可以正常读取：

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

### 排查认证问题

| 错误现象 | 可能原因 | 解决方案 |
|----------|----------|----------|
| 401 Unauthorized | Token 格式错误或已过期 | 重新创建 Token，检查是否复制完整 |
| 403 Forbidden | Token 权限不足 | 确保 Token 有 Account/Zone Analytics Read 权限 |
| 404 Not Found | Account ID 错误 | 在 Dashboard 重新确认 Account ID |
| CORS 错误 | 未配置 Worker 代理 | 部署 Worker 并在设置中填入代理地址 |
| 请求超时 | 网络问题或 API 限流 | 稍后重试，或检查是否触发速率限制 |

---

## 配置项详解

### 应用设置（存储在 IndexedDB）

| 设置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `workerUrl` | string | `''` | Cloudflare Worker 代理地址 |
| `autoFetchInterval` | number | `60` | 自动采集间隔（分钟），0=禁用 |
| `fetchHistoryDays` | number | `30` | 历史数据回溯天数 |
| `lastSync` | string (ISO) | `null` | 最近一次同步时间 |

### 主题设置（存储在 localStorage）

| 键名 | 值 | 说明 |
|------|-----|------|
| `cf_tracker_theme` | `light` / `dark` / `system` | 主题模式偏好 |

### Worker 配置（`worker/wrangler.toml`）

```toml
name = "cf-tracker-proxy"        # Worker 名称
main = "worker.js"                # 入口文件
compatibility_date = "2024-01-01" # 兼容性日期

# 可选：自定义路由
# routes = [
#   { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
# ]
```

### Pages 配置（`wrangler.toml`）

```toml
name = "cf-usage-tracker"           # Pages 项目名称
compatibility_date = "2024-01-01"
public_output = "."                  # 静态文件根目录

# 可选：自定义路由
# routes = [
#   { pattern = "your-domain.pages.dev/*" }
# ]
```

---

## 常见问题

### Q1: 点击「刷新」后提示"获取数据失败"怎么办？

**完整排查步骤（按顺序尝试）：**

#### 第一步：检查账户配置

1. 进入「账户管理」页面
2. 点击账户卡片的 **"编辑"** 按钮
3. 确认以下信息：
   - **账户 ID**：32 位十六进制字符串，格式为 `abc123def456...`（在 CF Dashboard 域名概览页右侧栏获取）
   - **API 令牌**：Token 是否完整复制（Token 中间不能有空格或换行）
   - **API 邮箱**：使用 API Token 认证时此字段应为空
4. 点击 **"保存"** 后重新刷新

#### 第二步：检查 Worker 代理配置

1. 进入「设置」页面
2. 确认 **"API 代理地址"** 已填写
3. 地址格式应为 `https://xxxx.workers.dev`
4. 在浏览器新标签页打开这个地址，确认 Worker 正在运行（应返回 JSON 或 CORS 相关响应）
5. 如果 Worker 未运行，重新部署：
   ```bash
   cd worker
   wrangler deploy
   ```

#### 第三步：检查 Token 权限

1. 登录 [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击你创建的 Token
3. 确认权限包含：
   - Account → Analytics → Read ✅
   - Zone → Analytics → Read ✅
4. 如果缺少权限，需要创建新的 Token（不能直接修改已有 Token 的权限）

#### 第四步：查看浏览器控制台错误

1. 按 **F12** 打开开发者工具
2. 切换到 **Console（控制台）** 标签
3. 再次点击应用的「刷新」按钮
4. 查看红色错误信息：
   - `CORS Error` → Worker 代理未配置或地址错误
   - `401 Unauthorized` → Token 无效或已过期
   - `403 Forbidden` → Token 权限不足
   - `404 Not Found` → Account ID 错误
   - `net::ERR_ABORTED` → 网络问题，尝试刷新页面或更换网络

#### 第五步：检查是否添加了域名

Cloudflare Analytics API 需要账户下至少有一个已添加的域名：
1. 登录 Cloudflare Dashboard
2. 查看「域名管理」是否有域名
3. 如果没有，需要先添加一个域名（免费版即可）

---

### Q2: 仪表盘显示黄色横幅"当前显示的是模拟数据"

这表示 API 请求失败，应用使用了 Mock 数据。

**原因和解决：**

| 原因 | 检查方法 | 解决方案 |
|------|----------|----------|
| 未配置 Worker 代理 | 设置页的代理地址是否为空 | 部署 Worker 并填入地址 |
| Worker 地址错误 | 打开 Worker 地址看是否正常响应 | 检查地址拼写，重新部署 |
| Token 无效 | 查看 Console 是否有 401 错误 | 重新创建 Token |
| Token 权限不足 | 查看 Console 是否有 403 错误 | 创建有正确权限的新 Token |
| Account ID 错误 | 查看 Console 是否有 404 错误 | 重新确认 Account ID |
| 网络问题 | 尝试其他网站是否正常 | 检查网络连接 |

> 💡 **临时预览**：如果暂时不想部署 Worker，可以先用 Mock 数据体验应用界面。Mock 数据是随机生成的 30 天使用数据，仅用于演示 UI。

---

### Q3: API Token 安全吗？

- **存储位置**：Token 仅保存在浏览器本地 IndexedDB 中，不会上传到任何服务器
- **传输方式**：Token 通过 HTTPS 加密传输到 Cloudflare API，不经过任何第三方
- **Worker 代理**：代理仅做请求转发，不缓存、不记录、不存储 Token
- **风险提示**：任何能访问该浏览器的人都能看到 Token。建议在公共设备上谨慎使用

**安全最佳实践：**
1. 使用最小权限的 API Token（仅 Analytics Read）
2. 设置 Token 有效期（6-12 个月后自动过期）
3. 定期轮换 Token
4. 不在多个设备/浏览器中使用同一 Token
5. 如需更高安全，可在 Worker 代理中添加 IP 白名单

---

### Q4: Account ID 格式是什么样的？

Account ID 是一个 **32 位十六进制字符串**，格式类似：
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
```

**常见问题：**
- ❌ 不是邮箱地址
- ❌ 不是 Zone ID（Zone ID 是域名级别的，和 Account ID 不同）
- ❌ 不能包含空格或特殊字符
- ✅ 只能包含小写字母 a-f 和数字 0-9

如果不确定，可以在浏览器 Console 中运行以下命令验证：
```javascript
/^[a-f0-9]{32}$/.test('你的AccountID')
// 返回 true 则格式正确
```

---

### Q5: 可以在手机上使用吗？

可以。应用采用响应式设计：

| 屏幕宽度 | 布局模式 | 特点 |
|----------|----------|------|
| ≥ 1024px | 桌面端 | 完整侧边栏 + 多列布局 |
| 768-1023px | 平板端 | 侧边栏折叠 + 优化间距 |
| < 768px | 移动端 | 汉堡菜单 + 单列布局 |

**移动端功能完整：**
- 所有数据采集、查看功能正常
- 图表自动适配屏幕宽度
- 触摸友好的按钮尺寸（≥ 44px）
- 深色/浅色主题正常切换

**使用建议：**
- 手机上首次使用需配置 Worker 代理地址
- 建议在 WiFi 环境下使用（API 流量消耗）
- 移动端数据与桌面端独立存储（不同浏览器 = 不同数据）
- 可通过备份功能在设备间迁移数据

---

### Q6: 数据会丢失吗？

#### 不会丢失的情况

- 正常关闭浏览器后重新打开
- 清除普通浏览数据（Cookie、缓存）
- 应用代码更新（重新部署不会影响 IndexedDB）
- 浏览器自动清理缓存

#### 会丢失的情况

- **手动清除站点数据**：浏览器设置 → 清除数据 → 勾选"站点数据"
- **卸载浏览器**：部分浏览器卸载会清除所有本地数据
- **隐私模式/无痕模式**：关闭窗口后数据自动清除
- **磁盘空间不足**：IndexedDB 可能被浏览器自动清理
- **手动清空**：在「数据管理」页面点击了"清空所有数据"

#### 数据安全建议

| 操作 | 频率建议 |
|------|----------|
| 导出备份 | 每周 1 次 |
| 检查数据完整性 | 每月 1 次 |
| 迁移到新设备 | 使用备份导入功能 |

---

### Q7: 支持哪些浏览器？

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome / Chromium | 80+ | 推荐（完全支持） |
| Firefox | 75+ | 完全支持 |
| Safari | 14+ | 支持，部分特性可能略有差异 |
| Edge | 80+ | 完全支持（基于 Chromium） |
| Opera | 67+ | 完全支持 |

**需要的浏览器特性：**
- IndexedDB 2.0+
- ES6 Modules / Classes
- CSS Variables
- Fetch API
- Chart.js 4.4+（通过 CDN 加载）

**测试方法：**
```javascript
// 在浏览器 Console 中运行
typeof indexedDB !== 'undefined'  // 应返回 true
typeof fetch !== 'undefined'       // 应返回 true
window.CSS && window.CSS.supports('color', 'var(--test)')  // 应返回 true
```

---

### Q8: Worker 代理是必须的吗？

#### 各场景说明

| 场景 | 是否需要 Worker | 说明 |
|------|----------------|------|
| 本地开发（localhost） | 建议使用 | Chrome 对 localhost 有特殊处理，但仍可能被 CORS 阻止 |
| Cloudflare Pages 部署 | 强烈建议 | Pages 域名与 Cloudflare API 不同源，一定需要代理 |
| 其他静态托管（Vercel/Netlify） | 必须使用 | 一定会遇到 CORS 限制 |
| 临时预览界面 | 可以不用 | 应用会自动使用 Mock 数据 |

#### 不使用 Worker 时会发生什么

1. 浏览器尝试直接请求 `api.cloudflare.com`
2. CORS 预检请求（OPTIONS）被 Cloudflare 拒绝
3. 所有 API 请求失败
4. 应用自动降级为 Mock 数据模式
5. 黄色横幅提示"当前显示的是模拟数据"
6. Mock 数据不反映真实使用情况，仅用于预览 UI

#### 如何判断 Worker 是否正常工作

1. 在「设置」页填入 Worker 地址
2. 在浏览器新标签页打开 Worker 地址
3. 应看到类似以下响应：
   ```json
   {
     "success": false,
     "errors": [{"message": "Method not allowed"}]
   }
   ```
   或成功的 CORS 预检响应
4. 回到应用点击「刷新」
5. 如果提示"数据更新成功" → Worker 工作正常 ✅
6. 如果提示"已使用模拟数据" → Worker 配置仍有问题 ❌

---

### Q9: 如何更新应用版本？

#### 更新前端代码（Pages）

1. **手动上传**：重新打包所有文件，在 Pages 项目中点击 "Replace deployment"
2. **Git 推送**：推送到 Git 仓库，Pages 自动构建部署（如果配置了 Git 连接）
3. **Wrangler CLI**：
   ```bash
   wrangler pages deploy . --project-name=cf-usage-tracker
   ```

#### 更新 Worker

```bash
cd worker
wrangler deploy
```

#### 数据保留

- 代码更新**不会**影响 IndexedDB 中的数据
- 账户配置、使用记录、设置全部保留
- 只有在代码中变更了数据库 schema（版本号）时，可能触发数据迁移

---

### Q10: 免费版 Cloudflare 能用吗？

**完全可以！** 本项目所有功能均兼容 Cloudflare 免费版。

| 服务 | 免费版配额 | 本项目使用量 |
|------|-----------|-------------|
| Cloudflare Pages | 500 次构建/月 | 每月几次更新，远低于配额 |
| Cloudflare Workers | 100,000 次请求/天 | 每账户每次刷新 1-3 次调用 |
| Analytics API | 包含在免费版 | 无额外限制 |
| Workers 存储 | 100 MB（KV/R2 需付费） | 本项目 Worker 不使用存储 |

**每月预估 API 调用量：**
- 单账户 + 1 小时刷新间隔：~720 次/月
- 5 账户 + 1 小时刷新间隔：~3,600 次/月
- 远低于免费版 100,000 次/天的配额

---

### Q11: 如何同时管理多个 Cloudflare 账户？

1. **添加多个账户**：在「账户管理」页面依次添加所有账户
2. **设置当前账户**：点击账户卡片上的"设为当前"，仪表盘显示该账户数据
3. **同时查看所有账户**：进入「多账户对比」页面，选择指标和时间范围
4. **批量刷新**：点击顶部栏的「刷新」按钮，会为所有账户同时获取数据

**使用场景举例：**
- 管理多个客户的 Cloudflare 账户（分别添加，独立查看）
- 对比生产环境和测试环境的流量差异
- 监控多个网站的带宽使用情况
- 汇总所有账户的月度使用数据

---

### Q12: 仪表盘数据延迟多久？

Cloudflare Analytics API 的数据有处理延迟：

| 数据类型 | 延迟时间 | 说明 |
|----------|----------|------|
| 实时数据 | ~1 小时 | 请求需要约 1 小时才能出现在 Analytics 中 |
| 准确数据 | ~24 小时 | 数据在 24 小时后完全稳定，不再修订 |
| 今日数据 | 不完整 | 当天数据可能偏低，次日会补全 |

**应用刷新频率建议：**
- **日常监控**：每 6-12 小时刷新一次即可
- **实时监控**：每 30 分钟刷新，但看到的是 1 小时前的数据
- **日报生成**：每天早上刷新，获取前一天的完整数据

---

### Q13: 如何清理所有数据重新开始？

1. **先导出备份**（重要！）：
   - 进入「数据管理」→ 点击「导出数据」
   - 保存 JSON 文件到安全位置

2. **清空应用数据**：
   - 进入「数据管理」→ 点击「清空所有数据」
   - 两次确认后数据被清除

3. **重新配置**：
   - 重新添加账户（Account ID + API Token）
   - 重新配置 Worker 代理地址
   - 选择主题偏好和采集设置

4. **恢复旧数据**（可选）：
   - 如果需要恢复之前的数据，点击「导入数据」
   - 选择之前导出的 JSON 文件
   - 确认导入

**高级方法：** 在浏览器 Console 中直接操作：
```javascript
// 打开 IndexedDB 查看
indexedDB.open('cf_tracker_db')

// 通过浏览器开发者工具清除
// Chrome: F12 → Application → Storage → IndexedDB → cf_tracker_db → 清除
```

---

## 开发指南

### 模块化架构

```
app.js (主应用)
  ├── theme.js     ← 主题管理
  ├── db.js        ← 数据存储
  ├── api.js       ← API 请求
  ├── usage.js     ← 数据采集 (依赖 db.js, api.js)
  ├── charts.js    ← 图表渲染 (依赖 usage.js, theme.js)
  ├── accounts.js  ← 账户管理 (依赖 db.js)
  └── backup.js    ← 备份恢复 (依赖 db.js)
```

### 添加新的数据指标

1. 在 `js/api.js` 的 `getUsageData()` 中添加 API 查询字段
2. 在 `js/db.js` 的 `addUsageRecord()` 中扩展记录结构
3. 在 `js/usage.js` 的 `getTrendData()` 中添加新指标
4. 在 `js/charts.js` 中渲染新指标

### 添加新的图表

1. 在 `index.html` 中添加 `<canvas>` 元素
2. 在 `js/charts.js` 中添加渲染方法
3. 在 `js/app.js` 的对应页面渲染函数中调用

### 自定义主题颜色

编辑 `css/style.css` 中的 CSS 变量：

```css
:root {
  --accent: #f38020;        /* 修改主色调 */
  --accent-hover: #e56b0a;
  /* ... 其他变量 */
}

[data-theme="dark"] {
  --bg-primary: #0f172a;     /* 修改深色背景 */
  /* ... 其他变量 */
}
```

### 本地开发建议

1. 使用 Python HTTP 服务器启动本地预览：
   ```bash
   python -m http.server 3000
   ```

2. 打开浏览器开发者工具，在 Console 中可以直接调试各模块：
   ```javascript
   DB.getAccounts()          // 查看所有账户
   DB.getStats()             // 查看存储统计
   ThemeManager.apply('dark') // 切换主题
   UsageTracker.getSummary(1) // 查看账户1的统计
   ```

3. 修改代码后刷新浏览器即可生效，无需构建步骤

---

## 许可证

本项目可自由使用、修改和分发。

---

## 技术支持

### 快速检查清单

遇到问题时，按以下清单逐一排查：

```
✅ 1. 确认已添加 Cloudflare 账户
      → 账户管理 → 查看是否有账户

✅ 2. 确认账户 ID 格式正确
      → 应为 32 位十六进制字符
      → 验证：/^[a-f0-9]{32}$/.test('accountId')

✅ 3. 确认 API Token 有效且有权限
      → dash.cloudflare.com/profile/api-tokens
      → 检查 Token 状态为"活跃"
      → 权限包含 Account + Zone 的 Analytics Read

✅ 4. 确认 Worker 代理已部署且地址正确
      → 在新标签页打开 Worker 地址
      → 应返回 JSON 响应（即使是错误也正常）

✅ 5. 确认 Worker 地址已在应用中配置
      → 设置 → API 代理地址 → 填入 Worker URL

✅ 6. 确认账户下至少有一个域名
      → Cloudflare Dashboard → 域名管理
      → Analytics API 需要域名存在

✅ 7. 确认浏览器支持 IndexedDB
      → Console 运行: typeof indexedDB !== 'undefined'

✅ 8. 检查浏览器控制台错误
      → F12 → Console → 查看红色错误信息
      → F12 → Network → 查看 API 请求状态码
```

### 错误信息速查

| 错误信息 | 含义 | 解决方案 |
|----------|------|----------|
| `获取数据失败` | API 请求失败 | 检查账户配置、Worker 代理、Token 权限 |
| `已使用模拟数据` | API 无法连接 | 配置 Worker 代理地址 |
| `tx.store is not a function` | 已修复（版本兼容） | 更新到最新代码 |
| `idb is not defined` | 已修复（本地 vendor） | 更新到最新代码 |
| `401 Unauthorized` | Token 无效 | 重新创建 Token |
| `403 Forbidden` | Token 权限不足 | 添加 Analytics Read 权限 |
| `404 Not Found` | Account ID 错误 | 重新确认 Account ID |
| `CORS Error` | 跨域被阻止 | 必须使用 Worker 代理 |
| `net::ERR_ABORTED` | 请求被中止 | 检查网络，刷新页面重试 |

### 获取帮助

如遇到问题：

1. **查看本文档**：特别是 [常见问题](#常见问题) 部分
2. **查看浏览器控制台**：F12 → Console 标签，查看红色错误
3. **查看网络请求**：F12 → Network 标签，筛选 XHR/Fetch 请求
4. **检查账户配置**：重新核对 Account ID 和 API Token
5. **检查 Worker 状态**：访问 Worker URL 确认正常运行
6. **导出数据备份**：数据管理 → 导出数据，防止丢失
7. **清空后重试**：数据管理 → 清空所有数据 → 重新配置

### 报告问题

如果上述步骤无法解决问题，请提供以下信息：

- **浏览器和版本**：Chrome 120 / Firefox 122 等
- **操作系统**：Windows 11 / macOS Sonoma 等
- **部署方式**：本地 / Cloudflare Pages / 其他
- **Worker 状态**：已部署 / 未部署
- **错误截图**：包含应用界面和浏览器控制台的错误
- **账户类型**：免费版 / 付费版
- **Cloudflare 域名数量**：1 个 / 多个
