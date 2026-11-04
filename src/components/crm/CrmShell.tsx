"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  Handshake,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Search,
  Settings,
  UserRound,
  UsersRound,
  Inbox,
  X,
  ExternalLink,
} from "lucide-react";
import { cx } from "@/components/ui/primitives";
import { logoutAction } from "@/server/actions/auth";
import { markReadAction } from "@/server/actions/notifications";
import { ToastProvider } from "./client";

type NavKey = "dashboard" | "leads" | "contacts" | "companies" | "deals" | "tasks" | "activities" | "reports" | "team" | "settings";

const NAV: { key: NavKey; label: string; href: string; Icon: typeof Bell }[] = [
  { key: "dashboard", label: "Dashboard", href: "/crm/dashboard", Icon: LayoutDashboard },
  { key: "leads", label: "Leads", href: "/crm/leads", Icon: Inbox },
  { key: "contacts", label: "Contacts", href: "/crm/contacts", Icon: UserRound },
  { key: "companies", label: "Companies", href: "/crm/companies", Icon: Building2 },
  { key: "deals", label: "Deals", href: "/crm/deals", Icon: Handshake },
  { key: "tasks", label: "Tasks", href: "/crm/tasks", Icon: CheckSquare },
  { key: "activities", label: "Activities", href: "/crm/activities", Icon: History },
  { key: "reports", label: "Reports", href: "/crm/reports", Icon: PieChart },
  { key: "team", label: "Team", href: "/crm/team", Icon: UsersRound },
  { key: "settings", label: "Settings", href: "/crm/settings", Icon: Settings },
];

export type ShellNotification = { id: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };

export function CrmShell({
  user,
  allowed,
  unread,
  notifications,
  openTasks,
  children,
}: {
  user: { name: string; email: string; roleLabel: string };
  allowed: NavKey[];
  unread: number;
  notifications: ShellNotification[];
  openTasks: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);

  const nav = (
    <nav aria-label="CRM" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {NAV.filter((n) => allowed.includes(n.key)).map(({ key, label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group flex items-center gap-3 rounded-[6px] px-3 py-2 text-[0.88rem] font-medium transition-colors",
                  active ? "bg-tint text-blue-deep" : "text-[#3d525b] hover:bg-surface-muted hover:text-slate",
                )}
              >
                <Icon aria-hidden className={cx("size-[18px]", active ? "text-blue" : "text-muted group-hover:text-slate")} strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {key === "tasks" && openTasks > 0 && (
                  <span className="rounded-full bg-surface-muted px-1.5 text-[0.7rem] font-semibold text-muted ring-1 ring-line" aria-label={`${openTasks} open tasks`}>
                    {openTasks}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const brand = (
    <div className="flex h-16 items-center border-b border-line px-5">
      <Link href="/crm/dashboard" aria-label="Vortix CRM dashboard" className="flex items-center gap-2.5">
        <Image src="/images/brand/vortix-logo.png" alt="Vortix Medical Services" width={2160} height={681} className="h-auto w-[118px]" priority />
        <span className="rounded-[3px] bg-slate px-1.5 py-0.5 font-display text-[0.62rem] font-bold tracking-[0.12em] text-white">CRM</span>
      </Link>
    </div>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <a href="/" target="_blank" rel="noopener" className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-xs text-muted hover:bg-surface-muted hover:text-slate">
        <ExternalLink aria-hidden className="size-3.5" /> View public website
      </a>
    </div>
  );

  return (
    <ToastProvider>
      <a href="#crm-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded focus:bg-blue focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="min-h-screen bg-surface-muted">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line bg-white lg:flex">
          {brand}
          {nav}
          {footer}
        </aside>

        {/* Mobile drawer */}
        <div className={cx("fixed inset-0 z-50 lg:hidden", drawer ? "" : "pointer-events-none")} aria-hidden={!drawer}>
          <div className={cx("absolute inset-0 bg-slate-deep/40 transition-opacity", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="CRM navigation"
            inert={!drawer}
            className={cx("absolute inset-y-0 left-0 flex w-[272px] flex-col bg-white transition-transform duration-200", drawer ? "translate-x-0" : "-translate-x-full")}
          >
            <div className="relative">
              {brand}
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close navigation" className="absolute right-3 top-4 rounded p-1.5 text-muted hover:bg-surface-muted">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>

        <div className="lg:pl-[240px]">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-sm sm:px-6">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer} className="rounded-[5px] p-2 text-slate ring-1 ring-line lg:hidden">
              <Menu className="size-5" />
            </button>
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-1.5">
              <NotificationBell unread={unread} items={notifications} />
              <UserMenu user={user} />
            </div>
          </header>
          <main id="crm-main" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6 outline-none sm:px-6 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) router.push(`/crm/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor="crm-search" className="sr-only">
        Search leads, contacts, companies, and deals
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        id="crm-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search leads, contacts, companies, deals"
        className="h-10 w-full rounded-[6px] border border-line bg-surface-muted pl-9 pr-3 text-[0.88rem] placeholder:text-muted/80 focus:border-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue/20"
      />
    </form>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return { open, setOpen, ref };
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NotificationBell({ unread, items }: { unread: number; items: ShellNotification[] }) {
  const { open, setOpen, ref } = usePopover();
  const router = useRouter();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-10 place-items-center rounded-[6px] text-slate hover:bg-surface-muted"
      >
        <Bell className="size-5" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-blue px-1 text-[0.65rem] font-bold leading-[18px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-line bg-white shadow-[0_20px_48px_-20px_rgba(19,42,51,0.4)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-bold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-blue hover:underline"
                onClick={async () => {
                  await markReadAction();
                  router.refresh();
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">You have no notifications.</p>
          ) : (
            <ul className="max-h-[380px] divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href || "/crm/notifications"}
                    onClick={() => {
                      setOpen(false);
                      if (!n.readAt) markReadAction([n.id]).then(() => router.refresh());
                    }}
                    className={cx("flex gap-3 px-4 py-3 hover:bg-surface-muted", !n.readAt && "bg-tint/50")}
                  >
                    <span aria-hidden className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-blue")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.85rem] font-semibold text-slate">
                        {!n.readAt && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
                      <span className="mt-1 block text-[0.7rem] text-muted">{timeAgo(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/crm/notifications" onClick={() => setOpen(false)} className="block border-t border-line bg-surface-muted px-4 py-2.5 text-center text-xs font-semibold text-blue hover:underline">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: { name: string; email: string; roleLabel: string } }) {
  const { open, setOpen, ref } = usePopover();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" className="flex items-center gap-2 rounded-[6px] py-1.5 pl-1.5 pr-2 hover:bg-surface-muted">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-slate font-display text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[0.82rem] font-semibold leading-tight text-slate">{user.name}</span>
          <span className="block text-[0.7rem] leading-tight text-muted">{user.roleLabel}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted" />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-[8px] border border-line bg-white py-1 shadow-[0_20px_48px_-20px_rgba(19,42,51,0.4)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link href="/crm/settings/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate hover:bg-surface-muted">
            My profile and notifications
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate hover:bg-surface-muted">
              <LogOut aria-hidden className="size-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
