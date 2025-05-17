/**
 * Utility for offline data storage using IndexedDB
 */

const DB_NAME = 'video2tool-offline';
const DB_VERSION = 1;
const STORES = {
  FORMS: 'offline-forms',
  PROJECTS: 'projects',
  VIDEOS: 'videos',
  SPECIFICATIONS: 'specifications',
  TASKS: 'tasks',
  USER_DATA: 'user-data',
  CACHE: 'api-cache',
};

/**
 * Opens the IndexedDB database
 * @returns Promise that resolves to the database instance
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.FORMS)) {
        db.createObjectStore(STORES.FORMS, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SPECIFICATIONS)) {
        db.createObjectStore(STORES.SPECIFICATIONS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Saves data to the specified store
 * @param storeName - Name of the store
 * @param data - Data to save
 * @returns Promise that resolves when the data is saved
 */
export const saveData = async <T>(storeName: string, data: T): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Gets data from the specified store by ID
 * @param storeName - Name of the store
 * @param id - ID of the data to get
 * @returns Promise that resolves to the data
 */
export const getData = async <T>(storeName: string, id: string | number): Promise<T | null> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Gets all data from the specified store
 * @param storeName - Name of the store
 * @returns Promise that resolves to an array of data
 */
export const getAllData = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Deletes data from the specified store by ID
 * @param storeName - Name of the store
 * @param id - ID of the data to delete
 * @returns Promise that resolves when the data is deleted
 */
export const deleteData = async (storeName: string, id: string | number): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Clears all data from the specified store
 * @param storeName - Name of the store
 * @returns Promise that resolves when the store is cleared
 */
export const clearStore = async (storeName: string): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

/**
 * Saves a form for offline submission
 * @param url - URL to submit the form to
 * @param method - HTTP method
 * @param headers - Request headers
 * @param body - Request body
 * @returns Promise that resolves when the form is saved
 */
export const saveOfflineForm = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<void> => {
  return saveData(STORES.FORMS, {
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
  });
};

/**
 * Saves user data for offline use
 * @param key - Key to identify the data
 * @param value - Data to save
 * @returns Promise that resolves when the data is saved
 */
export const saveUserData = async <T>(key: string, value: T): Promise<void> => {
  return saveData(STORES.USER_DATA, { key, value });
};

/**
 * Gets user data for offline use
 * @param key - Key to identify the data
 * @returns Promise that resolves to the data
 */
export const getUserData = async <T>(key: string): Promise<T | null> => {
  const data = await getData<{ key: string; value: T }>(STORES.USER_DATA, key);
  return data ? data.value : null;
};

// Export store names for use in other modules
export const OFFLINE_STORES = STORES;
