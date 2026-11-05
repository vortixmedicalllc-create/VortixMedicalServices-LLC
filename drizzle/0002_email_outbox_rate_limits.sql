CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_status" text;--> statement-breakpoint
CREATE INDEX "notifications_email_idx" ON "notifications" USING btree ("email_status");