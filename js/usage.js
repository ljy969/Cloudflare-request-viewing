// ===== 数据采集模块 =====
// 负责从 Cloudflare API 获取使用数据并保存到 IndexedDB

const UsageTracker = {
  fetchTimer: null,

  async init() {
    await DB.init();
    const interval = await DB.getSetting('autoFetchInterval', 60); // 默认60分钟
    this.setupAutoFetch(parseInt(interval));
  },

  setupAutoFetch(intervalMinutes) {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }

    if (intervalMinutes > 0) {
      this.fetchTimer = setInterval(() => {
        this.fetchAllAccounts();
      }, intervalMinutes * 60 * 1000);
    }
  },

  async fetchAllAccounts() {
    const accounts = await DB.getAccounts();
    const historyDays = parseInt(await DB.getSetting('fetchHistoryDays', 30));
    
    for (const account of accounts) {
      try {
        await this.fetchAccountData(account, historyDays);
      } catch (error) {
        console.error(`获取账户 ${account.name} 数据失败:`, error);
      }
    }

    await DB.setSetting('lastSync', new Date().toISOString());
    App.showToast('所有账户数据已刷新', 'success');
  },

  async fetchAccountData(account, days = 30) {
    // 获取历史使用数据
    const usageData = await CF_API.getUsageRange(account, days);
    
    // 保存到数据库
    const records = usageData.map(data => ({
      accountId: account.id,
      date: data.date,
      requests: data.requests,
      workersInvocations: data.workersInvocations || 0,
      bandwidth: data.bandwidth || 0,
      pageViews: data.pageViews || 0,
      uniqueVisitors: data.uniqueVisitors || 0,
      isMock: data.isMock || false,
      rawData: data,
      fetchedAt: new Date().toISOString()
    }));

    // 清除旧数据并重新导入（避免重复）
    await DB.deleteUsageRecords(account.id);
    await DB.addUsageRecords(records);

    return records;
  },

  async fetchSingleAccount(account, days = 30) {
    try {
      App.showToast(`正在获取 ${account.name} 数据...`, 'info');
      const records = await this.fetchAccountData(account, days);
      await DB.setSetting('lastSync', new Date().toISOString());
      
      const isMock = records.length > 0 && records.every(r => r.isMock);
      if (isMock) {
        App.showToast(`${account.name} 已使用模拟数据（需部署 Worker 代理获取真实数据）`, 'warning');
      } else {
        App.showToast(`${account.name} 数据更新成功`, 'success');
      }
      return records;
    } catch (error) {
      App.showToast(`获取数据失败: ${error.message}`, 'error');
      throw error;
    }
  },

  // 获取汇总统计
  async getSummary(accountId) {
    const records = await DB.getUsageRecords(accountId, 30);
    
    if (records.length === 0) {
      return {
        todayRequests: 0,
        monthRequests: 0,
        todayWorkers: 0,
        bandwidth: 0,
        todayProgress: 0,
        workersProgress: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = records.find(r => r.date === today);
    
    // 本月累计
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRecords = records.filter(r => new Date(r.date) >= firstDay);

    return {
      todayRequests: todayRecord?.requests || 0,
      monthRequests: monthRecords.reduce((sum, r) => sum + r.requests, 0),
      todayWorkers: todayRecord?.workersInvocations || 0,
      bandwidth: records.reduce((sum, r) => sum + r.bandwidth, 0),
      todayProgress: todayRecord ? Math.min(100, (todayRecord.requests / 100000) * 100) : 0,
      workersProgress: todayRecord ? Math.min(100, (todayRecord.workersInvocations / 100000) * 100) : 0
    };
  },

  // 获取最近 N 天的趋势数据
  async getTrendData(accountId, days = 30) {
    const records = await DB.getUsageRecords(accountId, days);
    
    return {
      labels: records.map(r => this.formatDate(r.date)),
      requests: records.map(r => r.requests),
      workers: records.map(r => r.workersInvocations),
      bandwidth: records.map(r => r.bandwidth),
      pageViews: records.map(r => r.pageViews),
      uniqueVisitors: records.map(r => r.uniqueVisitors)
    };
  },

  // 获取多账户对比数据
  async getComparisonData(metric = 'requests', range = 'month') {
    const accounts = await DB.getAccounts();
    const daysMap = { today: 1, week: 7, month: 30 };
    const days = daysMap[range] || 30;
    
    const datasets = [];
    const labels = [];

    // 获取日期标签
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(this.formatDate(d.toISOString().split('T')[0]));
    }

    const colors = ['#f38020', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const records = await DB.getUsageRecords(account.id, days);
      
      const dataPoints = labels.map(label => {
        const record = records.find(r => this.formatDate(r.date) === label);
        const value = record ? record[metric === 'workers' ? 'workersInvocations' : metric] : 0;
        return value || 0;
      });

      datasets.push({
        label: account.name,
        data: dataPoints,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '20',
        tension: 0.3,
        fill: false
      });
    }

    return { labels, datasets };
  },

  // 获取汇总表数据
  async getComparisonTableData(range = 'month') {
    const accounts = await DB.getAccounts();
    const daysMap = { today: 1, week: 7, month: 30 };
    const days = daysMap[range] || 30;
    
    const tableData = [];
    
    for (const account of accounts) {
      const records = await DB.getUsageRecords(account.id, days);
      const totalRequests = records.reduce((sum, r) => sum + r.requests, 0);
      const totalWorkers = records.reduce((sum, r) => sum + r.workersInvocations, 0);
      const totalBandwidth = records.reduce((sum, r) => sum + r.bandwidth, 0);
      const activeDays = records.filter(r => r.requests > 0).length;

      tableData.push({
        id: account.id,
        name: account.name,
        totalRequests,
        totalWorkers,
        totalBandwidth,
        activeDays
      });
    }

    return tableData;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
};