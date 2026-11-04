/**
 * Role-based access control. This file is the single source of truth for what
 * each role may do. Every server action and data query checks it; hiding a
 * button in the UI is never relied upon for security.
 */
import type { Role } from "./constants";

export type Permission =
  | "records.view_all" // see every lead/contact/company/deal (otherwise only own/assigned)
  | "records.create"
  | "records.edit_any"
  | "records.edit_own"
  | "records.archive"
  | "records.assign"
  | "records.export"
  | "leads.convert"
  | "leads.merge"
  | "activities.log"
  | "tasks.manage_any"
  | "reports.view"
  | "reports.team"
  | "team.view"
  | "team.manage"
  | "settings.manage"
  | "audit.view";

const all: Permission[] = [
  "records.view_all",
  "records.create",
  "records.edit_any",
  "records.edit_own",
  "records.archive",
  "records.assign",
  "records.export",
  "leads.convert",
  "leads.merge",
  "activities.log",
  "tasks.manage_any",
  "reports.view",
  "reports.team",
  "team.view",
  "team.manage",
  "settings.manage",
  "audit.view",
];

export const rolePermissions: Record<Role, Permission[]> = {
  owner: all,
  // Admins manage data, users (except Owners), and settings.
  admin: all,
  manager: [
    "records.view_all",
    "records.create",
    "records.edit_any",
    "records.edit_own",
    "records.archive",
    "records.assign",
    "records.export",
    "leads.convert",
    "leads.merge",
    "activities.log",
    "tasks.manage_any",
    "reports.view",
    "reports.team",
    "team.view",
  ],
  // Sales sees and works on records assigned to (or created by) them.
  sales: ["records.create", "records.edit_own", "records.export", "leads.convert", "activities.log", "reports.view"],
  // Operations can see business records for context and work on what is assigned to them.
  operations: ["records.view_all", "records.edit_own", "activities.log"],
  read_only: ["records.view_all"],
};

export function can(role: Role, perm: Permission) {
  return rolePermissions[role].includes(perm);
}

export const permissionLabels: Record<Permission, string> = {
  "records.view_all": "View all records",
  "records.create": "Create records",
  "records.edit_any": "Edit any record",
  "records.edit_own": "Edit own or assigned records",
  "records.archive": "Archive and restore records",
  "records.assign": "Assign records to others",
  "records.export": "Export CSV",
  "leads.convert": "Convert leads",
  "leads.merge": "Merge duplicate leads",
  "activities.log": "Log activities and notes",
  "tasks.manage_any": "Manage any task",
  "reports.view": "View reports",
  "reports.team": "View team performance",
  "team.view": "View team",
  "team.manage": "Manage users and roles",
  "settings.manage": "Manage settings",
  "audit.view": "View audit log",
};

export type OwnedRecord = { ownerId?: string | null; assignedToId?: string | null; createdById?: string | null };

/** True when the record belongs to the user (assigned owner or creator). */
export function isOwn(userId: string, r: OwnedRecord) {
  return r.ownerId === userId || r.assignedToId === userId || r.createdById === userId;
}

export function canView(user: { id: string; role: Role }, r: OwnedRecord) {
  return can(user.role, "records.view_all") || isOwn(user.id, r);
}

export function canEdit(user: { id: string; role: Role }, r: OwnedRecord) {
  return can(user.role, "records.edit_any") || (can(user.role, "records.edit_own") && isOwn(user.id, r));
}

/** Whether `actor` may change `target`'s account. Only Owners manage Owners. */
export function canManageUser(actor: { id: string; role: Role }, target: { id: string; role: Role }) {
  if (!can(actor.role, "team.manage")) return false;
  if (target.role === "owner" && actor.role !== "owner") return false;
  return true;
}

export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "owner") return ["owner", "admin", "manager", "sales", "operations", "read_only"];
  if (actorRole === "admin") return ["admin", "manager", "sales", "operations", "read_only"];
  return [];
}
