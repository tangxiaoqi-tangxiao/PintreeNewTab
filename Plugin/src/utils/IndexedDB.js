class IndexedDBHelper {
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    // 打开数据库并创建多个表
    openDB(storeNames) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            //更改数据库版本触发的事件
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                storeNames.forEach(storeName => {
                    if (!this.db.objectStoreNames.contains(storeName)) {
                        console.log('创建表', storeName);
                        this.db.createObjectStore(storeName, {keyPath: "id", autoIncrement: true});
                    }
                });
            };

            // 打开数据库成功触发的事件
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            // 打开数据库失败触发的事件
            request.onerror = (event) => {
                reject(`打开数据库失败: ${event.target.error}`);
            };
        });
    }

    // 添加数据
    addData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve("数据添加成功");
            };

            request.onerror = (event) => {
                reject(`添加数据失败: ${event.target.error}`);
            };
        });
    }

    // 获取数据
    getData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName]);
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(`获取数据失败: ${event.target.error}`);
            };
        });
    }

    // 获取所有数据
    getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName]);
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(`获取所有数据失败: ${event.target.error}`);
            };
        });
    }

    // 更新数据
    updateData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve("数据更新成功");
            };

            request.onerror = (event) => {
                reject(`更新数据失败: ${event.target.error}`);
            };
        });
    }

    // 删除数据
    deleteData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve("数据删除成功");
            };

            request.onerror = (event) => {
                reject(`删除数据失败: ${event.target.error}`);
            };
        });
    }

    // 批量删除数据
    deleteMultipleData(storeName, ids) {
        const deletePromises = ids.map(id => this.deleteData(storeName, id));

        return Promise.all(deletePromises)
            .then(results => `所有数据删除成功，共删除了${results.length}条数据。`)
            .catch(error => `删除数据时发生错误: ${error}`);
    }

    // 游标
    getCursor(storeName, f, f2) {
        const transaction = this.db.transaction([storeName]);
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                f(cursor.value);
                cursor.continue();
            } else {
                f2();
            }
        };

        request.onerror = (event) => {
            f(null);
        };
    }

    // 关闭数据库
    closeDB() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // 删除数据库
    deleteDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);

            request.onsuccess = () => {
                resolve("数据库删除成功");
            };

            request.onerror = (event) => {
                reject(`删除数据库失败: ${event.target.error}`);
            };
        });
    }
}

// 使用示例，注意：更改结构需要更改数据库版本
export default new IndexedDBHelper('Database', 2);