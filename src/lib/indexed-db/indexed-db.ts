/** biome-ignore-all lint/style/noNonNullAssertion: The upgrade event provides a versionchange transaction. */
import type { IndexedDbAction } from "./enums";

const DB_NAME = "fieldkit";
const DB_VERSION = 4;
const NOTES_NAME = "notes";
const TASKS_NAME = "tasks";

type StoreNames = typeof NOTES_NAME | typeof TASKS_NAME;

export type StoredRecord<T> = {
  id: string | number;
  createdAt: number;
  value: T;
};

const openDB = (storeName: string): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;

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

      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      blocked = true;
      reject(new Error("Close other FieldKit tabs to update local storage."));
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
  key: IDBValidKey,
): Promise<StoredRecord<T> | undefined> => {
  return execute<StoredRecord<T> | undefined>(
    storeName,
    "readonly",
    (store) => {
      return store.get(key);
    },
  );
};

export const getAllFromStore = <T>(storeName: StoreNames) =>
  execute<StoredRecord<T>[]>(storeName, "readonly", (store) => store.getAll());

// Read and replace a record in one transaction, including across browser tabs.
export const modifyFromStore = async <T>(
  storeName: StoreNames,
  key: IDBValidKey,
  change: (current: StoredRecord<T> | undefined) => StoredRecord<T> | undefined,
): Promise<StoredRecord<T> | undefined> => {
  const db = await openDB(storeName);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    let result: StoredRecord<T> | undefined;
    let failure: unknown;

    request.onsuccess = () => {
      try {
        result = change(request.result);

        if (result) store.put(result);
        else store.delete(key);
      } catch (error) {
        failure = error;

        tx.abort();
      }
    };

    tx.oncomplete = () => {
      db.close();

      resolve(result);
    };

    tx.onabort = () => {
      db.close();

      reject(
        failure ?? tx.error ?? new Error("Local changes could not be saved."),
      );
    };
  });
};

export const findNotesByAction = <T>(action: IndexedDbAction) => {
  return execute<T[]>("notes", "readonly", (store) => {
    const index = store.index("by_action");

    return index.getAll(action);
  });
};
