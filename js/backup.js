// ===== 数据备份与恢复模块 =====

const BackupManager = {
  async init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importBtn')?.addEventListener('click', () => {
      document.getElementById('importFile')?.click();
    });

    document.getElementById('importFile')?.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.importData(e.target.files[0]);
      }
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
      this.clearAllData();
    });
  },

  async exportData() {
    try {
      App.showToast(I18n.t('data.exporting'), 'info');
      const data = await DB.exportAll();
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `cf-tracker-backup-${timestamp}.json`;
      
      // 下载文件
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      App.showToast(I18n.t('data.exported', filename), 'success');
    } catch (error) {
      App.showToast(I18n.t('data.exportFailed', error.message), 'error');
    }
  },

  async importData(file) {
    try {
      App.showToast(I18n.t('data.importing'), 'info');
      
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证文件格式
      if (!data.version || !Array.isArray(data.accounts)) {
        throw new Error(I18n.t('data.invalidFile'));
      }

      // 确认操作
      const accountCount = data.accounts.length;
      const recordCount = data.usageRecords?.length || 0;
      if (!confirm(I18n.t('data.importConfirm', accountCount, recordCount))) {
        return;
      }

      App.showToast(I18n.t('data.importingData'), 'info');
      await DB.importAll(data);

      App.showToast(I18n.t('data.importSuccess'), 'success');
      
      // 刷新界面
      await App.refreshAll();
    } catch (error) {
      App.showToast(I18n.t('data.importFailed', error.message), 'error');
    }
  },

  async clearAllData() {
    const accounts = await DB.getAccounts();
    if (accounts.length === 0) {
      App.showToast(I18n.t('data.noData'), 'warning');
      return;
    }

    if (!confirm(I18n.t('data.clearWarning1'))) {
      return;
    }

    if (!confirm(I18n.t('data.clearWarning2'))) {
      return;
    }

    try {
      await DB.clearAll();
      App.showToast(I18n.t('data.cleared'), 'success');
      await App.refreshAll();
    } catch (error) {
      App.showToast(I18n.t('data.clearFailed', error.message), 'error');
    }
  }
};