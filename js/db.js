// ===== IndexedDB 存储层 =====
// 使用 idb 库封装 IndexedDB 操作，提供 Promise 风格的 API
// idb v8.x API: transaction.objectStore() 而非 transaction.store()

const DB_NAME = 'cf_tracker_db';
const DB_VERSION = 1;
const STORES = {
  ACCOUNTS: 'accounts',
  USAGE_RECORDS: 'usage_records',
  SETTINGS: 'app_settings'
};

let dbInstance = null;

const DB = {
  async init() {
    if (dbInstance) return dbInstance;

    dbInstance = await idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
          const store = db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('isActive', 'isActive', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.USAGE_RECORDS)) {
          const store = db.createObjectStore(STORES.USAGE_RECORDS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('accountId', 'accountId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      }
    });

    return dbInstance;
  },

  // ===== 账户操作 =====
  async getAccounts() {
    await this.init();
    return dbInstance.getAll(STORES.ACCOUNTS);
  },

  async getAccount(id) {
    await this.init();
    return dbInstance.get(STORES.ACCOUNTS, id);
  },

  async addAccount(account) {
    await this.init();
    const now = new Date().toISOString();
    const record = {
      ...account,
      createdAt: now,
      updatedAt: now,
      isActive: false
    };

    const accounts = await this.getAccounts();
    if (accounts.length === 0) {
      record.isActive = true;
    }

    return dbInstance.add(STORES.ACCOUNTS, record);
  },

  async updateAccount(id, updates) {
    await this.init();
    const account = await dbInstance.get(STORES.ACCOUNTS, id);
    if (!account) throw new Error('账户不存在');
    const updated = { ...account, ...updates, updatedAt: new Date().toISOString() };
    return dbInstance.put(STORES.ACCOUNTS, updated);
  },

  async deleteAccount(id) {
    await this.init();
    // First, get all usage records for this account (outside transaction)
    const allRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const tx = dbInstance.transaction([STORES.ACCOUNTS, STORES.USAGE_RECORDS], 'readwrite');

    // idb v8.x: 使用 objectStore() 而非 store()
    const accountStore = tx.objectStore(STORES.ACCOUNTS);
    const usageStore = tx.objectStore(STORES.USAGE_RECORDS);

    await accountStore.delete(id);

    const ops = allRecords
      .filter(r => r.accountId === id)
      .map(r => usageStore.delete(r.id));
    await Promise.all(ops);

    await tx.done;

    const remaining = await this.getAccounts();
    if (remaining.length > 0 && !remaining.some(a => a.isActive)) {
      await this.updateAccount(remaining[0].id, { isActive: true });
    }
  },

  async setActiveAccount(id) {
    await this.init();
    const accounts = await dbInstance.getAll(STORES.ACCOUNTS);
    const tx = dbInstance.transaction(STORES.ACCOUNTS, 'readwrite');
    const store = tx.objectStore(STORES.ACCOUNTS);
    const ops = accounts.map(acc => {
      acc.isActive = acc.id === id;
      acc.updatedAt = new Date().toISOString();
      return store.put(acc);
    });
    await Promise.all(ops);
    await tx.done;
  },

  async getActiveAccount() {
    await this.init();
    const accounts = await this.getAccounts();
    return accounts.find(a => a.isActive) || accounts[0] || null;
  },

  // ===== 使用记录操作 =====
  async addUsageRecord(record) {
    await this.init();
    return dbInstance.add(STORES.USAGE_RECORDS, record);
  },

  async addUsageRecords(records) {
    await this.init();
    const tx = dbInstance.transaction(STORES.USAGE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.USAGE_RECORDS);
    // 同步排队所有写入，再统一 await，避免事务在多次 await 间隙被自动提交
    const ops = records.map(r => store.add(r));
    await Promise.all(ops);
    await tx.done;
  },

  async getUsageRecords(accountId, days = 30) {
    await this.init();
    const allRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    // - days + 1：让窗口与采集窗口一致（startDate = today - days + 1），
    // 即“最近 N 天”精确地包含今天在内的 N 天，而不是 N+1 天
    cutoffDate.setDate(cutoffDate.getDate() - days + 1);

    return allRecords
      .filter(r => r.accountId === accountId && parseLocalDate(r.date) >= cutoffDate)
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
  },

  async getAllUsageRecords(accountId) {
    await this.init();
    const allRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    return allRecords
      .filter(r => r.accountId === accountId)
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
  },

  async deleteUsageRecords(accountId) {
    await this.init();
    const tx = dbInstance.transaction(STORES.USAGE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.USAGE_RECORDS);
    const all = await store.getAll();
    // 同步排队所有删除，再统一 await
    const ops = all
      .filter(r => r.accountId === accountId)
      .map(r => store.delete(r.id));
    await Promise.all(ops);
    await tx.done;
  },

  // ===== 设置操作 =====
  async getSetting(key, defaultValue = null) {
    await this.init();
    const record = await dbInstance.get(STORES.SETTINGS, key);
    return record ? record.value : defaultValue;
  },

  async setSetting(key, value) {
    await this.init();
    return dbInstance.put(STORES.SETTINGS, { key, value });
  },

  // ===== 数据库维护 =====
  async exportAll() {
    await this.init();
    const accounts = await this.getAccounts();
    const usageRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const settings = await dbInstance.getAll(STORES.SETTINGS);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts,
      usageRecords,
      settings
    };
  },

  async importAll(data) {
    await this.init();
    const tx = dbInstance.transaction(
      [STORES.ACCOUNTS, STORES.USAGE_RECORDS, STORES.SETTINGS],
      'readwrite'
    );

    // idb v8.x: 所有 transaction 内部操作使用 objectStore()
    // 同步排队所有写入再统一 await，避免事务在多次 await 间隙被自动提交
    const accountStore = tx.objectStore(STORES.ACCOUNTS);
    const usageStore = tx.objectStore(STORES.USAGE_RECORDS);
    const settingsStore = tx.objectStore(STORES.SETTINGS);

    const ops = [
      accountStore.clear(),
      usageStore.clear(),
      settingsStore.clear()
    ];

    if (data.accounts) {
      for (const acc of data.accounts) ops.push(accountStore.add(acc));
    }
    if (data.usageRecords) {
      for (const rec of data.usageRecords) ops.push(usageStore.add(rec));
    }
    if (data.settings) {
      for (const s of data.settings) ops.push(settingsStore.put(s));
    }

    await Promise.all(ops);
    await tx.done;
  },

  async clearAll() {
    await this.init();
    const tx = dbInstance.transaction(
      [STORES.ACCOUNTS, STORES.USAGE_RECORDS, STORES.SETTINGS],
      'readwrite'
    );
    const accountStore = tx.objectStore(STORES.ACCOUNTS);
    const usageStore = tx.objectStore(STORES.USAGE_RECORDS);
    const settingsStore = tx.objectStore(STORES.SETTINGS);
    const ops = [
      accountStore.clear(),
      usageStore.clear(),
      settingsStore.clear()
    ];
    await Promise.all(ops);
    await tx.done;
  },

  async getStats() {
    await this.init();
    const accounts = await this.getAccounts();
    const usageRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const settings = await dbInstance.getAll(STORES.SETTINGS);
    const lastSyncSetting = settings.find(s => s.key === 'lastSync');
    const lastSync = lastSyncSetting ? lastSyncSetting.value : null;

    const estimateSize = (obj) => {
      const str = JSON.stringify(obj);
      return new Blob([str]).size;
    };

    // 统计体积时纳入 settings，估算更接近真实占用
    const totalSize = estimateSize({ accounts, usageRecords, settings });

    return {
      accountCount: accounts.length,
      recordCount: usageRecords.length,
      lastSync,
      storageSize: CF_API.formatBytes(totalSize)
    };
  }
 };