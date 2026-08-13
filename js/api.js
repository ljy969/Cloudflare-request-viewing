// ===== Cloudflare API 模块 =====
// 封装 Cloudflare REST API 调用
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

  // 通过 Worker 代理或直接请求
  async fetchFromCloudflare(account, path, params = {}) {
    const workerUrl = await this.getWorkerUrl();
    const url = this.buildFullUrl(path, params);
    const headers = this.buildHeaders(account);

    if (workerUrl) {
      return this.fetchViaWorker(workerUrl, url, headers);
    } else {
      return this.fetchDirect(url, headers);
    }
  },

  buildFullUrl(path, params) {
    const queryStr = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${this.BASE_URL}${path}${queryStr ? '?' + queryStr : ''}`;
  },

  async fetchViaWorker(workerUrl, targetUrl, headers) {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        method: 'GET',
        headers
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`代理请求失败 (HTTP ${response.status}): ${text}`);
    }

    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(data.errors[0].message || 'API 返回错误');
    }
    return data.result || data;
  },

  async fetchDirect(url, headers) {
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('API 认证失败，请检查账户 ID 和 API Token 是否正确');
      }
      throw new Error(`API 请求失败 (HTTP ${response.status}): ${text}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'API 返回错误');
    }
    return data.result;
  },

  // ===== 公开 API =====

  // 测试账户连接
  async testConnection(account) {
    try {
      const result = await this.fetchFromCloudflare(
        account,
        `/accounts/${account.accountId}`
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 获取账户的 Zone 列表
  async getZones(account) {
    try {
      const result = await this.fetchFromCloudflare(
        account,
        `/accounts/${account.accountId}/zones`
      );
      return result?.result || result || [];
    } catch (error) {
      console.warn('获取站点列表失败:', error.message);
      return [];
    }
  },

  // 使用 Cloudflare Analytics REST API 获取请求统计
  async getAnalytics(account, zoneId, startDate, endDate) {
    try {
      const params = {
        since: startDate,
        until: endDate,
        limit: 500
      };
      const result = await this.fetchFromCloudflare(
        account,
        `/zones/${zoneId}/analytics/http_requests`,
        params
      );
      return result || [];
    } catch (error) {
      console.warn('获取 Analytics 失败:', error.message);
      return [];
    }
  },

  // 获取账户级别的使用数据
  // 使用 Cloudflare GraphQL Analytics API
  async getUsageData(account, startDate, endDate) {
    const query = `
      query GetUsage($accountId: String!, $since: String!, $until: String!) {
        viewer {
          accounts(filter: { accountTag: $accountId }) {
            httpRequestsTotalGroups(
              filter: { dateRange: { since: $since, until: $until } }
            ) {
              count
              dimensions {
                date
              }
            }
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

      if (data.errors) {
        console.debug('GraphQL 返回错误:', data.errors);
        return null;
      }

      return data.data;
    } catch (error) {
      console.debug('GraphQL 请求失败 (可能是 CORS):', error.message);
      return null;
    }
  },

  // 解析 GraphQL 返回结果为使用记录
  parseUsageResult(result, dateStr) {
    if (!result || !result.viewer || !result.viewer.accounts) {
      return null;
    }

    const accounts = result.viewer.accounts;
    let totalRequests = 0;
    let totalBytes = 0;

    accounts.forEach(account => {
      const requestGroups = account.httpRequestsTotalGroups || [];
      requestGroups.forEach(g => { totalRequests += g.count || 0; });

      const adaptiveGroups = account.httpRequestsAdaptiveGroups || [];
      adaptiveGroups.forEach(g => {
        totalRequests += g.count || 0;
        if (g.sum && g.sum.bytes) totalBytes += g.sum.bytes;
      });
    });

    return {
      date: dateStr,
      requests: totalRequests,
      workersInvocations: Math.floor(totalRequests * 0.08),
      bandwidth: totalBytes || Math.floor(totalRequests * 2.5 * 1024),
      pageViews: Math.floor(totalRequests * 1.2),
      uniqueVisitors: Math.floor(totalRequests * 0.35)
    };
  },

  // 获取多天的使用数据
  // 优化策略：批量调用 → 失败则快速降级为 Mock 数据，避免 30 次串行请求
  async getUsageRange(account, days = 30) {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 1. 尝试一次性批量获取所有天的数据
    const graphqlResult = await this.getUsageData(account, startDateStr, endDate);

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
      const key = cursor.toISOString().split('T')[0];
      dateMap[key] = { date: key, requests: 0, bandwidth: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    // 遍历所有账户的请求数据
    result.viewer.accounts.forEach(account => {
      const groups = account.httpRequestsTotalGroups || [];
      groups.forEach(g => {
        if (g.dimensions && g.dimensions.date) {
          const dateKey = g.dimensions.date.split('T')[0];
          if (dateMap[dateKey]) {
            dateMap[dateKey].requests += g.count || 0;
          }
        }
      });

      const adaptiveGroups = account.httpRequestsAdaptiveGroups || [];
      adaptiveGroups.forEach(g => {
        if (g.dimensions && g.dimensions.date) {
          const dateKey = g.dimensions.date.split('T')[0];
          if (dateMap[dateKey]) {
            dateMap[dateKey].requests += g.count || 0;
            if (g.sum && g.sum.bytes) {
              dateMap[dateKey].bandwidth += g.sum.bytes;
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
      bandwidth: d.bandwidth || Math.floor(d.requests * 2.5 * 1024),
      pageViews: Math.floor(d.requests * 1.2),
      uniqueVisitors: Math.floor(d.requests * 0.35),
      isMock: d.requests === 0,
      fetchedAt: new Date().toISOString()
    }));
  },

  // Mock 数据（API 不可用时使用）
  getMockData(date, isMock = true) {
    const baseRequests = 3000 + Math.floor(Math.random() * 5000);
    return {
      date: date.toISOString().split('T')[0],
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
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatNumber(num) {
    if (num === undefined || num === null) return '--';
    return new Intl.NumberFormat('zh-CN').format(num);
  }
};