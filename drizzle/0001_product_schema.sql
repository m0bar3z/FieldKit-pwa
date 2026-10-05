CREATE TYPE "public"."project_category" AS ENUM('travel', 'work', 'personal');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"task_id" uuid,
	"note_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"storage_key" text,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachments_exactly_one_parent" CHECK (("attachments"."task_id" IS NOT NULL) <> ("attachments"."note_id" IS NOT NULL)),
	CONSTRAINT "attachments_file_name_not_blank" CHECK (length(btrim("attachments"."file_name")) > 0),
	CONSTRAINT "attachments_mime_type_not_blank" CHECK (length(btrim("attachments"."mime_type")) > 0),
	CONSTRAINT "attachments_byte_size_nonnegative" CHECK ("attachments"."byte_size" >= 0),
	CONSTRAINT "attachments_storage_key_not_blank" CHECK ("attachments"."storage_key" IS NULL OR length(btrim("attachments"."storage_key")) > 0),
	CONSTRAINT "attachments_version_positive" CHECK ("attachments"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	CONSTRAINT "notes_owner_id_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "notes_title_not_blank" CHECK (length(btrim("notes"."title")) > 0),
	CONSTRAINT "notes_version_positive" CHECK ("notes"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" "project_category" DEFAULT 'personal' NOT NULL,
	CONSTRAINT "projects_owner_id_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "projects_name_not_blank" CHECK (length(btrim("projects"."name")) > 0),
	CONSTRAINT "projects_version_positive" CHECK ("projects"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"task_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "reminders_version_positive" CHECK ("reminders"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" date,
	CONSTRAINT "tasks_owner_id_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "tasks_title_not_blank" CHECK (length(btrim("tasks"."title")) > 0),
	CONSTRAINT "tasks_version_positive" CHECK ("tasks"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_owner_fk" FOREIGN KEY ("owner_id","task_id") REFERENCES "public"."tasks"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_note_owner_fk" FOREIGN KEY ("owner_id","note_id") REFERENCES "public"."notes"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_owner_fk" FOREIGN KEY ("owner_id","project_id") REFERENCES "public"."projects"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_owner_fk" FOREIGN KEY ("owner_id","task_id") REFERENCES "public"."tasks"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_owner_fk" FOREIGN KEY ("owner_id","project_id") REFERENCES "public"."projects"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_task_owner_idx" ON "attachments" USING btree ("task_id","owner_id");--> statement-breakpoint
CREATE INDEX "attachments_note_owner_idx" ON "attachments" USING btree ("note_id","owner_id");--> statement-breakpoint
CREATE INDEX "attachments_owner_updated_idx" ON "attachments" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "notes_project_owner_idx" ON "notes" USING btree ("project_id","owner_id");--> statement-breakpoint
CREATE INDEX "notes_owner_updated_idx" ON "notes" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "projects_owner_updated_idx" ON "projects" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "reminders_task_owner_idx" ON "reminders" USING btree ("task_id","owner_id");--> statement-breakpoint
CREATE INDEX "reminders_owner_updated_idx" ON "reminders" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "reminders_pending_time_idx" ON "reminders" USING btree ("remind_at") WHERE "reminders"."sent_at" IS NULL AND "reminders"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_project_owner_idx" ON "tasks" USING btree ("project_id","owner_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_updated_idx" ON "tasks" USING btree ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "tasks_owner_due_idx" ON "tasks" USING btree ("owner_id","due_date");