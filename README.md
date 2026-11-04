# Vortix Medical Services: Website and Business CRM

One Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 application with two areas:

- **Public website**: `/`, `/about`, `/services/*`, `/how-we-work`, `/resources`, `/contact`, legal pages, and a custom 404 page.
- **Private CRM**: `/crm/*`. Requires sign-in, with role-based permissions enforced on the server.

The database is PostgreSQL through Drizzle ORM. For local development, the app uses **PGlite**, which is real PostgreSQL running embedded in Node.js, so nothing needs to be installed.

---

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local      # then set CRM_SETUP_TOKEN (see below)
npm run dev                     # http://localhost:3000
```

The local database is created automatically in `./.data/pglite` on first request, and migrations run automatically.

### Create the first administrator (Owner)

There is no default password and no public sign-up.

1. Put a long random value in `CRM_SETUP_TOKEN` in `.env.local`. For example, `openssl rand -base64 32` generates one.
2. Restart the server and open `http://localhost:3000/crm/setup`.
3. Enter the setup token, your name, your email, and a password. Passwords need at least 12 characters, with letters and a number or symbol.
4. The setup page stops working once any user exists. Remove `CRM_SETUP_TOKEN` from the environment afterwards.

### Add team members

Go to **Team → Add Team Member**, choose a role, and the CRM creates a one-time invitation link (valid for 72 hours). If email is configured, the link is emailed. If not, it is shown once to the admin, who shares it through a secure channel. **Reset link** issues password-reset links the same way.

### Quality checks

```bash
npm run typecheck
npm run lint
npm test          # 19 unit and integration tests (in-memory Postgres)
npm run build
```

---

## Deploy to production

1. Provision PostgreSQL (for example Neon, Supabase Postgres, AWS RDS, or Azure Database for PostgreSQL).
2. Set the environment variables (see `.env.example`). At minimum: `DATABASE_URL`, `DATABASE_SSL=true` if TLS is required, `NEXT_PUBLIC_SITE_URL`, `APP_URL`, and `CRM_SETUP_TOKEN` for the first run.
3. Apply migrations with `npm run db:migrate`, or set `DATABASE_AUTO_MIGRATE=true`.
4. Build and start with `npm run build`, then `npm start`. This works on any Node host: Vercel, Render, Railway, Fly.io, or a VM.
5. Create the Owner at `/crm/setup`, then remove `CRM_SETUP_TOKEN`.

> PGlite is for development and testing only. Always use `DATABASE_URL` in production.
> Login rate limiting is per server process. If you run several instances, add a shared store such as Redis.

### Schema changes

Edit `src/db/schema.ts`, run `npm run db:generate` to create a new SQL migration in `drizzle/`, and commit it. Never change a production database by hand.

---

## Architecture overview

```
src/app/(site)/          Public website pages (shared header/footer layout)
src/app/api/contact      Website inquiry endpoint → creates CRM lead
src/app/crm/(auth)/      Login, forgot/reset password, first-time setup
src/app/crm/(app)/       CRM pages (dashboard, leads, contacts, companies, deals,
                         tasks, activities, reports, team, settings, search, notifications)
src/app/crm/export       CSV export route (permission-checked, scoped)
src/db/                  Drizzle schema + connection (Postgres or PGlite)
drizzle/                 SQL migrations (schema + default lookup values)
src/server/              auth, permissions, services, queries, server actions
src/components/crm/      CRM UI (forms, tables, dialogs, charts, timeline)
tests/                   Vitest unit + integration tests
```

### Database (PostgreSQL)

`users`, `sessions`, `auth_tokens`, `companies`, `contacts`, `leads`, `deals`, `deal_stage_history`, `tasks`, `activities`, `notifications`, `audit_logs`, `company_settings`, `pipeline_stages`, `lead_sources`, `service_categories`.

- Records use foreign keys. Deleting a parent never cascades into business records: links are set to null instead.
- Leads, contacts, companies, and deals are **archived** (soft-deleted) and can be restored. Nothing is hard-deleted from the CRM.
- Lead conversion and merges run in database transactions, and every important change writes to `audit_logs`.
- Indexes cover email, company name, status, owner, and date columns.

### Authentication and roles

- Passwords are hashed with Node.js's built-in **scrypt** (per-password salt). Sessions are random 256-bit tokens stored hashed in the database, in an `httpOnly`, `SameSite=Lax` cookie that is also `Secure` in production. Sessions last 7 days.
- Changing a password, resetting it, changing someone's role, or deactivating them signs out their existing sessions.
- Login is rate limited, and the error message does not reveal whether an account exists.
- Roles are Owner, Admin, Manager, Sales, Operations, and Read Only. The full matrix is in `src/server/permissions.ts` and on the Team page.
- Users without "View all records" (Sales) only see records they own, are assigned, or created. That scope is applied to every list, detail page, search, report, server action, and CSV export.
- Server actions validate input with Zod on the server and check permissions before every write.

### Website-to-CRM integration

`POST /api/contact` works as follows:

1. It applies the rate limit, honeypot and minimum fill time, then server-side validation.
2. In one transaction, it creates a lead with source **Website** and status **New**. It flags possible duplicates by email or company (it never discards them) and applies the assignment rule from Settings (unassigned, one user, or round robin).
3. It writes an activity entry and an audit entry, and sends in-app notifications to the assignee, or to Owners and Admins if the lead is unassigned.
4. The visitor sees success **only after the database write succeeds**.
5. If configured, it then sends an email notification and forwards to a webhook. Either can fail without undoing the saved lead.

---

## External services to configure

| Service | Needed for | Without it |
| --- | --- | --- |
| PostgreSQL (`DATABASE_URL`) | Production data | Local PGlite only (not for production) |
| Resend (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`) | Inquiry emails, invitations, reset emails | CRM shows one-time links to admins; self-service "forgot password" tells the user to ask an admin |
| Webhook (`CONTACT_WEBHOOK_URL`) | Forwarding inquiries elsewhere | Not used |

Email sync, calendar sync, and outbound emailing from the CRM are **not implemented**. Emails and meetings are logged manually on each record.

## Missing business information (owner action)

Search the code for `OWNER ACTION` and `TODO(owner)`:

- `src/lib/site.ts`: public email, phone, hours, address, social URLs, legal entity name.
- `src/app/(site)/services/ai/page.tsx`: mark AI capabilities that are actually available.
- `src/app/(site)/services/dme/page.tsx`: confirm billing coordination and refill coordination.
- `src/lib/articles.ts`: sample articles are drafts (noindex) until reviewed and published.
- Privacy Policy and Terms of Use need legal review, including the governing state.
- Photography: none was supplied. The site uses custom SVG illustrations based on the logo.

## Known limitations of this first version

- No Postgres row-level security. Authorization is enforced in one server-side layer (`src/server/permissions.ts`, `scopeWhere`) that every query goes through.
- Lead statuses are fixed. Lead sources, service categories, and pipeline stages can be edited in Settings.
- Notifications are in-app only. Email alerts exist only for new website inquiries, and only when email is configured. Due-date reminders are generated when the user opens the CRM, not by a background scheduler.
- There are no client portal, DME, billing, or AI operations modules yet. The schema and route structure leave room to add them.
- **Privacy boundary:** this is a business-relationship CRM. It must not store patient information or other PHI, and it is not represented as HIPAA compliant. Any future module that handles PHI needs its own security architecture, Business Associate Agreements, and compliance review before it is built.

## Brand system

All colors are sampled from the supplied logo and defined as tokens in `src/app/globals.css`: blue `#0A72BA`, teal `#12A594`, slate `#1D3B47`, tube blend `#0E8BA7`, and tint `#EAF4FA`. Derived shades exist only for hover states and accessible text contrast. Montserrat matches the wordmark. The CRM uses the same tokens.
