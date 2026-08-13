// ===== 账户管理模块 =====
// 处理账户的增删改查及 UI 渲染

const AccountManager = {
  editingId: null,

  async init() {
    await DB.init();
    this.bindEvents();
    await this.render();
  },

  bindEvents() {
    document.getElementById('addAccountBtn')?.addEventListener('click', () => {
      this.openModal();
    });

    document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(e);
    });

    document.getElementById('modalClose')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modalCancel')?.addEventListener('click', () => {
      this.closeModal();
    });

    // 设置页面相关
    const workerUrlInput = document.getElementById('workerUrl');
    if (workerUrlInput) {
      workerUrlInput.addEventListener('change', async (e) => {
        await DB.setSetting('workerUrl', e.target.value);
      });
    }

    const autoFetchSelect = document.getElementById('autoFetchInterval');
    if (autoFetchSelect) {
      autoFetchSelect.addEventListener('change', async (e) => {
        await DB.setSetting('autoFetchInterval', e.target.value);
        UsageTracker.setupAutoFetch(parseInt(e.target.value));
      });
    }

    const historyDaysSelect = document.getElementById('fetchHistoryDays');
    if (historyDaysSelect) {
      historyDaysSelect.addEventListener('change', async (e) => {
        await DB.setSetting('fetchHistoryDays', e.target.value);
      });
    }
  },

  async render() {
    const accounts = await DB.getAccounts();
    const activeAccount = await DB.getActiveAccount();
    const grid = document.getElementById('accountsGrid');
    
    if (!grid) return;

    if (accounts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">👤</div>
          <p style="margin-bottom: 16px;">还没有添加任何账户</p>
          <button class="btn btn-primary" onclick="document.getElementById('addAccountBtn').click()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加第一个账户
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = await Promise.all(accounts.map(async (account) => {
      const records = await DB.getUsageRecords(account.id, 30);
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = records.find(r => r.date === today);
      const totalRequests = records.reduce((sum, r) => sum + r.requests, 0);
      const totalWorkers = records.reduce((sum, r) => sum + r.workersInvocations, 0);

      return `
        <div class="account-card ${account.isActive ? 'active' : ''}" data-id="${account.id}">
          <div class="account-card-header">
            <div>
              <div class="account-name">${this.escapeHtml(account.name)}</div>
              <div class="account-id">ID: ${this.escapeHtml(account.accountId)}</div>
            </div>
            ${account.isActive ? '<span class="badge badge-success">当前</span>' : ''}
          </div>
          
          <div class="account-stats">
            <div class="account-stat">
              <div class="account-stat-label">今日请求</div>
              <div class="account-stat-value">${CF_API.formatNumber(todayRecord?.requests || 0)}</div>
            </div>
            <div class="account-stat">
              <div class="account-stat-label">本月累计</div>
              <div class="account-stat-value">${CF_API.formatNumber(totalRequests)}</div>
            </div>
            <div class="account-stat">
              <div class="account-stat-label">Worker</div>
              <div class="account-stat-value">${CF_API.formatNumber(totalWorkers)}</div>
            </div>
            <div class="account-stat">
              <div class="account-stat-label">记录天数</div>
              <div class="account-stat-value">${records.length}</div>
            </div>
          </div>

          <div class="account-actions">
            ${account.isActive ? '' : `<button class="btn btn-secondary btn-sm" onclick="AccountManager.activate(${account.id})">设为当前</button>`}
            <button class="btn btn-secondary btn-sm" onclick="AccountManager.edit(${account.id})">编辑</button>
            <button class="btn btn-primary btn-sm" onclick="AccountManager.refresh(${account.id})">刷新</button>
            <button class="btn btn-danger btn-sm" onclick="AccountManager.delete(${account.id})">删除</button>
          </div>
        </div>
      `;
    }));
  },

  async openModal(account = null) {
    this.editingId = account?.id || null;
    const modal = document.getElementById('accountModal');
    const form = document.getElementById('accountForm');
    const title = document.getElementById('modalTitle');

    form.reset();

    if (account) {
      title.textContent = '编辑账户';
      document.getElementById('accountName').value = account.name || '';
      document.getElementById('accountIdInput').value = account.accountId || '';
      document.getElementById('apiToken').value = account.apiToken || '';
      document.getElementById('apiEmail').value = account.apiEmail || '';
    } else {
      title.textContent = '添加账户';
    }

    modal.classList.add('active');
  },

  closeModal() {
    this.editingId = null;
    document.getElementById('accountModal').classList.remove('active');
  },

  async handleSubmit(e) {
    const account = {
      name: document.getElementById('accountName').value.trim(),
      accountId: document.getElementById('accountIdInput').value.trim(),
      apiToken: document.getElementById('apiToken').value.trim(),
      apiEmail: document.getElementById('apiEmail').value.trim() || null
    };

    if (!account.name || !account.accountId || !account.apiToken) {
      App.showToast('请填写所有必填字段', 'warning');
      return;
    }

    try {
      if (this.editingId) {
        await DB.updateAccount(this.editingId, account);
        App.showToast('账户已更新', 'success');
      } else {
        const id = await DB.addAccount(account);
        this.editingId = id;
        App.showToast('账户已添加', 'success');
      }

      this.closeModal();
      await this.render();
      App.updateActiveAccountLabel();
    } catch (error) {
      App.showToast(`保存失败: ${error.message}`, 'error');
    }
  },

  async edit(id) {
    const account = await DB.getAccount(id);
    if (account) {
      this.openModal(account);
    }
  },

  async activate(id) {
    await DB.setActiveAccount(id);
    await this.render();
    App.updateActiveAccountLabel();
    App.showToast('已切换到该账户', 'success');
  },

  async refresh(id) {
    const account = await DB.getAccount(id);
    if (!account) return;

    try {
      await UsageTracker.fetchSingleAccount(account);
      await this.render();
    } catch (error) {
      console.error(error);
    }
  },

  async delete(id) {
    const account = await DB.getAccount(id);
    if (!account) return;

    if (!confirm(`确定要删除账户 "${account.name}" 吗？\n该账户的所有使用数据也会被删除。`)) {
      return;
    }

    try {
      await DB.deleteAccount(id);
      App.showToast('账户已删除', 'success');
      await this.render();
      App.updateActiveAccountLabel();
    } catch (error) {
      App.showToast(`删除失败: ${error.message}`, 'error');
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
};