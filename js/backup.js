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
      App.showToast('正在导出数据...', 'info');
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

      App.showToast(`数据已导出: ${filename}`, 'success');
    } catch (error) {
      App.showToast(`导出失败: ${error.message}`, 'error');
    }
  },

  async importData(file) {
    try {
      App.showToast('正在读取文件...', 'info');
      
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证文件格式
      if (!data.version || !Array.isArray(data.accounts)) {
        throw new Error('无效的备份文件格式');
      }

      // 确认操作
      const accountCount = data.accounts.length;
      const recordCount = data.usageRecords?.length || 0;
      if (!confirm(`将导入 ${accountCount} 个账户和 ${recordCount} 条使用记录。\n当前所有数据将被覆盖，确定继续吗？`)) {
        return;
      }

      App.showToast('正在导入数据...', 'info');
      await DB.importAll(data);

      App.showToast('数据导入成功！', 'success');
      
      // 刷新界面
      await App.refreshAll();
    } catch (error) {
      App.showToast(`导入失败: ${error.message}`, 'error');
    }
  },

  async clearAllData() {
    const accounts = await DB.getAccounts();
    if (accounts.length === 0) {
      App.showToast('没有可清空的数据', 'warning');
      return;
    }

    if (!confirm('⚠️ 警告：此操作将删除所有账户和使用记录，且不可恢复！\n\n建议先导出备份再继续。\n\n确定要清空所有数据吗？')) {
      return;
    }

    if (!confirm('再次确认：真的要清空所有数据吗？此操作无法撤销！')) {
      return;
    }

    try {
      await DB.clearAll();
      App.showToast('所有数据已清空', 'success');
      await App.refreshAll();
    } catch (error) {
      App.showToast(`清空失败: ${error.message}`, 'error');
    }
  }
};