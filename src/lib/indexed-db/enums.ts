export enum IndexedDbAction {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
}

export enum IndexedDbRecordType {
  PendingChange = "pending-change",
  SyncedItem = "synced-item",
}

export enum SyncStatus {
  Pending = "pending",
  Failed = "failed",
  Synced = "synced",
}

export { SyncStatus as NoteSyncStatus, SyncStatus as TaskSyncStatus };
