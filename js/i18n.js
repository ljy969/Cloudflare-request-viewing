// ===== 国际化翻译数据 =====
// 支持中文（zh）和英文（en）

const TRANSLATIONS = {
  zh: {
    // 通用
    'app.title': 'Cloudflare 使用情况追踪器',
    'app.name': 'CF 追踪器',
    'app.loading': '加载中...',
    'app.refreshing': '正在刷新数据...',
    'app.refreshed': '数据已刷新',
    'app.noAccount': '还没有账户数据',
    'app.noAccountSelected': '未选择账户',
    'app.goToAccounts': '前往账户管理',
    'app.welcome': '欢迎使用！请先添加 Cloudflare 账户',
    'app.loadError': '应用初始化失败: {0}',
    'app.mockDataNotice': '当前显示的是模拟数据。要获取真实的 Cloudflare 使用数据，请部署 <strong>Cloudflare Worker 代理</strong> 并在 <a href="#" onclick="App.navigate(\'settings\');return false;">设置</a> 中配置代理地址。',

    // 导航
    'nav.dashboard': '仪表盘',
    'nav.accounts': '账户管理',
    'nav.comparison': '多账户对比',
    'nav.data': '数据管理',
    'nav.settings': '设置',

    // 仪表盘
    'dashboard.todayRequests': '今日请求',
    'dashboard.workerCalls': 'Worker 调用',
    'dashboard.monthRequests': '本月请求',
    'dashboard.bandwidth': '带宽使用',
    'dashboard.monthlyTotal': '月度累计',
    'dashboard.currentMonth': '当月累计',
    'dashboard.trend': '请求趋势（最近30天）',
    'dashboard.resource': '资源分布',
    'dashboard.details': '使用情况详情',
    'dashboard.date': '日期',
    'dashboard.requests': '请求数',
    'dashboard.workers': 'Worker 调用',
    'dashboard.bandwidthLabel': '带宽',
    'dashboard.pageViews': '页面浏览',
    'dashboard.status': '状态',
    'dashboard.empty': '暂无数据，请点击"刷新"获取数据',
    'dashboard.emptyNoAccount': '暂无数据，请先添加账户并刷新',
    'dashboard.progressRatio': '{0} / 100,000',
    'dashboard.mock': '模拟',
    'dashboard.normal': '正常',
    'dashboard.noTraffic': '无流量',
    'dashboard.days.7': '7 天',
    'dashboard.days.30': '30 天',
    'dashboard.days.90': '90 天',
    'dashboard.today': '今天',
    'dashboard.yesterday': '昨天',
    'dashboard.month': '月',
    'dashboard.day': '日',

    // 账户管理
    'accounts.title': '账户管理',
    'accounts.name': '账户',
    'accounts.add': '添加账户',
    'accounts.addFirst': '添加第一个账户',
    'accounts.current': '当前',
    'accounts.todayRequests': '今日请求',
    'accounts.monthlyTotal': '本月累计',
    'accounts.worker': 'Worker',
    'accounts.recordDays': '记录天数',
    'accounts.activate': '设为当前',
    'accounts.activated': '已切换到该账户',
    'accounts.edit': '编辑',
    'accounts.refresh': '刷新',
    'accounts.delete': '删除',
    'accounts.deleted': '账户已删除',
    'accounts.deleteFailed': '删除失败: {0}',
    'accounts.confirmDelete': '确定要删除账户 "{0}" 吗？\n该账户的所有使用数据也会被删除。',
    'accounts.empty': '还没有添加任何账户',

    // 弹窗
    'modal.addTitle': '添加账户',
    'modal.editTitle': '编辑账户',
    'modal.name': '账户名称 *',
    'modal.namePlaceholder': '给账户起个名字',
    'modal.accountId': 'Cloudflare 账户 ID *',
    'modal.accountIdPlaceholder': '在 CF 控制台 URL 中可以找到',
    'modal.apiToken': 'API Token *',
    'modal.apiTokenPlaceholder': '具有 Analytics 只读权限的 API Token',
    'modal.apiTokenHint': '在 Cloudflare Dashboard → My Profile → API Tokens 创建',
    'modal.apiEmail': 'API 邮箱（Global Key 模式可选）',
    'modal.apiEmailPlaceholder': '使用 API Key 认证时需要',
    'modal.apiKey': 'API Key（Global Key 模式可选）',
    'modal.apiKeyPlaceholder': '使用 Global API Key 认证时需要',
    'modal.cancel': '取消',
    'modal.save': '保存',
    'modal.required': '请填写所有必填字段',
    'modal.updated': '账户已更新',
    'modal.added': '账户已添加',
    'modal.saveFailed': '保存失败: {0}',

    // 多账户对比
    'comparison.title': '多账户对比',
    'comparison.metric.requests': '请求数',
    'comparison.metric.workers': 'Worker 调用',
    'comparison.metric.bandwidth': '带宽使用',
    'comparison.range.today': '今日',
    'comparison.range.week': '近7天',
    'comparison.range.month': '近30天',
    'comparison.summary': '汇总统计',
    'comparison.totalRequests': '请求总数',
    'comparison.totalWorkers': 'Worker 调用',
    'comparison.totalBandwidth': '带宽',
    'comparison.activeDays': '活跃天数',
    'comparison.empty': '暂无账户数据',
    'comparison.days': '{0} 天',

    // 数据管理
    'data.title': '数据管理',
    'data.export': '📦 导出备份',
    'data.exportDesc': '将所有账户配置和使用数据导出为 JSON 文件',
    'data.exportBtn': '导出数据',
    'data.exporting': '正在导出数据...',
    'data.import': '📥 导入恢复',
    'data.importDesc': '从备份文件恢复所有数据',
    'data.importBtn': '导入数据',
    'data.importing': '正在读取文件...',
    'data.clear': '🗑️ 清空数据',
    'data.clearDesc': '删除所有账户和使用记录（不可恢复）',
    'data.clearBtn': '清空所有数据',
    'data.exported': '数据已导出: {0}',
    'data.exportFailed': '导出失败: {0}',
    'data.importingData': '正在导入数据...',
    'data.importConfirm': '将导入 {0} 个账户和 {1} 条使用记录。\n当前所有数据将被覆盖，确定继续吗？',
    'data.importSuccess': '数据导入成功！',
    'data.importFailed': '导入失败: {0}',
    'data.invalidFile': '无效的备份文件格式',
    'data.clearWarning1': '⚠️ 警告：此操作将删除所有账户和使用记录，且不可恢复！\n\n建议先导出备份再继续。\n\n确定要清空所有数据吗？',
    'data.clearWarning2': '再次确认：真的要清空所有数据吗？此操作无法撤销！',
    'data.noData': '没有可清空的数据',
    'data.cleared': '所有数据已清空',
    'data.clearFailed': '清空失败: {0}',
    'data.allRefreshed': '所有账户数据已刷新',
    'data.stats': '存储统计',
    'data.statAccounts': '账户数量',
    'data.statRecords': '使用记录',
    'data.statLastSync': '最近同步',
    'data.statSize': '存储空间',
    'data.neverSync': '从未同步',

    // 设置
    'settings.title': '设置',
    'settings.appearance': '外观设置',
    'settings.themeLabel': '主题模式',
    'settings.themeDesc': '选择深色/浅色模式，或跟随系统',
    'settings.theme.light': '浅色',
    'settings.theme.dark': '深色',
    'settings.theme.system': '跟随系统',
    'settings.dataCollection': '数据采集',
    'settings.autoFetchLabel': '自动采集间隔',
    'settings.autoFetchDesc': '每隔指定时间自动同步使用数据',
    'settings.fetchHistoryLabel': '采集历史天数',
    'settings.fetchHistoryDesc': '每次采集时回溯获取多少天的历史数据',
    'settings.deployment': '部署信息',
    'settings.workerUrlLabel': 'API 代理地址',
    'settings.workerUrlDesc': 'Cloudflare Worker 代理地址（用于跨域请求）',
    'settings.autoFetch.off': '禁用自动采集',
    'settings.autoFetch.30': '每 30 分钟',
    'settings.autoFetch.60': '每 1 小时',
    'settings.autoFetch.360': '每 6 小时',
    'settings.autoFetch.720': '每 12 小时',
    'settings.autoFetch.1440': '每天',
    'settings.history.7': '最近 7 天',
    'settings.history.30': '最近 30 天',
    'settings.history.90': '最近 90 天',
    'settings.saved': 'API 代理地址已保存',

    // 主题
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',

    // Toast 消息
    'toast.success': '✅',
    'toast.error': '❌',
    'toast.warning': '⚠️',
    'toast.info': 'ℹ️',

    // 语言
    'language.zh': '中文',
    'language.en': 'English',
    'language.switched': '语言已切换为中文',
    'language.switchedEn': 'Language switched to English',
    'usage.fetching': '正在获取 {0} 数据...',
    'usage.mockData': '{0} 已使用模拟数据（需部署 Worker 代理获取真实数据）',
    'usage.updated': '{0} 数据更新成功',
    'usage.fetchFailed': '获取数据失败: {0}'
  },
  en: {
    // General
    'app.title': 'Cloudflare Usage Tracker',
    'app.name': 'CF Tracker',
    'app.loading': 'Loading...',
    'app.refreshing': 'Refreshing data...',
    'app.refreshed': 'Data refreshed',
    'app.noAccount': 'No account data yet',
    'app.noAccountSelected': 'No account selected',
    'app.goToAccounts': 'Go to Accounts',
    'app.welcome': 'Welcome! Please add a Cloudflare account first',
    'app.loadError': 'Application initialization failed: {0}',
    'app.mockDataNotice': 'Currently showing mock data. To get real Cloudflare usage data, please deploy a <strong>Cloudflare Worker proxy</strong> and configure the proxy URL in <a href="#" onclick="App.navigate(\'settings\');return false;">Settings</a>.',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.accounts': 'Accounts',
    'nav.comparison': 'Comparison',
    'nav.data': 'Data',
    'nav.settings': 'Settings',

    // Dashboard
    'dashboard.todayRequests': "Today's Requests",
    'dashboard.workerCalls': 'Worker Calls',
    'dashboard.monthRequests': 'Monthly Requests',
    'dashboard.bandwidth': 'Bandwidth',
    'dashboard.monthlyTotal': 'Monthly total',
    'dashboard.currentMonth': 'Current month',
    'dashboard.trend': 'Request Trend (Last 30 Days)',
    'dashboard.resource': 'Resource Distribution',
    'dashboard.details': 'Usage Details',
    'dashboard.date': 'Date',
    'dashboard.requests': 'Requests',
    'dashboard.workers': 'Workers',
    'dashboard.bandwidthLabel': 'Bandwidth',
    'dashboard.pageViews': 'Page Views',
    'dashboard.status': 'Status',
    'dashboard.empty': 'No data, please click "Refresh" to fetch data',
    'dashboard.emptyNoAccount': 'No data, please add an account and refresh',
    'dashboard.progressRatio': '{0} / 100,000',
    'dashboard.mock': 'Mock',
    'dashboard.normal': 'Normal',
    'dashboard.noTraffic': 'No traffic',
    'dashboard.days.7': '7 Days',
    'dashboard.days.30': '30 Days',
    'dashboard.days.90': '90 Days',
    'dashboard.today': 'Today',
    'dashboard.yesterday': 'Yesterday',
    'dashboard.month': '',
    'dashboard.day': '',

    // Accounts
    'accounts.title': 'Account Management',
    'accounts.name': 'Account',
    'accounts.add': 'Add Account',
    'accounts.addFirst': 'Add First Account',
    'accounts.current': 'Current',
    'accounts.todayRequests': "Today's Requests",
    'accounts.monthlyTotal': 'Monthly Total',
    'accounts.worker': 'Workers',
    'accounts.recordDays': 'Days',
    'accounts.activate': 'Set Active',
    'accounts.activated': 'Switched to this account',
    'accounts.edit': 'Edit',
    'accounts.refresh': 'Refresh',
    'accounts.delete': 'Delete',
    'accounts.deleted': 'Account deleted',
    'accounts.deleteFailed': 'Delete failed: {0}',
    'accounts.confirmDelete': 'Are you sure you want to delete account "{0}"?\nAll usage data for this account will also be deleted.',
    'accounts.empty': 'No accounts added yet',

    // Modal
    'modal.addTitle': 'Add Account',
    'modal.editTitle': 'Edit Account',
    'modal.name': 'Account Name *',
    'modal.namePlaceholder': 'Give it a name',
    'modal.accountId': 'Cloudflare Account ID *',
    'modal.accountIdPlaceholder': 'Can be found in CF Dashboard URL',
    'modal.apiToken': 'API Token *',
    'modal.apiTokenPlaceholder': 'API Token with Analytics Read permission',
    'modal.apiTokenHint': 'Create at Cloudflare Dashboard → My Profile → API Tokens',
    'modal.apiEmail': 'API Email (Optional for Global Key)',
    'modal.apiEmailPlaceholder': 'Required when using API Key authentication',
    'modal.apiKey': 'API Key (Optional for Global Key)',
    'modal.apiKeyPlaceholder': 'Required when using Global API Key authentication',
    'modal.cancel': 'Cancel',
    'modal.save': 'Save',
    'modal.required': 'Please fill in all required fields',
    'modal.updated': 'Account updated',
    'modal.added': 'Account added',
    'modal.saveFailed': 'Save failed: {0}',

    // Comparison
    'comparison.title': 'Multi-Account Comparison',
    'comparison.metric.requests': 'Requests',
    'comparison.metric.workers': 'Worker Calls',
    'comparison.metric.bandwidth': 'Bandwidth',
    'comparison.range.today': 'Today',
    'comparison.range.week': 'Last 7 Days',
    'comparison.range.month': 'Last 30 Days',
    'comparison.summary': 'Summary',
    'comparison.totalRequests': 'Total Requests',
    'comparison.totalWorkers': 'Workers',
    'comparison.totalBandwidth': 'Bandwidth',
    'comparison.activeDays': 'Active Days',
    'comparison.empty': 'No account data',
    'comparison.days': '{0} days',

    // Data Management
    'data.title': 'Data Management',
    'data.export': '📦 Export Backup',
    'data.exportDesc': 'Export all account configurations and usage data as a JSON file',
    'data.exportBtn': 'Export Data',
    'data.exporting': 'Exporting data...',
    'data.import': '📥 Import Restore',
    'data.importDesc': 'Restore all data from a backup file',
    'data.importBtn': 'Import Data',
    'data.importing': 'Reading file...',
    'data.clear': '🗑️ Clear Data',
    'data.clearDesc': 'Delete all accounts and usage records (irreversible)',
    'data.clearBtn': 'Clear All Data',
    'data.exported': 'Data exported: {0}',
    'data.exportFailed': 'Export failed: {0}',
    'data.importingData': 'Importing data...',
    'data.importConfirm': 'This will import {0} accounts and {1} usage records.\nAll current data will be overwritten. Continue?',
    'data.importSuccess': 'Data imported successfully!',
    'data.importFailed': 'Import failed: {0}',
    'data.invalidFile': 'Invalid backup file format',
    'data.clearWarning1': '⚠️ Warning: This will delete all accounts and usage records and cannot be undone!\n\nIt is recommended to export a backup first.\n\nAre you sure you want to clear all data?',
    'data.clearWarning2': 'Confirm again: Are you really sure you want to clear all data? This action cannot be undone!',
    'data.noData': 'No data to clear',
    'data.cleared': 'All data cleared',
    'data.clearFailed': 'Clear failed: {0}',
    'data.allRefreshed': 'All accounts data refreshed',
    'data.stats': 'Storage Statistics',
    'data.statAccounts': 'Accounts',
    'data.statRecords': 'Usage Records',
    'data.statLastSync': 'Last Sync',
    'data.statSize': 'Storage Size',
    'data.neverSync': 'Never synced',

    // Settings
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.themeLabel': 'Theme Mode',
    'settings.themeDesc': 'Choose dark/light mode, or follow system',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'settings.dataCollection': 'Data Collection',
    'settings.autoFetchLabel': 'Auto-fetch Interval',
    'settings.autoFetchDesc': 'Automatically sync usage data at specified intervals',
    'settings.fetchHistoryLabel': 'History Days',
    'settings.fetchHistoryDesc': 'How many days of historical data to fetch each time',
    'settings.deployment': 'Deployment',
    'settings.workerUrlLabel': 'API Proxy URL',
    'settings.workerUrlDesc': 'Cloudflare Worker proxy URL (for CORS requests)',
    'settings.autoFetch.off': 'Disabled',
    'settings.autoFetch.30': 'Every 30 minutes',
    'settings.autoFetch.60': 'Every 1 hour',
    'settings.autoFetch.360': 'Every 6 hours',
    'settings.autoFetch.720': 'Every 12 hours',
    'settings.autoFetch.1440': 'Every day',
    'settings.history.7': 'Last 7 days',
    'settings.history.30': 'Last 30 days',
    'settings.history.90': 'Last 90 days',
    'settings.saved': 'API proxy URL saved',

    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    // Toast
    'toast.success': '✅',
    'toast.error': '❌',
    'toast.warning': '⚠️',
    'toast.info': 'ℹ️',

    // Language
    'language.zh': 'Chinese',
    'language.en': 'English',
    'language.switched': 'Language switched to Chinese',
    'language.switchedEn': 'Language switched to English',
    'usage.fetching': 'Fetching {0} data...',
    'usage.mockData': '{0} is using mock data (deploy Worker proxy for real data)',
    'usage.updated': '{0} data updated successfully',
    'usage.fetchFailed': 'Fetch data failed: {0}'
  }
};

// ===== 国际化工具函数 =====
const I18n = {
  currentLang: 'zh',

  init() {
    const saved = localStorage.getItem('cf_tracker_lang');
    this.currentLang = saved || 'zh';
    this.apply(this.currentLang);
  },

  get(lang) {
    return TRANSLATIONS[lang] || TRANSLATIONS.zh;
  },

  t(key, ...args) {
    const translations = this.get(this.currentLang);
    let text = translations[key] || key;
    if (args.length > 0) {
      text = text.replace(/{(\d+)}/g, (_, index) => args[index] !== undefined ? args[index] : '');
    }
    return text;
  },

  apply(lang) {
    this.currentLang = lang;
    localStorage.setItem('cf_tracker_lang', lang);
    this.updateHTML();
    this.updateDynamicText();
  },

  updateHTML() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder && !el.value) {
          el.placeholder = text;
        } else if (el.value) {
          // Keep existing value for inputs
        } else {
          el.value = text;
        }
      } else if (el.tagName === 'SELECT') {
        // Update select options
        const options = el.querySelectorAll('option');
        options.forEach(opt => {
          const optKey = opt.getAttribute('data-i18n');
          if (optKey) {
            opt.textContent = this.t(optKey);
          }
        });
      } else {
        el.innerHTML = text;
      }
    });

    // 处理占位符翻译（data-i18n-placeholder）
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Update page title
    document.title = this.t('app.title');

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en';
  },

  updateDynamicText() {
    // Update theme label
    const themeLabel = document.getElementById('themeLabel');
    if (themeLabel) {
      const currentTheme = ThemeManager.getCurrent();
      const effective = ThemeManager.getEffective();
      if (currentTheme === 'system') {
        themeLabel.textContent = this.t('theme.system');
      } else {
        themeLabel.textContent = this.t(currentTheme === 'dark' ? 'theme.dark' : 'theme.light');
      }
    }

    // Update language switcher label
    // 按钮显示「将要切换到的语言」的本名：中文用汉字“中文”，英文用“English”，不随界面语言翻译
    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
      const nativeLangNames = { zh: '中文', en: 'English' };
      const targetLang = this.currentLang === 'zh' ? 'en' : 'zh';
      langLabel.textContent = nativeLangNames[targetLang];
    }
  },

  getCurrent() {
    return this.currentLang;
  },

  toggle() {
    const next = this.currentLang === 'zh' ? 'en' : 'zh';
    this.apply(next);
    return next;
  }
};
