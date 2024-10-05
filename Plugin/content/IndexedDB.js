class IndexedDBHelper {
    constructor(dbName, version) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.request = indexedDB.open(dbName, version);
    }

    // 处理数据库打开成功事件
    onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Database opened successfully');
    }

    // 处理数据库升级事件
    onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('storeName', { keyPath: 'id', autoIncrement: true });
        console.log('Database upgraded successfully');
    }

    // 处理错误事件
    onerror = (event) => {
        console.error('Database error:', event.target.errorCode);
    }

    // 添加数据
    addData = (data, storeName, key) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data, key);
        request.onsuccess = () => console.log('Data added successfully');
        request.onerror = (event) => console.error('Error adding data:', event.target.errorCode);
    }

    // 获取数据
    getData = (key, storeName) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = (event) => {
            if (event.target.result) {
                console.log('Data retrieved successfully', event.target.result);
            } else {
                console.log('Data not found');
            }
        };
        request.onerror = (event) => console.error('Error retrieving data:', event.target.errorCode);
    }

    // 删除数据
    deleteData = (key, storeName) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => console.log('Data deleted successfully');
        request.onerror = (event) => console.error('Error deleting data:', event.target.errorCode);
    }
}