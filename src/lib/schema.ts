import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgRole,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Supabase owns this table; reference it without generating or changing it.
const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});
const authenticatedRole = pgRole("authenticated").existing();

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name"),
    phone: varchar("phone", { length: 256 }),
    // Nullable preserves legacy users; only a trusted server can assign the mapping.
    authId: uuid("auth_id")
      .unique()
      .references(() => authUsers.id, { onDelete: "restrict" }),
  },
  (table) => [
    pgPolicy("users_read_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.authId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const projectCategory = pgEnum("project_category", [
  "travel",
  "work",
  "personal",
]);

// Keep the existing user IDs; authId links each owner to Supabase Auth.
// UUIDs can also be supplied by an offline client before it reaches the server.
function ownedSyncColumns() {
  return {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // The migration's UPDATE trigger maintains updatedAt and increments version.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Preserve deleted rows as tombstones for future synchronization.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
  };
}

function ownerPolicies(tableName: string, ownerId: AnyPgColumn) {
  const ownsRow = sql`${ownerId} = (select id from public.users where auth_id = (select auth.uid()))`;
  return [
    pgPolicy(`${tableName}_owner_select`, {
      for: "select",
      to: authenticatedRole,
      using: ownsRow,
    }),
    pgPolicy(`${tableName}_owner_insert`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: ownsRow,
    }),
    pgPolicy(`${tableName}_owner_update`, {
      for: "update",
      to: authenticatedRole,
      using: ownsRow,
      withCheck: ownsRow,
    }),
    pgPolicy(`${tableName}_owner_delete`, {
      for: "delete",
      to: authenticatedRole,
      using: ownsRow,
    }),
  ];
}

export const projects = pgTable(
  "projects",
  {
    ...ownedSyncColumns(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    category: projectCategory("category").default("personal").notNull(),
  },
  (table) => [
    unique("projects_owner_id_id_unique").on(table.ownerId, table.id),
    index("projects_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
      table.id,
    ),
    check("projects_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    check("projects_version_positive", sql`${table.version} > 0`),
    ...ownerPolicies("projects", table.ownerId),
  ],
).enableRLS();

export const tasks = pgTable(
  "tasks",
  {
    ...ownedSyncColumns(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    completed: boolean("completed").default(false).notNull(),
    // A due date is a calendar day, independent of a time zone.
    dueDate: date("due_date", { mode: "string" }),
  },
  (table) => [
    unique("tasks_owner_id_id_unique").on(table.ownerId, table.id),
    foreignKey({
      name: "tasks_project_owner_fk",
      columns: [table.ownerId, table.projectId],
      foreignColumns: [projects.ownerId, projects.id],
    }).onDelete("restrict"),
    index("tasks_project_owner_idx").on(table.projectId, table.ownerId),
    index("tasks_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
      table.id,
    ),
    index("tasks_owner_due_idx").on(table.ownerId, table.dueDate),
    check("tasks_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("tasks_version_positive", sql`${table.version} > 0`),
    ...ownerPolicies("tasks", table.ownerId),
  ],
).enableRLS();

export const notes = pgTable(
  "notes",
  {
    ...ownedSyncColumns(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    content: text("content").default("").notNull(),
  },
  (table) => [
    unique("notes_owner_id_id_unique").on(table.ownerId, table.id),
    foreignKey({
      name: "notes_project_owner_fk",
      columns: [table.ownerId, table.projectId],
      foreignColumns: [projects.ownerId, projects.id],
    }).onDelete("restrict"),
    index("notes_project_owner_idx").on(table.projectId, table.ownerId),
    index("notes_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
      table.id,
    ),
    check("notes_title_not_blank", sql`length(btrim(${table.title})) > 0`),
    check("notes_version_positive", sql`${table.version} > 0`),
    ...ownerPolicies("notes", table.ownerId),
  ],
).enableRLS();

export const attachments = pgTable(
  "attachments",
  {
    ...ownedSyncColumns(),
    // Exactly one parent: an attachment belongs to a task OR a note.
    taskId: uuid("task_id"),
    noteId: uuid("note_id"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "bigint" }).notNull(),
    // Store object metadata, not file blobs or expiring download URLs.
    // A missing key represents a file that has not been uploaded yet.
    storageKey: text("storage_key").unique(),
  },
  (table) => [
    foreignKey({
      name: "attachments_task_owner_fk",
      columns: [table.ownerId, table.taskId],
      foreignColumns: [tasks.ownerId, tasks.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "attachments_note_owner_fk",
      columns: [table.ownerId, table.noteId],
      foreignColumns: [notes.ownerId, notes.id],
    }).onDelete("restrict"),
    index("attachments_task_owner_idx").on(table.taskId, table.ownerId),
    index("attachments_note_owner_idx").on(table.noteId, table.ownerId),
    index("attachments_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
      table.id,
    ),
    check(
      "attachments_exactly_one_parent",
      sql`(${table.taskId} IS NOT NULL) <> (${table.noteId} IS NOT NULL)`,
    ),
    check(
      "attachments_file_name_not_blank",
      sql`length(btrim(${table.fileName})) > 0`,
    ),
    check(
      "attachments_mime_type_not_blank",
      sql`length(btrim(${table.mimeType})) > 0`,
    ),
    check("attachments_byte_size_nonnegative", sql`${table.byteSize} >= 0`),
    check(
      "attachments_storage_key_not_blank",
      sql`${table.storageKey} IS NULL OR length(btrim(${table.storageKey})) > 0`,
    ),
    check("attachments_version_positive", sql`${table.version} > 0`),
    ...ownerPolicies("attachments", table.ownerId),
  ],
).enableRLS();

export const reminders = pgTable(
  "reminders",
  {
    ...ownedSyncColumns(),
    taskId: uuid("task_id").notNull(),
    // Unlike dueDate, a reminder is a precise instant; PostgreSQL normalizes its offset.
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "reminders_task_owner_fk",
      columns: [table.ownerId, table.taskId],
      foreignColumns: [tasks.ownerId, tasks.id],
    }).onDelete("restrict"),
    index("reminders_task_owner_idx").on(table.taskId, table.ownerId),
    index("reminders_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
      table.id,
    ),
    index("reminders_pending_time_idx")
      .on(table.remindAt)
      .where(sql`${table.sentAt} IS NULL AND ${table.deletedAt} IS NULL`),
    check("reminders_version_positive", sql`${table.version} > 0`),
    ...ownerPolicies("reminders", table.ownerId),
  ],
).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  notes: many(notes),
  attachments: many(attachments),
  reminders: many(reminders),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tasks: many(tasks),
  notes: many(notes),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  owner: one(users, { fields: [tasks.ownerId], references: [users.id] }),
  project: one(projects, {
    fields: [tasks.ownerId, tasks.projectId],
    references: [projects.ownerId, projects.id],
  }),
  attachments: many(attachments),
  reminders: many(reminders),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  owner: one(users, { fields: [notes.ownerId], references: [users.id] }),
  project: one(projects, {
    fields: [notes.ownerId, notes.projectId],
    references: [projects.ownerId, projects.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  owner: one(users, { fields: [attachments.ownerId], references: [users.id] }),
  task: one(tasks, {
    fields: [attachments.ownerId, attachments.taskId],
    references: [tasks.ownerId, tasks.id],
  }),
  note: one(notes, {
    fields: [attachments.ownerId, attachments.noteId],
    references: [notes.ownerId, notes.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  owner: one(users, { fields: [reminders.ownerId], references: [users.id] }),
  task: one(tasks, {
    fields: [reminders.ownerId, reminders.taskId],
    references: [tasks.ownerId, tasks.id],
  }),
}));
