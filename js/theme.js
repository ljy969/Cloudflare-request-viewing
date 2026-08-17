// ===== 主题管理模块 =====
// 支持深色/浅色/跟随系统三种模式

const ThemeManager = {
  STORAGE_KEY: 'cf_tracker_theme',
  currentTheme: 'system',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    this.currentTheme = saved || 'system';
    this.apply(this.currentTheme);
    this.setupSystemListener();
    this.bindUI();
  },

  setupSystemListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'system') {
        this.apply('system');
      }
    });
  },

  apply(theme) {
    this.currentTheme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);

    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    this.updateUI(theme, effectiveTheme);
    document.dispatchEvent(new Event('themechange'));
  },

  updateUI(theme, effectiveTheme) {
    const label = document.getElementById('themeLabel');
    if (label) {
      if (theme === 'system') {
        label.textContent = I18n.t('theme.system');
      } else {
        label.textContent = I18n.t(theme === 'dark' ? 'theme.dark' : 'theme.light');
      }
    }

    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  },

  bindUI() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const modes = ['light', 'dark', 'system'];
        const idx = modes.indexOf(this.currentTheme);
        const next = modes[(idx + 1) % modes.length];
        this.apply(next);
      });
    }

    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        this.apply(btn.dataset.theme);
      });
    });
  },

  getCurrent() {
    return this.currentTheme;
  },

  getEffective() {
    if (this.currentTheme !== 'system') return this.currentTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
};