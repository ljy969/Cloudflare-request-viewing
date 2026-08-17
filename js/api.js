// ===== Cloudflare API 模块 =====
// 封装 Cloudflare GraphQL Analytics API 调用
// 支持 Worker 代理（推荐）和直接请求（可能遇到 CORS）两种模式

const CF_API = {
  BASE_URL: 'https://api.cloudflare.com/client/v4',

  async getWorkerUrl() {
    return await DB.getSetting('workerUrl', '');
  },

  // 构建带认证头的请求
  buildHeaders(account) {
    const headers = { 'Content-Type': 'application/json' };
    if (account.apiToken) {
      headers['Authorization'] = `Bearer ${account.apiToken}`;
    } else if (account.apiEmail && account.apiKey) {
      headers['X-Auth-Email'] = account.apiEmail;
      headers['X-Auth-Key'] = account.apiKey;
    }
    return headers;
  },

  // 获取账户级别的使用数据
  // 使用 Cloudflare GraphQL Analytics API
  // 仅依赖 httpRequestsAdaptiveGroups（带 date 维度）同时取 count 与 bytes，
  // 避免对已弃用/旧版数据集（如 httpRequests1dGroups）的依赖，提升稳定性。
  async getUsageData(account, startDate, endDate) {
    const query = `
      query GetUsage($accountId: String!, $since: String!, $until: String!) {
        viewer {
          accounts(filter: { accountTag: $accountId }) {
            httpRequestsAdaptiveGroups(
              filter: { dateRange: { since: $since, until: $until } }
            ) {
              count
              dimensions {
                date
              }
              sum {
                bytes
              }
            }
          }
        }
      }
    `;

    const variables = {
      accountId: account.accountId,
      since: startDate,
      until: endDate
    };

    try {
      const workerUrl = await this.getWorkerUrl();
      const endpoint = `${this.BASE_URL}/graphql`;
      const headers = this.buildHeaders(account);

      let data;
      if (workerUrl) {
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: endpoint,
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables })
          })
        });

        if (!response.ok) throw new Error(`GraphQL 代理请求失败 (HTTP ${response.status})`);
        data = await response.json();
      } else {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables })
        });

        if (!response.ok) throw new Error(`GraphQL 请求失败 (HTTP ${response.status})`);
        data = await response.json();
      }

      if (data.errors && data.errors.length > 0) {
        console.debug('GraphQL 返回错误:', data.errors);
        return null;
      }

      return data.data;
    } catch (error) {
      console.debug('GraphQL 请求失败 (可能是 CORS):', error.message);
      return null;
    }
  },

  // 获取多天的使用数据
  // 优化策略：批量调用 → 失败则快速降级为 Mock 数据，避免 30 次串行请求
  async getUsageRange(account, days = 30) {
    const today = new Date();
    const endDate = getLocalDateString(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = getLocalDateString(startDate);

    // 1. 尝试一次性批量获取所有天的数据
    //    since/until 使用带 Z 的 ISO 时间戳，避免 Cloudflare 以 UTC 解析裸日期导致跨时区错位/漏掉首尾一天
    const sinceISO = `${startDateStr}T00:00:00Z`;
    const untilISO = `${endDate}T23:59:59Z`;
    const graphqlResult = await this.getUsageData(account, sinceISO, untilISO);

    if (graphqlResult) {
      const parsed = this.parseUsageResultByDate(graphqlResult, startDate, today);
      if (parsed && parsed.length > 0) {
        return parsed.map(d => ({ ...d, isMock: false }));
      }
    }

    // 2. 批量获取失败 → 直接生成所有天的 Mock 数据
    //    不再逐天重试（在 CORS 环境下逐天重试只会导致 30 次失败）
    console.debug('[CF_API] 批量获取失败，使用模拟数据');
    return this.generateMockRange(today, days);
  },

  // 批量生成 Mock 数据
  generateMockRange(endDate, days) {
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      results.push(this.getMockData(date, true));
    }
    return results;
  },

  // 按日期解析 GraphQL 结果
  parseUsageResultByDate(result, startDate, endDate) {
    if (!result || !result.viewer || !result.viewer.accounts) return null;

    // 创建日期映射
    const dateMap = {};
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = getLocalDateString(cursor);
      dateMap[key] = { date: key, requests: 0, bandwidth: 0, bytesPresent: false };
      cursor.setDate(cursor.getDate() + 1);
    }

    // 遍历所有账户的请求数据（仅使用 httpRequestsAdaptiveGroups）
    result.viewer.accounts.forEach(account => {
      const groups = account.httpRequestsAdaptiveGroups || [];
      groups.forEach(g => {
        if (g.dimensions && g.dimensions.date) {
          const dateKey = g.dimensions.date.split('T')[0];
          if (dateMap[dateKey]) {
            dateMap[dateKey].requests += g.count || 0;
            if (g.sum && typeof g.sum.bytes === 'number') {
              dateMap[dateKey].bandwidth += g.sum.bytes;
              dateMap[dateKey].bytesPresent = true;
            }
          }
        }
      });
    });

    // 转换为数组
    return Object.values(dateMap).map(d => ({
      date: d.date,
      requests: d.requests,
      workersInvocations: Math.floor(d.requests * 0.08),
      bandwidth: d.bytesPresent ? d.bandwidth : Math.floor(d.requests * 2.5 * 1024),
      pageViews: Math.floor(d.requests * 1.2),
      uniqueVisitors: Math.floor(d.requests * 0.35),
      isMock: false,
      fetchedAt: new Date().toISOString()
    }));
  },

  // Mock 数据（API 不可用时使用）
  getMockData(date, isMock = true) {
    const baseRequests = 3000 + Math.floor(Math.random() * 5000);
    return {
      date: getLocalDateString(date),
      requests: baseRequests,
      workersInvocations: Math.floor(baseRequests * 0.08) + Math.floor(Math.random() * 500),
      bandwidth: Math.floor(baseRequests * 1024 * 2.5),
      pageViews: Math.floor(baseRequests * 1.2),
      uniqueVisitors: Math.floor(baseRequests * 0.35),
      isMock,
      fetchedAt: new Date().toISOString()
    };
  },

  // ===== 工具方法 =====
  formatBytes(bytes) {
    if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    // 限制 i 在合法范围内，避免 (0,1) 字节导致 sizes[-1] 为 undefined
    const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(k))));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatNumber(num) {
    if (num === undefined || num === null) return '--';
    const locale = I18n.getCurrent() === 'en' ? 'en-US' : 'zh-CN';
    return new Intl.NumberFormat(locale).format(num);
  }
};
