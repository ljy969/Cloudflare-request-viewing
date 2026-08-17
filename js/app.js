// ===== 全局日期工具函数（解决时区问题）=====
// 统一使用本地日期，避免 UTC 偏移导致的数据错位
window.getLocalDateString = function(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

window.parseLocalDate = function(dateStr) {
    if (!dateStr) return new Date();
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
};

// ===== 主应用模块 =====
// 协调各模块，处理页面路由和 UI 更新

const App = {
  currentPage: 'dashboard',

  async init() {
    this.showLoading();

    try {
      // 初始化各模块（先初始化 I18n，避免主题模块在 i18n 就绪前读取翻译）
      I18n.init();
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
          this.showToast(I18n.t('app.welcome'), 'info');
        }, 500);
      }
    } catch (error) {
      console.error('应用初始化失败:', error);
      this.showToast(I18n.t('app.loadError', error.message), 'error');
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

    // 语言切换
    document.getElementById('langToggle')?.addEventListener('click', () => {
      const lang = I18n.toggle();
      App.showToast(I18n.t(lang === 'zh' ? 'language.switched' : 'language.switchedEn'), 'info');
      // 重新渲染当前页面以更新动态文本
      App.loadPageData(App.currentPage);
      // 更新顶部页面标题
      const pageTitleEl = document.getElementById('pageTitle');
      if (pageTitleEl) {
        pageTitleEl.textContent = I18n.t('nav.' + App.currentPage);
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
      dashboard: I18n.t('nav.dashboard'),
      accounts: I18n.t('nav.accounts'),
      comparison: I18n.t('nav.comparison'),
      data: I18n.t('nav.data'),
      settings: I18n.t('nav.settings')
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || I18n.t('nav.dashboard');

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
    this.showToast(I18n.t('app.refreshing'), 'info');
    
    if (this.currentPage === 'dashboard') {
      const accounts = await DB.getAccounts();
      for (const account of accounts) {
        try {
          await UsageTracker.fetchSingleAccount(account);
        } catch (e) { console.error(e); }
      }
      await this.renderDashboard();
    } else {
      await UsageTracker.fetchAllAccounts();
      await this.refreshAll();
    }

    this.showToast(I18n.t('app.refreshed'), 'success');
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
    // 恢复统计卡片显示，移除空状态提示
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.querySelectorAll('.stat-card').forEach(card => {
        card.style.display = '';
      });
      const emptyState = statsGrid.querySelector('.no-account-state');
      if (emptyState) emptyState.remove();
    }

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

  removeMockDataNotice() {
    const notice = document.getElementById('mockDataNotice');
    if (notice) notice.remove();
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
      const dashboard = document.getElementById('page-dashboard');
      dashboard.insertBefore(notice, dashboard.firstChild);
    }
    // 始终用当前语言刷新文案（修复切换语言后横幅文字仍为旧语言的问题）
    notice.innerHTML = `
      <span style="font-size: 1.2rem;">⚠️</span>
      <span>${I18n.t('app.mockDataNotice')}</span>
    `;
  },

  showNoAccountState() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    // 隐藏统计卡片并显示空状态提示（不覆盖原始 HTML）
    statsGrid.querySelectorAll('.stat-card').forEach(card => {
      card.style.display = 'none';
    });

    let emptyState = statsGrid.querySelector('.no-account-state');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'no-account-state';
      emptyState.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);';
      emptyState.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 12px;">📊</div>
        <p style="margin-bottom: 16px;">${I18n.t('app.noAccount')}</p>
        <button class="btn btn-primary" onclick="App.navigate('accounts')">${I18n.t('app.goToAccounts')}</button>
      `;
      statsGrid.appendChild(emptyState);
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
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${I18n.t('dashboard.empty')}</td></tr>`;
      return;
    }

    // 显示最近 10 条
    const recent = records.slice(-10).reverse();
    tbody.innerHTML = '';
    recent.forEach(r => {
      const tr = document.createElement('tr');
      const tdDate = document.createElement('td');
      tdDate.textContent = this.formatDisplayDate(r.date);
      const tdReq = document.createElement('td');
      tdReq.textContent = CF_API.formatNumber(r.requests);
      if (r.isMock) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-warning';
        badge.style.marginLeft = '4px';
        badge.textContent = I18n.t('dashboard.mock');
        tdReq.appendChild(badge);
      }
      const tdWorkers = document.createElement('td');
      tdWorkers.textContent = CF_API.formatNumber(r.workersInvocations);
      const tdBw = document.createElement('td');
      tdBw.textContent = CF_API.formatBytes(r.bandwidth);
      const tdStatus = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.className = r.requests > 0 ? 'badge badge-success' : 'badge badge-info';
      statusBadge.textContent = r.requests > 0 ? I18n.t('dashboard.normal') : I18n.t('dashboard.noTraffic');
      tdStatus.appendChild(statusBadge);
      tr.append(tdDate, tdReq, tdWorkers, tdBw, tdStatus);
      tbody.appendChild(tr);
    });
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
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${I18n.t('comparison.empty')}</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    tableData.forEach(row => {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = row.name;
      tdName.appendChild(strong);
      const tdReq = document.createElement('td');
      tdReq.textContent = CF_API.formatNumber(row.totalRequests);
      const tdWk = document.createElement('td');
      tdWk.textContent = CF_API.formatNumber(row.totalWorkers);
      const tdBw = document.createElement('td');
      tdBw.textContent = CF_API.formatBytes(row.totalBandwidth);
      const tdDays = document.createElement('td');
      tdDays.textContent = I18n.t('comparison.days', row.activeDays);
      tr.append(tdName, tdReq, tdWk, tdBw, tdDays);
      tbody.appendChild(tr);
    });
  },

  async renderDataPage() {
    const stats = await DB.getStats();
    
    document.getElementById('statAccounts').textContent = stats.accountCount;
    document.getElementById('statRecords').textContent = stats.recordCount;
    document.getElementById('statLastSync').textContent = stats.lastSync 
      ? this.formatDateTime(stats.lastSync) 
      : I18n.t('data.neverSync');
    document.getElementById('statSize').textContent = stats.storageSize;
  },

  updateActiveAccountLabel(account = null) {
    const label = document.getElementById('activeAccountLabel');
    if (!label) return;
    
    if (account) {
      label.textContent = account.name;
    } else {
      label.textContent = I18n.t('app.noAccountSelected');
    }
  },

  formatDisplayDate(dateStr) {
    const date = parseLocalDate(dateStr);
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateStr === todayStr) return I18n.t('dashboard.today');
    if (dateStr === yesterdayStr) return I18n.t('dashboard.yesterday');

    if (I18n.getCurrent() === 'zh') {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  formatDateTime(isoStr) {
    const date = new Date(isoStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);transition:opacity 0.2s;';
      overlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  },

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 200);
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // 限制最多显示 3 个 toast
    while (container.children.length >= 3) {
      container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icons[type] || 'ℹ️';
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.append(iconSpan, msgSpan);
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