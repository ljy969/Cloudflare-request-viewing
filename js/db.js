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
          store.createIndex(['accountId', 'date'], ['accountId', 'date'], { unique: false });
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
    const tx = dbInstance.transaction([STORES.ACCOUNTS, STORES.USAGE_RECORDS], 'readwrite');

    // idb v8.x: 使用 objectStore() 而非 store()
    await tx.objectStore(STORES.ACCOUNTS).delete(id);

    const usageStore = tx.objectStore(STORES.USAGE_RECORDS);
    const allRecords = await usageStore.getAll();
    for (const record of allRecords) {
      if (record.accountId === id) {
        await usageStore.delete(record.id);
      }
    }

    await tx.done;

    const remaining = await this.getAccounts();
    if (remaining.length > 0 && !remaining.some(a => a.isActive)) {
      await this.updateAccount(remaining[0].id, { isActive: true });
    }
  },

  async setActiveAccount(id) {
    await this.init();
    const tx = dbInstance.transaction(STORES.ACCOUNTS, 'readwrite');
    const store = tx.objectStore(STORES.ACCOUNTS);
    const all = await store.getAll();
    for (const acc of all) {
      acc.isActive = acc.id === id;
      acc.updatedAt = new Date().toISOString();
      await store.put(acc);
    }
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
    for (const record of records) {
      await store.add(record);
    }
    await tx.done;
  },

  async getUsageRecords(accountId, days = 30) {
    await this.init();
    const allRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allRecords
      .filter(r => r.accountId === accountId && new Date(r.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async getAllUsageRecords(accountId) {
    await this.init();
    const allRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    return allRecords
      .filter(r => r.accountId === accountId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async deleteUsageRecords(accountId) {
    await this.init();
    const tx = dbInstance.transaction(STORES.USAGE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.USAGE_RECORDS);
    const all = await store.getAll();
    for (const record of all) {
      if (record.accountId === accountId) {
        await store.delete(record.id);
      }
    }
    await tx.done;
  },

  async getUsageRecordCount(accountId) {
    await this.init();
    const records = await dbInstance.getAll(STORES.USAGE_RECORDS);
    return records.filter(r => r.accountId === accountId).length;
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

  async deleteSetting(key) {
    await this.init();
    return dbInstance.delete(STORES.SETTINGS, key);
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
    await tx.objectStore(STORES.ACCOUNTS).clear();
    await tx.objectStore(STORES.USAGE_RECORDS).clear();
    await tx.objectStore(STORES.SETTINGS).clear();

    if (data.accounts) {
      for (const acc of data.accounts) {
        await tx.objectStore(STORES.ACCOUNTS).add(acc);
      }
    }

    if (data.usageRecords) {
      for (const rec of data.usageRecords) {
        await tx.objectStore(STORES.USAGE_RECORDS).add(rec);
      }
    }

    if (data.settings) {
      for (const s of data.settings) {
        await tx.objectStore(STORES.SETTINGS).put(s);
      }
    }

    await tx.done;
  },

  async clearAll() {
    await this.init();
    const tx = dbInstance.transaction(
      [STORES.ACCOUNTS, STORES.USAGE_RECORDS, STORES.SETTINGS],
      'readwrite'
    );
    await tx.objectStore(STORES.ACCOUNTS).clear();
    await tx.objectStore(STORES.USAGE_RECORDS).clear();
    await tx.objectStore(STORES.SETTINGS).clear();
    await tx.done;
  },

  async getStats() {
    await this.init();
    const accounts = await this.getAccounts();
    const usageRecords = await dbInstance.getAll(STORES.USAGE_RECORDS);
    const lastSync = await this.getSetting('lastSync', null);

    const estimateSize = (obj) => {
      const str = JSON.stringify(obj);
      return new Blob([str]).size;
    };

    const totalSize = estimateSize({ accounts, usageRecords });

    return {
      accountCount: accounts.length,
      recordCount: usageRecords.length,
      lastSync,
      storageSize: this.formatBytes(totalSize)
    };
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};