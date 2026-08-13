// ===== 主应用模块 =====
// 协调各模块，处理页面路由和 UI 更新

const App = {
  currentPage: 'dashboard',

  async init() {
    this.showLoading();

    try {
      // 初始化各模块
      ThemeManager.init();
      await DB.init();
      await UsageTracker.init();
      await AccountManager.init();
      await BackupManager.init();

      // 绑定 UI 事件
      this.bindEvents();

      // 加载第一个页面
      this.navigate('dashboard');

      // 初始化设置
      await this.loadSettings();

      // 检查是否有账户，没有则引导添加
      const accounts = await DB.getAccounts();
      if (accounts.length === 0) {
        setTimeout(() => {
          this.showToast('欢迎使用！请先添加 Cloudflare 账户', 'info');
        }, 500);
      }
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showToast('应用初始化失败: ' + error.message, 'error');
    }

    this.hideLoading();
  },

  bindEvents() {
    // 导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigate(page);
      });
    });

    // 移动端菜单
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // 刷新按钮
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      await this.refreshCurrentPage();
    });

    // 趋势图天数选择
    document.getElementById('trendRange')?.addEventListener('change', async (e) => {
      const activeAccount = await DB.getActiveAccount();
      if (activeAccount) {
        await Charts.renderTrendChart(activeAccount.id, parseInt(e.target.value));
      }
    });

    // 对比页面筛选
    document.getElementById('compareMetric')?.addEventListener('change', () => {
      this.renderComparisonChart();
    });
    document.getElementById('compareRange')?.addEventListener('change', () => {
      this.renderComparisonChart();
    });

    // 主题变化时重绘图表
    document.addEventListener('themechange', async () => {
      const activeAccount = await DB.getActiveAccount();
      if (activeAccount) {
        await Charts.refreshCharts(activeAccount.id);
      }
    });

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (ThemeManager.getCurrent() === 'system') {
        document.dispatchEvent(new Event('themechange'));
      }
    });
  },

  async loadSettings() {
    const workerUrl = await DB.getSetting('workerUrl', '');
    const autoFetchInterval = await DB.getSetting('autoFetchInterval', '60');
    const fetchHistoryDays = await DB.getSetting('fetchHistoryDays', '30');

    const workerUrlInput = document.getElementById('workerUrl');
    if (workerUrlInput) workerUrlInput.value = workerUrl;

    const autoFetchSelect = document.getElementById('autoFetchInterval');
    if (autoFetchSelect) autoFetchSelect.value = autoFetchInterval;

    const historyDaysSelect = document.getElementById('fetchHistoryDays');
    if (historyDaysSelect) historyDaysSelect.value = fetchHistoryDays;
  },

  navigate(pageName) {
    this.currentPage = pageName;
    
    // 更新导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // 更新页面标题
    const titles = {
      dashboard: '仪表盘',
      accounts: '账户管理',
      comparison: '多账户对比',
      data: '数据管理',
      settings: '设置'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || '仪表盘';

    // 切换页面显示
    document.querySelectorAll('.page').forEach(page => {
      page.classList.add('hidden');
    });
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
    }

    // 关闭移动端菜单
    document.getElementById('sidebar')?.classList.remove('open');

    // 加载页面数据
    this.loadPageData(pageName);
  },

  async loadPageData(pageName) {
    switch (pageName) {
      case 'dashboard':
        await this.renderDashboard();
        break;
      case 'accounts':
        await AccountManager.render();
        break;
      case 'comparison':
        await this.renderComparisonChart();
        break;
      case 'data':
        await this.renderDataPage();
        break;
      case 'settings':
        break;
    }
  },

  async refreshCurrentPage() {
    this.showToast('正在刷新数据...', 'info');
    
    if (this.currentPage === 'dashboard') {
      const accounts = await DB.getAccounts();
      for (const account of accounts) {
        try {
          await UsageTracker.fetchSingleAccount(account);
        } catch (e) { console.error(e); }
      }
      await this.renderDashboard();
    } else {
      await this.refreshAll();
    }

    this.showToast('数据已刷新', 'success');
  },

  async refreshAll() {
    Charts.destroyAll();
    await AccountManager.render();
    await this.renderDashboard();
    if (this.currentPage === 'comparison') {
      await this.renderComparisonChart();
    }
    if (this.currentPage === 'data') {
      await this.renderDataPage();
    }
  },

  async renderDashboard() {
    const activeAccount = await DB.getActiveAccount();
    this.updateActiveAccountLabel(activeAccount);

    if (!activeAccount) {
      this.showNoAccountState();
      return;
    }

    const records = await DB.getUsageRecords(activeAccount.id, 30);
    const hasMockData = records.length > 0 && records.every(r => r.isMock);
    const hasRealData = records.some(r => !r.isMock);

    if (hasMockData && !hasRealData) {
      this.showMockDataNotice();
    } else {
      this.removeMockDataNotice();
    }

    const summary = await UsageTracker.getSummary(activeAccount.id);
    this.updateStatCards(summary);

    const trendDays = parseInt(document.getElementById('trendRange')?.value || '30');
    await Charts.renderTrendChart(activeAccount.id, trendDays);
    await Charts.renderResourceChart(activeAccount.id);

    await this.renderUsageTable(activeAccount.id);
  },

  showMockDataNotice() {
    let notice = document.getElementById('mockDataNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'mockDataNotice';
      notice.style.cssText = `
        background: var(--warning-light);
        color: var(--warning);
        border: 1px solid var(--warning);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
      `;
      notice.innerHTML = `
        <span style="font-size: 1.2rem;">⚠️</span>
        <span>当前显示的是模拟数据。要获取真实的 Cloudflare 使用数据，请部署 <strong>Cloudflare Worker 代理</strong> 并在 <a href="#" onclick="App.navigate('settings');return false;">设置</a> 中配置代理地址。</span>
      `;
      const content = document.getElementById('content');
      content.insertBefore(notice, content.firstChild);
    }
  },

  removeMockDataNotice() {
    const notice = document.getElementById('mockDataNotice');
    if (notice) notice.remove();
  },

  showNoAccountState() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">📊</div>
          <p style="margin-bottom: 16px; font-size: 1.1rem;">还没有账户数据</p>
          <button class="btn btn-primary" onclick="App.navigate('accounts')">
            前往账户管理
          </button>
        </div>
      `;
    }
  },

  updateStatCards(summary) {
    document.getElementById('todayRequests').textContent = CF_API.formatNumber(summary.todayRequests);
    document.getElementById('todayWorkers').textContent = CF_API.formatNumber(summary.todayWorkers);
    document.getElementById('monthRequests').textContent = CF_API.formatNumber(summary.monthRequests);
    document.getElementById('bandwidthUsed').textContent = CF_API.formatBytes(summary.bandwidth);
    
    document.getElementById('requestsProgress').style.width = summary.todayProgress + '%';
    document.getElementById('workersProgress').style.width = summary.workersProgress + '%';
    
    document.getElementById('requestsRatio').textContent = 
      `${CF_API.formatNumber(summary.todayRequests)} / 100,000`;
    document.getElementById('workersRatio').textContent = 
      `${CF_API.formatNumber(summary.todayWorkers)} / 100,000`;
  },

  async renderUsageTable(accountId) {
    const tbody = document.getElementById('usageTableBody');
    if (!tbody) return;

    const records = await DB.getUsageRecords(accountId, 30);

    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无数据，请点击"刷新"获取数据</td></tr>';
      return;
    }

    // 显示最近 10 条
    const recent = records.slice(-10).reverse();
    tbody.innerHTML = recent.map(r => `
      <tr>
        <td>${this.formatDisplayDate(r.date)}</td>
        <td>${CF_API.formatNumber(r.requests)} ${r.isMock ? '<span class="badge badge-warning" style="margin-left:4px">模拟</span>' : ''}</td>
        <td>${CF_API.formatNumber(r.workersInvocations)}</td>
        <td>${CF_API.formatBytes(r.bandwidth)}</td>
        <td>
          ${r.requests > 0 
            ? '<span class="badge badge-success">正常</span>' 
            : '<span class="badge badge-info">无流量</span>'}
        </td>
      </tr>
    `).join('');
  },

  async renderComparisonChart() {
    const metric = document.getElementById('compareMetric')?.value || 'requests';
    const range = document.getElementById('compareRange')?.value || 'month';
    
    await Charts.renderComparisonChart(metric, range);

    // 渲染表格
    const tableData = await UsageTracker.getComparisonTableData(range);
    const tbody = document.getElementById('comparisonTableBody');
    
    if (!tbody) return;

    if (tableData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无账户数据</td></tr>';
      return;
    }

    tbody.innerHTML = tableData.map(row => `
      <tr>
        <td><strong>${this.escapeHtml(row.name)}</strong></td>
        <td>${CF_API.formatNumber(row.totalRequests)}</td>
        <td>${CF_API.formatNumber(row.totalWorkers)}</td>
        <td>${CF_API.formatBytes(row.totalBandwidth)}</td>
        <td>${row.activeDays} 天</td>
      </tr>
    `).join('');
  },

  async renderDataPage() {
    const stats = await DB.getStats();
    
    document.getElementById('statAccounts').textContent = stats.accountCount;
    document.getElementById('statRecords').textContent = stats.recordCount;
    document.getElementById('statLastSync').textContent = stats.lastSync 
      ? this.formatDateTime(stats.lastSync) 
      : '从未同步';
    document.getElementById('statSize').textContent = stats.storageSize;
  },

  updateActiveAccountLabel(account = null) {
    const label = document.getElementById('activeAccountLabel');
    if (!label) return;
    
    if (account) {
      label.textContent = account.name;
    } else {
      label.textContent = '未选择账户';
    }
  },

  formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return '今天';
    if (date.toDateString() === yesterday.toDateString()) return '昨天';
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  formatDateTime(isoStr) {
    const date = new Date(isoStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  showLoading() {
    // 可以添加全局 loading 效果
    document.body.style.opacity = '0.7';
    document.body.style.pointerEvents = 'none';
  },

  hideLoading() {
    document.body.style.opacity = '1';
    document.body.style.pointerEvents = 'auto';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});