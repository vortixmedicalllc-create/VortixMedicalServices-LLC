/** Display labels for system enum values. Shared by server and client code. */

export const ROLES = ["owner", "admin", "manager", "sales", "operations", "read_only"] as const;
export type Role = (typeof ROLES)[number];
export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  sales: "Sales",
  operations: "Operations",
  read_only: "Read Only",
};

export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "converted", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  converted: "Converted",
  lost: "Lost",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const priorityLabels: Record<Priority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

export const CONTACT_TYPES = ["prospect", "client", "partner", "other"] as const;
export const contactTypeLabels: Record<(typeof CONTACT_TYPES)[number], string> = {
  prospect: "Prospect",
  client: "Client",
  partner: "Partner",
  other: "Other",
};

export const COMPANY_TYPES = ["dme_supplier", "medical_practice", "healthcare_clinic", "medical_group", "billing_organization", "other"] as const;
export const companyTypeLabels: Record<(typeof COMPANY_TYPES)[number], string> = {
  dme_supplier: "DME Supplier",
  medical_practice: "Medical Practice",
  healthcare_clinic: "Healthcare Clinic",
  medical_group: "Medical Group",
  billing_organization: "Billing Organization",
  other: "Other",
};

export const RELATIONSHIP_STATUSES = ["prospect", "active_client", "former_client", "partner", "inactive"] as const;
export const relationshipLabels: Record<(typeof RELATIONSHIP_STATUSES)[number], string> = {
  prospect: "Prospect",
  active_client: "Active Client",
  former_client: "Former Client",
  partner: "Partner",
  inactive: "Inactive",
};

export const TASK_STATUSES = ["todo", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "follow_up", "status_change", "assignment_change", "system"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export const activityTypeLabels: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  follow_up: "Follow-up",
  status_change: "Status Change",
  assignment_change: "Assignment Change",
  system: "System",
};
/** Activity types a person can log manually. */
export const LOGGABLE_ACTIVITY_TYPES = ["call", "email", "meeting", "note", "follow_up"] as const;

export const PAGE_SIZE = 25;
