-- AI Services is no longer offered. Keep the category (existing leads and deals still
-- reference it) but hide it from new records and the website form.
UPDATE "service_categories" SET "is_active" = false WHERE "key" = 'ai';
--> statement-breakpoint
UPDATE "service_categories" SET "label" = 'Both Services' WHERE "key" = 'multiple' AND "label" = 'Multiple Services';
