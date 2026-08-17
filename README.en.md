# Cloudflare Usage Tracker

[中文](./README.md) [英文]

---

## Table of Contents

- [1. Introduction](#introduction)
- [2. Features](#features)
- [3. Tech Stack](#tech-stack)
- [4. Project Structure](#project-structure)
- [5. How It Works](#how-it-works)
- [6. Quick Start (5 Steps)](#quick-start-5-steps)
  - [Step 1: Get Your Cloudflare Account ID](#step-1-get-your-cloudflare-account-id)
  - [Step 2: Create a Cloudflare API Token](#step-2-create-a-cloudflare-api-token)
  - [Step 3: Deploy the Worker Proxy (Solve CORS)](#step-3-deploy-the-worker-proxy-solve-cors)
  - [Step 4: Add an Account in the App](#step-4-add-an-account-in-the-app)
  - [Step 5: Fetch Usage Data](#step-5-fetch-usage-data)
- [7. Run Locally](#run-locally)
- [8. Deployment Guide](#deployment-guide)
  - [8.1 Deploy the Pages Frontend](#81-deploy-the-pages-frontend)
  - [8.2 Deploy the Worker API Proxy](#82-deploy-the-worker-api-proxy)
  - [8.3 Custom Domain](#83-custom-domain)
- [9. User Guide (Detailed Steps)](#user-guide-detailed-steps)
  - [9.1 Dashboard](#91-dashboard)
  - [9.2 Account Management](#92-account-management)
  - [9.3 Multi-Account Comparison](#93-multi-account-comparison)
  - [9.4 Data Management](#94-data-management)
  - [9.5 Settings](#95-settings)
  - [9.6 UI Language and Theme Switching](#96-ui-language-and-theme-switching)
- [10. Data Collection Details](#data-collection-details)
- [11. Data Storage Solution](#data-storage-solution)
- [12. API Authentication Explained](#api-authentication-explained)
- [13. Configuration Reference](#configuration-reference)
- [14. FAQ](#faq)
- [15. Development Guide](#development-guide)
- [16. License](#license)
- [17. Support](#support)

---

## 1. Introduction

**Cloudflare Usage Tracker (CF Usage Tracker)** is a pure-frontend Cloudflare resource monitoring tool with zero backend database. It helps you:

- Monitor your Cloudflare account's core metrics in real time: **HTTP requests, Worker invocations, bandwidth, page views, unique visitors**, and more;
- Manage **multiple Cloudflare accounts** simultaneously and aggregate and compare them in a single interface;
- Store **all data only in your own browser** (IndexedDB) — nothing is uploaded to any third-party server;
- Fully support one-click deployment on **Cloudflare Pages + Workers**, with global CDN acceleration and zero server maintenance.

### Why do you need it?

The official Cloudflare Dashboard spreads its Analytics data around and shows charts by default. This project pulls the data locally and provides long-term trends, multi-account comparison, and local backups, and can continuously record historical data (up to a 90-day lookback) to facilitate cost analysis and capacity planning.

### Key Highlights

- ✅ **Zero build**: Vanilla JavaScript + CSS, no Node compilation required, just host it statically.
- ✅ **Privacy first**: The API Token is stored only in the browser locally; the Worker proxy only forwards requests — it does not cache or log anything.
- ✅ **Graceful degradation**: When no Worker proxy is configured, Mock data is used automatically so you can experience the full interface first.
- ✅ **Bilingual UI**: Built-in Chinese / English i18n, switchable with one click.
- ✅ **Dark mode**: Three theme levels — dark / light / follow-system — with flicker-free switching.
- ✅ **Responsive**: Fully adapted for desktop, tablet, and mobile.

### Overall Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Your Browser                              │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Frontend SPA (index.html + js/*.js + Chart.js + idb)      │  │
│  │                                                             │  │
│  │   Dashboard / Accounts / Multi-account Compare / Data Mgmt / Settings │
│  │        │                              │                     │  │
│  │        │ read/write                   │ start collection    │  │
│  │        ▼                              ▼                     │  │
│  │   IndexedDB (cf_tracker_db)     Cloudflare API wrapper      │  │
│  │   accounts / usage_records /    (js/api.js)                 │  │
│  │   app_settings                   │                          │  │
│  └──────────────────────────────────┼─────────────────────────┘  │
│                                     │                              │
└─────────────────────────────────────┼──────────────────────────────┘
                                      │ HTTPS (POST)
                                      ▼
                       ┌──────────────────────────────────┐
                       │  Cloudflare Worker Proxy          │
                       │  (forwarding only + CORS headers) │
                       │  → api.cloudflare.com/client/v4   │
                       │     GraphQL: httpRequests*Groups  │
                       └──────────────────────────────────┘
```

---

## 2. Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Automatic data collection** | Periodically (configurable) fetches requests, Worker invocations, bandwidth, and other metrics from the Cloudflare GraphQL Analytics API |
| **Multi-account management** | Add multiple Cloudflare accounts, track them independently, switch with one click, and aggregate/compare them |
| **Data visualization** | Trend line charts (dual Y-axis), resource distribution donut chart, and multi-account comparison chart based on Chart.js |
| **Local data storage** | All data is stored only in the browser's IndexedDB and is never uploaded to a remote server |
| **Backup and restore** | One-click export of a JSON backup file, with full restore from a backup file (overwrite import) |
| **Dark / Light theme** | Three modes — dark, light, and follow-system — driven by CSS variables with flicker-free switching |
| **Responsive design** | Fully adapted for desktop, tablet, and mobile, with a hamburger menu on mobile |
| **Bilingual UI** | Built-in Chinese / English, switchable at the bottom of the sidebar, with persisted state |
| **Cloudflare deployment** | Fully compatible with Cloudflare Pages static deployment + Worker API proxy |

### Data Collection Scope

The app collects the following usage data from the Cloudflare GraphQL Analytics API:

| Metric | Description | Source field |
|--------|-------------|--------------|
| Requests | Total daily HTTP requests | `httpRequestsAdaptiveGroups.count` |
| Workers Invocations | Daily Worker invocation count estimated from requests by a fixed ratio | Estimated in code as `requests × 0.08` |
| Bandwidth | Daily outbound bandwidth consumption (bytes) | `httpRequestsAdaptiveGroups.sum.bytes` |
| Page Views | Daily page view count estimated from requests by a fixed ratio | Estimated in code as `requests × 1.2` |
| Unique Visitors | Daily unique visitor count estimated from requests by a fixed ratio | Estimated in code as `requests × 0.35` |

> ⚠️ **About estimated metrics**: The Cloudflare free Analytics GraphQL endpoint does not directly return precise values for "Worker invocations / page views / unique visitors." This project makes a reasonable estimate based on request counts using fixed ratios, for trend display purposes. If on a given day the API returns a low real `bytes` value, the bandwidth also falls back to an estimated value (`requests × 2.5 × 1024` bytes). Accurate Worker / Page Views metrics require a paid Cloudflare Analytics product.

### Collection Frequency

| Mode | Description |
|------|-------------|
| Automatic collection | Configurable interval: 30 min / 1 hour / 6 hours / 12 hours / daily / disabled |
| Manual refresh | Click the "Refresh" button at the top to immediately fetch the latest data for all accounts |
| Historical lookback | Each collection automatically backfills data for the last 7 / 30 / 90 days |

---

## 3. Tech Stack

| Category | Technology | Description |
|----------|------------|-------------|
| Frontend framework | Vanilla JavaScript (ES6 modules / global objects) | Zero build dependencies, no Node.js compilation |
| UI styling | CSS3 + CSS variables | Theme system driven by CSS variables |
| Data visualization | Chart.js 4.4.1 | Loaded via CDN; line / donut / comparison charts |
| Local storage | IndexedDB (local built-in lightweight idb-compatible layer) | Structured storage with transactions and indexes |
| API proxy | Cloudflare Worker (ES Module format) | Solves browser CORS cross-origin restrictions |
| Deployment platform | Cloudflare Pages + Workers | Global CDN distribution, zero server maintenance |
| External dependencies | Chart.js (CDN), idb-compatible layer (local) | Both loaded via CDN / local vendor, no npm dependencies |

> `js/vendor/idb.js` is a locally bundled lightweight idb-compatible layer (a hand-written implementation whose API matches the official idb library), ensuring IndexedDB initializes normally in offline / Pages environments (avoiding the `idb is not defined` issue).

---

## 4. Project Structure

```
cloudflare request viewing/
├── index.html                  # Main page (single-page application SPA entry)
├── css/
│   └── style.css               # Global styles + dark/light theme variables
├── js/
│   ├── app.js                  # Main app logic, page routing, Toast, date utilities
│   ├── theme.js                # Theme management (dark/light/follow-system)
│   ├── i18n.js                 # Internationalization module (zh / en translation data + switching)
│   ├── db.js                   # IndexedDB storage layer wrapper (idb)
│   ├── api.js                  # Cloudflare API request wrapper (with Mock)
│   ├── usage.js                # Data collection and statistics module (depends on db, api)
│   ├── charts.js               # Chart.js chart rendering module
│   ├── accounts.js             # Multi-account management UI module
│   ├── backup.js               # Data backup and restore module
│   └── vendor/
│       └── idb.js              # Locally bundled idb-compatible layer
├── worker/
│   ├── worker.js               # Cloudflare Worker API proxy script
│   └── wrangler.toml           # Worker deployment configuration
├── wrangler.toml               # Cloudflare Pages deployment configuration
├── .gitignore                  # Git ignore rules
├── README.md             # Chinese documentation (this file)
├── README.en.md                # English documentation
└── README.md                   # Language switcher entry page
```

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `js/app.js` | Coordinates module initialization, SPA routing, top-bar refresh, Toast notifications, global date utilities (`getLocalDateString` / `parseLocalDate`), Mock data banner, and empty states |
| `js/theme.js` | Three theme modes (light/dark/system), `localStorage` persistence, listens for system theme changes, switches via the `data-theme` attribute |
| `js/i18n.js` | `TRANSLATIONS` bilingual dictionary + `I18n` utility, scans `[data-i18n]` nodes to render, remembers language via `localStorage`, button shows the "language it will switch to" in its own native name |
| `js/db.js` | CRUD for the three IndexedDB object stores, batch import/export, clearing, and storage statistics |
| `js/api.js` | Builds auth headers, requests Cloudflare via the Worker proxy or directly, GraphQL queries, parses results, Mock data generation and degradation |
| `js/usage.js` | Automatic collection timer, single / all-account collection, aggregated statistics, trend data, multi-account comparison data |
| `js/charts.js` | Trend chart (dual Y-axis), resource distribution donut chart, multi-account comparison chart; redraws with theme |
| `js/accounts.js` | Account card rendering, add/edit/delete, switch/refresh, form validation |
| `js/backup.js` | Export JSON, import restore (with confirmation), clear (with confirmation) |
| `worker/worker.js` | Accepts POST only, validates that the target URL must point to `api.cloudflare.com`, forwards auth headers, and appends CORS headers |

### Module Dependency Graph

```
theme.js ──┐
           ├──▶ app.js ──▶ page routing / UI updates / date utilities
db.js ─────┤
           │
api.js ────┤
           │
usage.js ──┘ (depends on db.js, api.js)
           │
charts.js ─┘ (depends on usage.js, theme.js, i18n.js, api.js)
           │
accounts.js ─┘ (depends on db.js, usage.js, app.js)
           │
backup.js ──┘ (depends on db.js, app.js)
```

---

## 5. How It Works

### 5.1 Data Collection Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Auto Timer  │────▶│  Check Interval│────▶│  Call GraphQL │────▶│  Save to IndexedDB │
│  /Manual Refresh│  │  Reached?      │     │  API          │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                           ┌──────────────┐
                                           │  Cloudflare  │
                                           │  GraphQL API │
                                           │              │
                                           │  Success → Parse  │
                                           │  Fail → Mock      │
                                           └──────────────┘
```

### 5.2 GraphQL Query

The app uses the Cloudflare GraphQL Analytics API (`POST https://api.cloudflare.com/client/v4/graphql`). The core query is as follows (see `getUsageData` in `js/api.js`):

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

- A single request pulls the full data for the entire time window (e.g., the last 30 days), avoiding sequential day-by-day requests (under CORS-restricted conditions, retrying day by day only creates many failures).
- If the batch request succeeds, the data is mapped to each day by local date (`getLocalDateString`); if it fails (CORS / 401 / 403, etc.), it degrades directly to Mock data.

### 5.3 Worker Proxy Principle

The browser cannot directly access `api.cloudflare.com` due to the same-origin policy. The Worker proxy pattern:

```
Browser App  ──POST {url, method, headers}──▶  Cloudflare Worker (Proxy)
                                                   │ Validate url must
                                                   │ start with
                                                   │ https://api.cloudflare.com/client/v4
                                                   │ forward Authorization / X-Auth-Email / X-Auth-Key
                                                   ▼
                                           api.cloudflare.com/client/v4/graphql
                                                   │
                                                   ▼
                                           Worker attaches CORS headers to response and returns
```

Key Worker behaviors (see `worker/worker.js`):

- Accepts `POST` only (other methods return 405), and returns CORS headers directly for `OPTIONS` preflight requests;
- Validates that the `url` in the request body must start with `https://api.cloudflare.com/client/v4`, otherwise returns 400 (to prevent it from being used as an open proxy);
- Forwards only the three auth headers: `Authorization`, `X-Auth-Email`, `X-Auth-Key`;
- Always appends CORS headers such as `Access-Control-Allow-Origin: *` to the response.

> ⚠️ Because the Worker forwards your `Authorization` header to Cloudflare as-is, use it only on a Worker you control. **The Worker does not log, cache, or store your Token.**

### 5.4 Degradation (Mock) Mechanism

When no Worker proxy is configured, or when an API request fails:

- `CF_API.getUsageRange` returns randomly generated Mock data by date (requests 3000–8000, other metrics estimated proportionally);
- A yellow banner "Currently displaying mock data" is shown at the top of the dashboard;
- Usage records are marked `isMock: true` and do not pollute real statistics (aggregation merges by date: real records take precedence per day, and Mock is only used as a fallback for dates with no real data);
- Mock data is written to IndexedDB only during refresh, and can be overwritten by real data after a refresh.

---

## 6. Quick Start (5 Steps)

> **First time using it? Follow these 5 steps exactly to see real data.**

### Prerequisites

- A Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- At least one domain added to Cloudflare (the Analytics API requires a domain under the account)
- Optionally install Node.js 18+ locally (for deploying the Worker) or Python 3 (for local preview)

---

### Step 1: Get Your Cloudflare Account ID

The Account ID is the unique identifier for your Cloudflare account, in the format of a **32-character hexadecimal string** (e.g., `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`).

**How to get it (choose one):**

#### Method A: Domain Overview page (most common)

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the left sidebar, click any added domain → go to "Overview"
3. Find the **API** section in the right-hand info panel
4. Click the "Copy" button next to **Account ID**

#### Method B: Workers & Pages page

1. Log in to the Dashboard → left **Build** → **Compute** → **Workers and Pages**
2. Find **Account Details** on the right
3. The **Account ID** is shown below — copy it

#### Method C: Browser developer tools

1. Log in to the Dashboard and press **F12**
2. In the **Network** tab, find any request to `api.cloudflare.com`
3. Look at the `/accounts/{accountId}` portion of the request URL

> Verify the format (run in the browser Console):
> ```javascript
> /^[a-f0-9]{32}$/.test('yourAccountId') // returns true if the format is correct
> ```

---

### Step 2: Create a Cloudflare API Token

The API Token is used for programmatic access to the Cloudflare API. Following the principle of least privilege, it is more secure than the Global API Key.

#### Step 1: Go to the API Token management page

- Top-right avatar → **My Profile** → **API Tokens**
- Or directly visit: https://dash.cloudflare.com/profile/api-tokens

#### Step 2: Create a custom Token

1. Click **Create Token** → choose **Create Custom Token**
2. Token name: e.g., `CF Usage Tracker`
3. **Permission configuration (critical)**:

   | Permission group | Resource | Permission level |
   |------------------|----------|------------------|
   | Account | Analytics | Read |
   | Zone | Analytics | Read |

4. **Resource scope**: Include → Specific account → select your account
5. (Optional) IP address filter, Token expiration (recommend 6–12 months)
6. Click **Continue**

#### Step 3: Generate and save

1. After confirming permissions, click **Create Token**
2. ⚠️ **The Token is shown only once!** Copy it immediately and save it to a password manager

#### Step 4: Verify (optional)

On the token list, click the token and confirm its status is "Active" and its permissions include Account + Zone Analytics Read.

---

### Step 3: Deploy the Worker Proxy (Solve CORS)

> **Why is this needed?** The browser same-origin policy blocks the frontend from requesting `api.cloudflare.com` directly. Deploying a Cloudflare Worker as an intermediary proxy bypasses this.
> **Don't want to deploy yet?** The app will automatically use Mock data, so you can experience the UI first.

#### 3.1 Install the Wrangler CLI

```bash
node --version        # requires 18+
npm install -g wrangler
wrangler login        # authorize in browser
```

#### 3.2 Deploy the Worker

```bash
cd "cloudflare request viewing/worker"
wrangler deploy
```

After success, the terminal outputs something like:

```
 ⛅️ Worker deployed successfully
 📦 Version ID: abc123...
 🔗 URL: https://cf-tracker-proxy-worker-xxxx.workers.dev
```

**Copy this `.workers.dev` address.**

#### 3.3 Configure the proxy address in the app

1. Open the app (Pages address or local `http://localhost:3000`)
2. Go to the sidebar **Settings**
3. Paste the Worker URL into the **API Proxy Address** input box
4. On blur / when switching pages it is saved automatically to IndexedDB

---

### Step 4: Add an Account in the App

1. Sidebar **Account Management**
2. Click **+ Add Account** at the top right
3. Fill in the form:

   | Field | Required | Description |
   |-------|----------|-------------|
   | Account name | ✅ | For easy identification, e.g., "Production" |
   | Cloudflare Account ID | ✅ | 32-character hexadecimal ID |
   | API Token | ✅ | Required for API Token mode (created in Step 2) |
   | API Email | ⬜ | Only needed in Global API Key mode (together with API Key) |
   | API Key | ⬜ | Only needed in Global API Key mode (together with API Email) |

4. Click **Save** (the first account is set as current automatically)

> Auth fields: when using the **API Token** (recommended), only the "API Token" is required and the API Email / API Key can be left blank; when using the **Global API Key**, both "API Email" and "API Key" must be filled in.

---

### Step 5: Fetch Usage Data

1. In **Account Management**, find the account card and click **🔄 Refresh**
2. The top notification shows:
   - ✅ "Data updated successfully" → real data
   - ⚠️ "Mock data is being used" → Worker not configured or API failed
3. Switch to the **Dashboard** to view the data

If you see the yellow banner "Currently displaying mock data": check the Worker address, Token, and Account ID, and view the error in the Console (F12).

---

## 7. Run Locally

The app is pure static files — just start an HTTP server:

### Method 1: Python

```bash
cd "cloudflare request viewing"
python -m http.server 3000
# visit http://localhost:3000 in your browser
```

### Method 2: Node.js http-server

```bash
npx http-server -p 3000
```

### Method 3: Open directly

Opening `index.html` directly also works, but under the `file://` protocol IndexedDB may be restricted — using an HTTP server is recommended.

> **Note**: When running locally, browser CORS may block direct requests to the Cloudflare API, in which case the app automatically uses Mock data. To get real data, deploy the Worker proxy.

---

## 8. Deployment Guide

### 8.1 Deploy the Pages Frontend

#### Method 1: Cloudflare Dashboard (recommended for beginners)

1. Dashboard → **Workers & Pages** → **Create application** → **Pages**
2. Choose **Upload assets**
3. Project name such as `cf-usage-tracker`
4. Upload all files in the root directory (including `index.html`, `css/`, `js/`, etc.)
5. Click **Deploy**, and get `https://cf-usage-tracker.pages.dev`

#### Method 2: Wrangler CLI

```bash
npm install -g wrangler
wrangler login
cd "cloudflare request viewing"
wrangler pages deploy . --project-name=cf-usage-tracker
```

#### Method 3: Git connection

1. Push to GitHub/GitLab
2. In Pages, choose **Connect to Git**, leave the build command blank, output directory `/`
3. **Save and Deploy**

> This repository's root already provides `wrangler.toml` (Pages configuration) using `public_output = "."`, with no build step required.

### 8.2 Deploy the Worker API Proxy

```bash
cd "cloudflare request viewing/worker"
wrangler deploy
```

After deployment, fill the output Worker URL into the app's **Settings → API Proxy Address**.

### 8.3 Custom Domain

#### Pages custom domain

Dashboard → Pages project → **Custom domains** → enter the domain → add the CNAME.

#### Worker custom route

Edit `worker/wrangler.toml`:

```toml
name = "cf-tracker-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

Then `wrangler deploy`.

---

## 9. User Guide (Detailed Steps)

> This guide assumes you have completed deployment and basic configuration per Chapters 6 / 8, and explains each page in turn with click paths and typical scenarios.

### 9.1 Dashboard

The dashboard is the default home page and shows the usage overview of the "current account."

#### Page Elements

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ Mock data notice (shown only when Mock data)              │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐           │
│  │ Today Requests │ │ Worker Invocations │ │ Month Requests │ │ Bandwidth│   │
│  │ 5,404    │ │ 432      │ │ 142,500  │ │ 3.2 GB │           │
│  │ ████░░  │ │ ██░░░░  │ │ cumulative│ │ this month│         │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Request Trend (last 30 days)   [7d][30d][90d]          │  │
│  │  📈 Line chart: Requests (left axis) + Worker (right axis)│
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐ ┌───────────────────────────────┐  │
│  │ Resource Distribution (donut)│ Usage Details (table, last 10 days) │
│  │ Requests / Worker / Bandwidth│ Date  Requests  Worker  Bandwidth  Status│
│  │ / Page Views  ratio   │ ...                              │  │
│  └──────────────────────┘ └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Operation Flow

1. **Switch account**: click the account name in the top bar, or click "Set as current" on the Account Management page.
2. **Switch time range**: use the dropdown above the trend chart to select 7 / 30 / 90 days.
3. **Refresh data**: click 🔄 in the top bar (refreshes all accounts).
4. **View detail table**: the table shows the last 10 days in reverse date order; Mock rows carry a "Mock" badge, and no-traffic days show "No traffic."

#### Meaning of the Stat Cards

| Card | Meaning | Progress bar |
|------|---------|--------------|
| Today Requests | Cumulative HTTP requests for the day | Percentage of the 100,000 quota |
| Worker Invocations | Worker invocations for the day (estimated) | Percentage of the 100,000 quota |
| Month Requests | Cumulative requests for the current month | None (shows monthly total) |
| Bandwidth | Cumulative outbound bandwidth for the current month | None (shows total bytes, auto-converted B/KB/MB/GB/TB) |

#### Scenario Example: Judging Whether Today's Traffic Is Abnormal

- Look at whether the "Today Requests" progress bar approaches 100% (i.e., near 100,000);
- Select 30 days in the trend chart and observe whether today spikes relative to history;
- If today is low, that is normal (Cloudflare data has about a 1-hour delay and is completed the next day).

---

### 9.2 Account Management

#### View the list

Go to "Account Management" to see all account cards. Each card shows: today's requests, monthly cumulative, Workers, number of recorded days, and "Set as current / Edit / Refresh / Delete" buttons; the current account carries a green "Current" badge.

#### Add an account (click path)

1. **+ Add Account** at the top right
2. In the popup, fill in: account name, account ID, API Token (or "API Email + API Key" in Global API Key mode)
3. **Save**

#### Edit an account

1. Card **Edit** → popup prefilled with original values
2. **Save** after modifying

#### Switch the current account

1. Target card **Set as current**
2. The card highlights, and the dashboard immediately switches to that account's data

#### Refresh a single account

1. Card **Refresh**
2. The account re-pulls data, and the card statistics update

#### Delete an account

1. Card **Delete** → confirmation popup
2. ⚠️ All usage records for that account are deleted together
3. If the deleted account was the current one, the system automatically sets the first remaining account as current

#### Scenario Example: Team Multi-Client Management

- Create an account for each client (e.g., "Client A", "Client B");
- Compare traffic horizontally on the "Multi-Account Comparison" page;
- Switch the "current" account to view each one's dashboard.

---

### 9.3 Multi-Account Comparison

This page lets you view multiple accounts at the same time for horizontal comparison.

#### Operation Flow

1. Sidebar **Multi-Account Comparison**
2. Select metric: **Requests / Worker Invocations / Bandwidth**
3. Select range: **Today / Last 7 days / Last 30 days (default)**
4. The line chart + summary table update automatically

#### Summary Table Fields

| Field | Description |
|-------|-------------|
| Account | Account name |
| Total Requests | Cumulative requests in range |
| Worker Invocations | Cumulative Worker invocations in range (estimated) |
| Bandwidth | Cumulative bandwidth in range |
| Active Days | Number of days with traffic (requests > 0) in range |

#### Scenario Example

- Compare production / testing environment traffic differences;
- Compare resource consumption across different clients;
- Verify whether a traffic spike is related to an event (look at the line chart inflection point).

---

### 9.4 Data Management

#### Export Backup

1. **Data Management** → **Export Data**
2. The browser downloads `cf-tracker-backup-<timestamp>.json`
3. The file contains three sections: `accounts`, `usageRecords`, `settings`

```json
{
  "version": 1,
  "exportedAt": "2026-08-13T14:30:00.000Z",
  "accounts": [ { "id": 1, "name": "Production", "accountId": "abc...", "apiToken": "abc...", "isActive": true, "createdAt": "..." } ],
  "usageRecords": [ { "id": 1, "accountId": 1, "date": "2026-08-13", "requests": 5404, "workersInvocations": 432, "bandwidth": 3435973836, "isMock": false, "fetchedAt": "..." } ],
  "settings": [ { "key": "workerUrl", "value": "https://..." }, { "key": "autoFetchInterval", "value": "60" } ]
}
```

> ⚠️ The backup file contains your **API Token in plaintext** — keep it safe and do not commit it to a public repository.

#### Import Restore

1. **Import Data** → select the backup `.json`
2. The confirmation box shows the number of accounts / records
3. After confirming, **overwrite** all current data and refresh the interface

> ⚠️ Import overwrites existing data! It is recommended to export a backup first.

#### Clear Data

1. **Clear All Data**
2. First confirmation → second confirmation ("Are you sure you want to clear?")
3. After confirming, all data is erased (unrecoverable)

#### Storage Statistics

The bottom of the page shows: number of accounts, number of usage records, last sync time, and IndexedDB bytes used.

---

### 9.5 Settings

#### Appearance Settings (Theme)

| Option | Behavior |
|--------|----------|
| Light | Fixed light |
| Dark | Fixed dark |
| Follow System (default) | Follow the operating system |

**How to switch**:
- Quick: the 🌙/☀️ button at the bottom of the sidebar, click to cycle light → dark → system;
- Detailed: Settings page → Appearance Settings → click the corresponding option.

#### Data Collection Settings

| Setting | Options |
|---------|---------|
| Auto-collection interval | Disabled / 30 min / 1 hour (default) / 6 hours / 12 hours / daily |
| Collection history days | Last 7 days / 30 days (default) / 90 days |

Takes effect immediately after modification (the auto-collection timer is rebuilt with the new interval).

#### Deployment Info (API Proxy Address)

- Fill in the Worker URL (starts with `https://`, usually ending in `.workers.dev`);
- Left blank → browser direct connection may be blocked by CORS, and the app uses Mock;
- Takes effect immediately after modification, no restart needed.

---

### 9.6 UI Language and Theme Switching

- **Language**: the 🌐 button at the bottom of the sidebar; click to switch between 中文 / English. The selection is persisted in `localStorage` (key `cf_tracker_lang`). The button shows the "language it will switch to" in its own native name (the Chinese UI shows "English", the English UI shows "中文").
- **Theme**: the 🌙/☀️ button in the same area, or choose it on the Settings page.

---

## 10. Data Collection Details

### Collection Strategy

- **Batch fetch**: a single GraphQL request retrieves the data for the entire time window, reducing API calls.
- **Degradation mechanism**: on API failure, Mock is generated automatically to keep the UI previewable.
- **Deduplication strategy**: before each collection, `deleteUsageRecords(account.id)` is called, then `addUsageRecords`, to avoid duplicates.
- **Failure isolation**: a single account failure does not affect other accounts (see `UsageTracker.fetchAllAccounts`).

### Auto-Collection Interval Calculation

| Setting value (min) | Actual interval (ms) | Calls per day | Calls per month |
|---------------------|----------------------|---------------|-----------------|
| 30 | 1,800,000 | 48 | ~1,440 |
| 60 (default) | 3,600,000 | 24 | ~720 |
| 360 | 21,600,000 | 4 | ~120 |
| 720 | 43,200,000 | 2 | ~60 |
| 1440 | 86,400,000 | 1 | ~30 |

> The free Workers tier allows 100,000 requests per day; this project's Worker only forwards, consuming very little.

### Data Latency

| Data type | Latency |
|-----------|---------|
| Real-time data | Appears after ~1 hour |
| Accurate data | Stabilizes after ~24 hours |
| Today's data | Incomplete, completed the next day |

---

## 11. Data Storage Solution

### Storage Architecture

```
Browser
 ├─ IndexedDB (cf_tracker_db, v1)
 │   ├─ accounts       (keyPath id, autoIncrement; indexes name, isActive)
 │   ├─ usage_records  (keyPath id, autoIncrement; indexes accountId, date)
 │   └─ app_settings   (keyPath key)
 └─ localStorage
     ├─ cf_tracker_theme  (light/dark/system)
     └─ cf_tracker_lang    (zh/en)
```

### Privacy Guarantee

- Data is stored only in the local browser and is never uploaded to any remote server;
- The only network requests are read-only queries to the Cloudflare API;
- The API Token is stored locally only and is never stored/logged by the Worker;
- The Worker proxy only forwards — it does not cache or log.

### Storage Capacity

- IndexedDB limits are typically 50%+ of available disk;
- A single usage record is about 200–300 bytes; 1,000 records is about 300KB, so day-to-day use will not hit the ceiling.

### Usage Record Fields

| Field | Type | Description |
|-------|------|-------------|
| id | number | Auto-increment primary key |
| accountId | number | Associated account |
| date | string | Local date `YYYY-MM-DD` |
| requests | number | HTTP request count |
| workersInvocations | number | Worker invocations (estimated) |
| bandwidth | number | Outbound bandwidth (bytes) |
| pageViews | number | Page views (estimated) |
| uniqueVisitors | number | Unique visitors (estimated) |
| isMock | boolean | Whether mock data |
| fetchedAt | string | ISO collection time |
| rawData | object | Raw API data |

### Bandwidth Conversion

Internally unified in bytes; automatically converted at display time: B → KB → MB → GB → TB (1024-based).

---

## 12. API Authentication Explained

### Comparison of Two Methods

| Comparison item | API Token (recommended) | Global API Key (not recommended) |
|-----------------|-------------------------|----------------------------------|
| Security | High (least privilege) | Low (full-account privilege) |
| Required fields | Account ID + API Token | Account ID + API Key + Email |
| Expiration | Can be set to expire | Permanent (unless reset) |
| Use case | Daily / team | Temporary testing |

### API Token Creation

See [Step 2](#step-2-create-a-cloudflare-api-token). Requires Account + Zone Analytics **Read**.

### Global API Key (not recommended)

Dashboard → My Profile → API Tokens → bottom **API Keys** → **Global API Key** → View (requires secondary password). When filling in the app, both "API Email" and "API Key" are required.

> ⚠️ The Global API Key has full control over the account; if leaked it can lead to complete loss of control, so it is strongly discouraged.

### Authentication Request Example

The app initiates the request through the Worker proxy (see `js/api.js` and `worker/worker.js`):

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

The Worker response appends:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Email, X-Auth-Key
```

### Troubleshooting Authentication Issues

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token wrong/expired | Recreate Token |
| 403 Forbidden | Insufficient permission | Add Analytics Read |
| 404 Not Found | Account ID wrong | Re-confirm ID |
| CORS Error | Worker not configured | Deploy and fill in address |
| Timeout | Network / rate limiting | Retry |

---

## 13. Configuration Reference

### App Settings (IndexedDB `app_settings`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `workerUrl` | string | `''` | Worker proxy address |
| `autoFetchInterval` | number (min) | `60` | Auto-collection interval, 0 = disabled |
| `fetchHistoryDays` | number | `30` | Historical lookback days |
| `lastSync` | string (ISO) | `null` | Last sync time |

### Theme (localStorage)

| Key | Value |
|-----|-------|
| `cf_tracker_theme` | light / dark / system |
| `cf_tracker_lang` | zh / en |

### Worker Configuration (`worker/wrangler.toml`)

```toml
name = "cf-tracker-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"
# routes = [{ pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }]
```

### Pages Configuration (`wrangler.toml`)

```toml
name = "cf-usage-tracker"
compatibility_date = "2024-01-01"
public_output = "."
# routes = [{ pattern = "your-domain.pages.dev/*" }]
```

---

## 14. FAQ

**Q1: The refresh shows "Failed to fetch data" — what should I do?**
Troubleshoot in order: ① Are the Account ID / Token complete; ② Is the Worker address filled in and reachable; ③ Does the Token permission include Analytics Read; ④ Console errors (CORS/401/403/404); ⑤ Is there at least one domain under the account.

**Q2: The yellow banner "Currently displaying mock data"?**
API failure degradation. Check the Worker address, Token, and Account ID; you can temporarily use Mock to experience the UI.

**Q3: Is the API Token secure?**
Stored only in local IndexedDB; transmitted over HTTPS; the Worker does not log it; least privilege + periodic rotation is recommended.

**Q4: Account ID format?**
32-character hexadecimal `a-f0-9`, not an email, not a Zone ID.

**Q5: Can I use it on mobile?**
Yes, responsive; mobile and desktop data are independent (different browsers = different data), and backups can be used for migration.

**Q6: Will data be lost?**
No: normal browser close, clearing cookies/cache, or code update. Yes: manually clearing site data, uninstalling the browser, incognito mode, insufficient disk, or manual clearing.

**Q7: Which browsers are supported?**
Chrome/Edge 80+, Firefox 75+, Safari 14+, requiring IndexedDB 2.0+, CSS variables, and Fetch.

**Q8: Is the Worker required?**
Strongly recommended for Pages/other hosting; recommended for local localhost; not required for temporary preview (Mock).

**Q9: How do I update the app?**
Re-upload / Pages Git / Wrangler to deploy the frontend; `cd worker && wrangler deploy` to update the Worker. IndexedDB data is unaffected.

**Q10: Can the free tier be used?**
Fully compatible. Workers free 100k/day; this project consumes very little.

**Q11: How do I manage multiple accounts?**
Add them one by one in Account Management; "Set as current" to switch; Multi-Account Comparison for horizontal viewing; top-bar refresh to batch-pull.

**Q12: How long is the data delay?**
Real-time ~1h, accurate ~24h, today incomplete and completed the next day.

**Q13: How do I clear and start over?**
Export backup first → Clear all data → reconfigure → import restore if necessary.

---

## 15. Development Guide

### Local Debugging

```bash
python -m http.server 3000
```

You can debug directly in the browser Console:

```javascript
DB.getAccounts()                 // all accounts
DB.getStats()                    // storage statistics
ThemeManager.apply('dark')       // switch theme
UsageTracker.getSummary(1)       // account 1 summary
I18n.toggle()                    // switch language
```

### Add a New Metric

1. Add the field to the GraphQL query in `js/api.js`;
2. Parse it in `parseUsageResultByDate`;
3. Expose it via `getTrendData` in `js/usage.js`;
4. Render it in `js/charts.js`.

### Add a New Chart

1. Add a `<canvas>` in `index.html`;
2. Add a render method in `js/charts.js`;
3. Call it from the corresponding page in `js/app.js`.

### Custom Theme

Edit the `:root` and `[data-theme="dark"]` CSS variables in `css/style.css` (such as `--accent`).

### Notes

- All dates use `getLocalDateString` / `parseLocalDate` (local timezone, to avoid UTC misalignment);
- idb v8 uses `tx.objectStore(name)` instead of `tx.store`;
- Changing `DB_VERSION` triggers an `upgrade`, so pay attention to data migration.

---

## 16. License

This project may be freely used, modified, and distributed.

---

## 17. Support

### Quick Checklist

```
✅ 1. Added a Cloudflare account
✅ 2. Account ID is 32-character hexadecimal
✅ 3. API Token is valid and includes Analytics Read
✅ 4. Worker is deployed and the address is correct (opens in a new tab)
✅ 5. Worker address is filled in Settings
✅ 6. At least one domain under the account
✅ 7. Browser supports IndexedDB
✅ 8. F12 Console / Network to view errors
```

### Error Message Quick Reference

| Message | Meaning | Solution |
|---------|---------|----------|
| Failed to fetch data | API failure | Check config/Worker/Token |
| Mock data is being used | Cannot connect to API | Configure Worker |
| 401 | Token invalid | Recreate |
| 403 | Insufficient permission | Add Read |
| 404 | Account ID wrong | Re-confirm |
| CORS Error | Cross-origin | Use Worker |
| net::ERR_ABORTED | Request aborted | Check network |

### When Reporting an Issue, Please Provide

Browser / OS / deployment method / Worker status / error screenshot / account type / number of domains / timezone.

---

## 18. Recent Updates

This section records recent code and documentation maintenance — mainly code-quality, deduplication, and documentation-accuracy improvements. It does not change the data model or existing storage structure:

- **Documentation fix**: `usage_records` only creates the `accountId` and `date` indexes; the previously documented (non-existent) compound index `[accountId,date]` has been corrected.
- **Dead code cleanup**: Removed the never-called `DB.getUsageRecordCount()`, `DB.deleteSetting()`, and `App.escapeHtml()`.
- **Deduplication**: `formatBytes` now consistently reuses `CF_API.formatBytes`; the duplicate `App.escapeHtml` implementation was removed (`AccountManager.escapeHtml` is kept).
- **More precise query window**: The lower bound of `DB.getUsageRecords(days)` was changed from `today - days` to `today - days + 1`, so "last N days" now precisely covers N days including today, matching the fetch window.
- **Locale-aware number formatting**: `CF_API.formatNumber` now selects the `zh-CN` / `en-US` locale based on the current UI language, updating number formatting when the language is switched.

## 19. Code Fixes

- Fixed `js/db.js`: `deleteAccount` and `setActiveAccount` functions were modified to avoid premature transaction commits by moving reads outside transactions.
- Fixed `js/charts.js`: Trend chart tooltips incorrectly used `formatBytes` for request and worker counts; changed to use `formatNumber`.

---

> 🇨🇳 **想要中文版？** Open [README.md](./README.md) for the full Chinese documentation.
