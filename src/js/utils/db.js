import { DeferredPromise } from './deferredPromise.js';

class IndexedDBBackend {
    constructor(dbName = 'myDatabase', storeName = 'myStore') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;

        let deferredPromise = new DeferredPromise();
        this.loadPromise = deferredPromise.promise;
        this.loaded = false;

        const request = indexedDB.open(this.dbName, 1);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            deferredPromise.reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            this.db = event.target.result;

            if (!this.db.objectStoreNames.contains(this.storeName)) {
                this.db.createObjectStore(this.storeName)
//                    this.loaded = true;
//                    deferredPromise.resolve(this.db);
            }
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            this.loaded = true;
            deferredPromise.resolve(this.db);
        };
    }

    _getStore(transactionMode) {
        return this.db.transaction([this.storeName], transactionMode).objectStore(this.storeName);
    }

    async setItem(key, value) {
        if (!this.loaded) {
            await this.loadPromise;
        }
        return new Promise((resolve, reject) => {
            const store = this._getStore('readwrite');
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getItem(key) {
        if (!this.loaded) {
            await this.loadPromise;
        }
        return new Promise((resolve, reject) => {
            const store = this._getStore('readonly');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteItem(key) {
        if (!this.loaded) {
            await this.loadPromise;
        }
        return new Promise((resolve, reject) => {
            const store = this._getStore('readwrite');
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

const IndexedDBProxy = (dbName, storeName) => {
    const backend = new IndexedDBBackend(dbName, storeName);

    return new Proxy({}, {
        get: async (target, property) => {
            return await backend.getItem(property);
        },
        set: async (target, property, value) => {
            await backend.setItem(property, value);
            return true; // indicate success
        },
        deleteProperty: async (target, property) => {
            await backend.deleteITem(property);
            return true; // indicate success
        }
    });
};

export { IndexedDBProxy, IndexedDBBackend}

// Usage
//const db = IndexedDBProxy();
//
//// NOTE: Because the Proxy methods are async, you might need to use them in async functions:
//(async () => {
//    db.myKey = "myValue";
//    console.log(await db.myKey); // will print "myValue"
//})();
