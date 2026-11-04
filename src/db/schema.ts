/**
 * Vortix CRM database schema (PostgreSQL).
 *
 * PRIVACY BOUNDARY: This is a business-relationship CRM. It stores business
 * contacts, companies, opportunities, and follow-up records only. Do NOT add
 * fields or tables for patient data, diagnoses, prescriptions, insurance cards,
 * claims, or any other protected health information (PHI).
 */
import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------- Enums (system values with logic attached) ---------------- */

export const userRole = pgEnum("user_role", ["owner", "admin", "manager", "sales", "operations", "read_only"]);
export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "converted",
  "lost",
]);
export const priority = pgEnum("priority", ["low", "normal", "high", "urgent"]);
export const contactType = pgEnum("contact_type", ["prospect", "client", "partner", "other"]);
export const companyType = pgEnum("company_type", [
  "dme_supplier",
  "medical_practice",
  "healthcare_clinic",
  "medical_group",
  "billing_organization",
  "other",
]);
export const relationshipStatus = pgEnum("relationship_status", ["prospect", "active_client", "former_client", "partner", "inactive"]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "completed", "cancelled"]);
export const activityType = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
  "status_change",
  "assignment_change",
  "system",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ---------------- Users and authentication ---------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    jobTitle: text("job_title"),
    role: userRole("role").notNull().default("read_only"),
    isActive: boolean("is_active").notNull().default(true),
    // scrypt hash; null until the user sets a password through an invite link
    passwordHash: text("password_hash"),
    notificationPrefs: jsonb("notification_prefs").$type<NotificationPrefs>().notNull().default(sql`'{}'::jsonb`),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export type NotificationPrefs = {
  newLeadAssigned?: boolean;
  taskAssigned?: boolean;
  taskDue?: boolean;
  dealChanges?: boolean;
  emailNewLeads?: boolean;
};

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the session token. The raw token only exists in the user's cookie.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** One-time tokens for password reset and invitations. Stored hashed. */
export const authTokens = pgTable("auth_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").$type<"reset" | "invite">().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- Configurable lookups ---------------- */

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name").notNull().default("Vortix Medical Services"),
  logoUrl: text("logo_url").notNull().default("/images/brand/vortix-logo.png"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("America/New_York"),
  // Website lead assignment rule
  assignmentMode: text("assignment_mode").$type<"unassigned" | "user" | "round_robin">().notNull().default("unassigned"),
  assignmentUserId: uuid("assignment_user_id").references(() => users.id, { onDelete: "set null" }),
  roundRobinUserIds: jsonb("round_robin_user_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  roundRobinCursor: integer("round_robin_cursor").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- Core CRM records ---------------- */

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    industry: text("industry"),
    companyType: companyType("company_type").notNull().default("other"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country").default("United States"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    relationshipStatus: relationshipStatus("relationship_status").notNull().default("prospect"),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("companies_name_idx").on(t.nameNormalized), index("companies_owner_idx").on(t.ownerId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    email: text("email"),
    emailNormalized: text("email_normalized"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactType: contactType("contact_type").notNull().default("prospect"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("contacts_email_idx").on(t.emailNormalized),
    index("contacts_company_idx").on(t.companyId),
    index("contacts_owner_idx").on(t.ownerId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    phone: text("phone"),
    companyName: text("company_name"),
    companyNameNormalized: text("company_name_normalized"),
    jobTitle: text("job_title"),
    website: text("website"),
    industry: text("industry"),
    serviceKey: text("service_key"),
    sourceKey: text("source_key").notNull().default("manual"),
    status: leadStatus("status").notNull().default("new"),
    priority: priority("priority").notNull().default("normal"),
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    notes: text("notes"),
    /** Original inquiry text for website-generated leads. */
    inquiryMessage: text("inquiry_message"),
    isWebsiteInquiry: boolean("is_website_inquiry").notNull().default(false),
    possibleDuplicateOfId: uuid("possible_duplicate_of_id"),
    mergedIntoId: uuid("merged_into_id"),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    convertedContactId: uuid("converted_contact_id").references(() => contacts.id, { onDelete: "set null" }),
    convertedCompanyId: uuid("converted_company_id").references(() => companies.id, { onDelete: "set null" }),
    convertedDealId: uuid("converted_deal_id"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("leads_number_uq").on(t.number),
    index("leads_email_idx").on(t.emailNormalized),
    index("leads_company_name_idx").on(t.companyNameNormalized),
    index("leads_status_idx").on(t.status),
    index("leads_assigned_idx").on(t.assignedToId),
    index("leads_created_idx").on(t.createdAt),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull(),
    name: text("name").notNull(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    primaryContactId: uuid("primary_contact_id").references(() => contacts.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    serviceKey: text("service_key"),
    value: numeric("value", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    stageId: integer("stage_id")
      .notNull()
      .references(() => pipelineStages.id),
    probability: integer("probability"),
    expectedCloseDate: date("expected_close_date"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    description: text("description"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("deals_number_uq").on(t.number),
    index("deals_stage_idx").on(t.stageId),
    index("deals_company_idx").on(t.companyId),
    index("deals_owner_idx").on(t.ownerId),
  ],
);

export const dealStageHistory = pgTable("deal_stage_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fromStageId: integer("from_stage_id").references(() => pipelineStages.id),
  toStageId: integer("to_stage_id")
    .notNull()
    .references(() => pipelineStages.id),
  changedById: uuid("changed_by_id").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    priority: priority("priority").notNull().default("normal"),
    status: taskStatus("status").notNull().default("todo"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("tasks_assigned_idx").on(t.assignedToId), index("tasks_due_idx").on(t.dueAt), index("tasks_status_idx").on(t.status)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: activityType("type").notNull(),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activities_lead_idx").on(t.leadId),
    index("activities_contact_idx").on(t.contactId),
    index("activities_company_idx").on(t.companyId),
    index("activities_deal_idx").on(t.dealId),
    index("activities_occurred_idx").on(t.occurredAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    dedupeKey: text("dedupe_key"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt), uniqueIndex("notifications_dedupe_uq").on(t.userId, t.dedupeKey)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/* ---------------- Relations (for typed relational queries) ---------------- */

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, { fields: [companies.ownerId], references: [users.id] }),
  contacts: many(contacts),
  deals: many(deals),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  assignedTo: one(users, { fields: [leads.assignedToId], references: [users.id] }),
  company: one(companies, { fields: [leads.companyId], references: [companies.id] }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  primaryContact: one(contacts, { fields: [deals.primaryContactId], references: [contacts.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
  stage: one(pipelineStages, { fields: [deals.stageId], references: [pipelineStages.id] }),
}));

export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
