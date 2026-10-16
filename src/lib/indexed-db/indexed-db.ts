/** biome-ignore-all lint/style/noNonNullAssertion: The upgrade event provides a versionchange transaction. */
const DB_NAME = "fieldkit";
const DB_VERSION = 4;
const NOTES_NAME = "notes";
const TASKS_NAME = "tasks";

type StoreNames = typeof NOTES_NAME | typeof TASKS_NAME;

const openDB = (storeName: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      const store = db.objectStoreNames.contains(storeName)
        ? request.transaction!.objectStore(storeName)
        : db.createObjectStore(storeName, {
            autoIncrement: true,
            keyPath: "id",
          });

      if (!store.indexNames.contains("by_action")) {
        store.createIndex("by_action", "value.action");
      }

      if (!store.indexNames.contains("by_createdAt")) {
        store.createIndex("by_createdAt", "createdAt");
      }

      if (!store.indexNames.contains("by_recordType")) {
        store.createIndex("by_recordType", "value.recordType");
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => db.close();

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("Close other tabs using this database.");
    };
  });
};

const execute = async <T>(
  name: StoreNames,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openDB(name);

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);

    const request = action(store);

    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };

    tx.oncomplete = () => {
      db.close();

      resolve(result);
    };

    tx.onabort = () => {
      db.close();

      reject(tx.error ?? new Error("Transaction Aborted"));
    };
  });
};

export const addToStore = <T>(storeName: StoreNames, value: T) => {
  return execute(storeName, "readwrite", (store) => {
    return store.add({ value, createdAt: Date.now() });
  });
};

export const findFromStore = <T>(
  storeName: StoreNames,
  key: string,
): { createdAt: number; value: T } => {
  //@ts-expect-error unknown promise
  return execute(storeName, "readonly", (store) => {
    return store.get(key);
  });
};

export const findNotesByAction = <T>(action: string) => {
  return execute<T[]>("notes", "readonly", (store) => {
    const index = store.index("by_action");

    return index.getAll(action);
  });
};
