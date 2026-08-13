// ===== idb 兼容层 =====
// 轻量级 idb 库替代实现，封装原生 IndexedDB API
// 提供 Promise 风格的接口，与 idb 库 API 兼容
// 这使得应用无需外部 CDN 依赖即可正常工作

(function(global) {
  'use strict';

  function openDB(dbName, version, { upgrade } = {}) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
      let db;

      request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (upgrade) {
          upgrade(db);
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(createDBWrapper(db));
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  function createDBWrapper(db) {
    return {
      _db: db,
      get objectStoreNames() {
        return db.objectStoreNames;
      },
      getAll(storeName, query, count) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll(query, count);
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      },
      get(storeName, key) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      add(storeName, value, key) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = key !== undefined ? store.add(value, key) : store.add(value);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      put(storeName, value, key) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = key !== undefined ? store.put(value, key) : store.put(value);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      delete(storeName, key) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      },
      clear(storeName) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      },
      transaction(storeNames, mode = 'readonly') {
        const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
        const tx = db.transaction(stores, mode);
        return createTransactionWrapper(tx, stores);
      },
      close() {
        db.close();
      }
    };
  }

  function createTransactionWrapper(tx, storeNames) {
    const wrapper = {
      _tx: tx,
      _stores: storeNames,
      get done() {
        return new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(new Error('Transaction aborted'));
        });
      },
      objectStore(storeName) {
        return createStoreOperationWrapper(tx, storeName);
      },
      store(storeName) {
        return createStoreOperationWrapper(tx, storeName);
      }
    };
    return wrapper;
  }

  function createStoreOperationWrapper(tx, storeName) {
    return {
      getAll(query, count) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.getAll(query, count);
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      },
      get(key) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      add(value, key) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = key !== undefined ? store.add(value, key) : store.add(value);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      put(value, key) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = key !== undefined ? store.put(value, key) : store.put(value);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      delete(key) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      },
      clear() {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      },
      openCursor(range, direction) {
        return new Promise((resolve, reject) => {
          const store = tx.objectStore(storeName);
          const request = store.openCursor(range, direction);
          const results = [];
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              results.push({ key: cursor.key, value: cursor.value });
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    };
  }

  const idb = { openDB };
  global.idb = idb;

})(window);