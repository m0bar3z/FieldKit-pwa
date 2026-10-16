export enum IndexedDbAction {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
}

export enum IndexedDbRecordType {
  PendingChange = "pending-change",
  SyncedItem = "synced-item",
}

export enum NoteSyncStatus {
  Pending = "pending",
  Failed = "failed",
  Synced = "synced",
}
