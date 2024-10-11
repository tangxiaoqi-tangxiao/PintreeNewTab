class IndexedDBHelper {
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    // 打开数据库
    openDB(storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains(storeName)) {
                    this.db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

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

    //游标
    GetCursor(storeName, f, f2) {
        const transaction = this.db.transaction([storeName]);
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // 处理数据
                f(cursor.value);
                // 继续遍历
                cursor.continue();
            } else {
                //结束
                f2();
            }
        };

        request.onerror = (event) => {
            f(null);
        };
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

    //批量删除
    deleteMultipleData(storeName, ids) {
        // 创建一个空数组来存储每个删除操作的Promise
        const deletePromises = ids.map(id => {
            // 返回一个新的Promise，它将执行单个删除操作
            return this.deleteData(storeName, id);
        });

        // 使用Promise.all来处理所有的删除操作
        return Promise.all(deletePromises)
            .then(results => {
                // 如果所有删除操作都成功，返回成功消息
                return `所有数据删除成功，共删除了${results.length}条数据。`;
            })
            .catch(error => {
                // 如果任何一个删除操作失败，返回错误消息
                return `删除数据时发生错误: ${error}`;
            });
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

const dbHelper = new IndexedDBHelper('Database', 1);

export default dbHelper;