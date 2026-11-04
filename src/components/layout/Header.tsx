"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import { mainNav, services, site } from "@/lib/site";
import { ButtonLink, Container, cx } from "@/components/ui/primitives";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label={`${site.name}, home`} className={cx("inline-flex shrink-0", className)}>
      <Image
        src={site.logo}
        alt={site.name}
        width={2160}
        height={681}
        priority={priority}
        sizes="180px"
        className="h-auto w-[148px] sm:w-[168px]"
      />
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  // Escape + outside click for the dropdown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        if (drawerOpen) {
          setDrawerOpen(false);
          toggleRef.current?.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [drawerOpen]);

  // Lock scroll and move focus into the drawer while it is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    if (drawerOpen) drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 140);
  };

  return (
    <>
    <header
      className={cx(
        "sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 supports-[backdrop-filter]:bg-white/85",
        scrolled ? "border-line shadow-[0_6px_24px_-18px_rgba(19,42,51,0.35)]" : "border-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded focus:bg-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Container className="flex h-[76px] items-center justify-between gap-6 lg:h-[84px]">
        <Logo priority />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) =>
              item.children ? (
                <li
                  key={item.href}
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={openMenu}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    aria-expanded={menuOpen}
                    aria-controls="services-menu"
                    onClick={() => setMenuOpen((v) => !v)}
                    className={cx(
                      "relative inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-2 font-display xl:px-3.5 text-[0.875rem] font-medium transition-colors",
                      isActive(pathname, item.href) ? "text-blue" : "text-slate hover:text-blue",
                    )}
                  >
                    {item.label}
                    <ChevronDown aria-hidden className={cx("size-4 transition-transform duration-200", menuOpen && "rotate-180")} />
                    {isActive(pathname, item.href) && <ActiveBar />}
                  </button>
                  <div
                    id="services-menu"
                    className={cx(
                      "absolute left-1/2 top-full w-[440px] -translate-x-1/2 pt-3 transition-all duration-200",
                      menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
                    )}
                  >
                    <div className="overflow-hidden rounded-[6px] border border-line bg-white shadow-[0_24px_48px_-24px_rgba(19,42,51,0.35)]">
                      <ul className="p-2">
                        {services.map((s) => (
                          <li key={s.href}>
                            <Link
                              href={s.href}
                              className={cx(
                                "group flex gap-4 rounded-[4px] px-4 py-3.5 transition-colors hover:bg-tint",
                                isActive(pathname, s.href) && "bg-tint",
                              )}
                            >
                              <span className="pt-0.5 font-display text-xs font-semibold text-teal-ink">{s.number}</span>
                              <span>
                                <span className="block font-display text-[0.92rem] font-semibold text-slate group-hover:text-blue">
                                  {s.label}
                                </span>
                                <span className="mt-0.5 block text-sm leading-snug text-muted">{s.description}</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/services"
                        className="flex items-center justify-between border-t border-line bg-surface-muted px-6 py-3 font-display text-sm font-semibold text-blue hover:text-blue-deep"
                      >
                        View all services <ArrowUpRight aria-hidden className="size-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={cx(
                      "relative inline-block whitespace-nowrap px-2.5 py-2 font-display xl:px-3.5 text-[0.875rem] font-medium transition-colors",
                      isActive(pathname, item.href) ? "text-blue" : "text-slate hover:text-blue",
                    )}
                  >
                    {item.label}
                    {isActive(pathname, item.href) && <ActiveBar />}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block lg:hidden xl:block">
            <ButtonLink href="/contact" className="whitespace-nowrap !py-2.5">
              Request a Consultation
            </ButtonLink>
          </div>
          <button
            ref={toggleRef}
            type="button"
            className="grid size-11 place-items-center rounded-[4px] text-slate ring-1 ring-inset ring-line lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>
    </header>

      {/* Mobile drawer (outside <header>: its backdrop-filter would trap position:fixed) */}
      <div
        className={cx(
          "fixed inset-x-0 bottom-0 top-[76px] z-40 bg-slate-deep/30 transition-opacity duration-300 lg:hidden",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        inert={!drawerOpen}
        className={cx(
          "fixed bottom-0 right-0 top-[76px] z-50 flex w-full max-w-[420px] flex-col overflow-y-auto border-l border-line bg-white transition-transform duration-300 ease-out lg:hidden",
          drawerOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <nav aria-label="Mobile" className="flex-1 px-6 py-6">
          <ul className="divide-y divide-line">
            {mainNav.map((item) => (
              <li key={item.href} className="py-1">
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cx(
                    "block py-3 font-display text-lg font-semibold",
                    isActive(pathname, item.href) ? "text-blue" : "text-slate",
                  )}
                >
                  {item.label === "Services" ? "All Services" : item.label}
                </Link>
                {item.children && (
                  <ul className="mb-3 ml-1 space-y-1 border-l-2 border-tint pl-4">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          className={cx(
                            "flex items-baseline gap-3 py-2 text-[1rem]",
                            isActive(pathname, c.href) ? "text-blue" : "text-muted",
                          )}
                        >
                          <span className="font-display text-xs font-semibold text-teal-ink">{c.number}</span>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line p-6">
          <ButtonLink href="/contact" className="w-full" arrow>
            Request a Consultation
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

function ActiveBar() {
  return <span aria-hidden className="absolute inset-x-2.5 -bottom-[1px] xl:inset-x-3.5 h-[2px] rounded-full bg-teal" />;
}
