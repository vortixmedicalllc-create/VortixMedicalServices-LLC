import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10", className)}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "light" | "outline-light";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white hover:bg-blue-deep shadow-[0_1px_0_rgba(19,42,51,0.08)]",
  secondary: "bg-white text-slate ring-1 ring-inset ring-line hover:ring-blue hover:text-blue",
  ghost: "text-blue hover:text-blue-deep px-0",
  light: "bg-white text-slate hover:bg-tint",
  "outline-light": "text-white ring-1 ring-inset ring-white/40 hover:ring-white hover:bg-white/5",
};

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  arrow,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; arrow?: boolean }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center justify-center gap-2 rounded-[4px] px-5 py-3 font-display text-[0.9rem] font-semibold tracking-[-0.005em] transition-colors duration-200",
        buttonStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {arrow && (
        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}

/** Inline text link with an animated arrow. */
export function ArrowLink({ href, children, className, tone = "blue" }: { href: string; children: ReactNode; className?: string; tone?: "blue" | "light" }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center gap-2 font-display text-[0.9rem] font-semibold",
        tone === "blue" ? "text-blue hover:text-blue-deep" : "text-white hover:text-teal-soft",
        className,
      )}
    >
      <span className="border-b border-current/30 pb-0.5 transition-colors group-hover:border-current">{children}</span>
      <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

export function Eyebrow({ children, className, tone = "teal" }: { children: ReactNode; className?: string; tone?: "teal" | "light" }) {
  return <p className={cx("eyebrow", tone === "light" && "!text-teal-soft", className)}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
  as: Tag = "h2",
  tone = "dark",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
  tone?: "dark" | "light";
}) {
  return (
    <div className={cx("reveal max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow tone={tone === "light" ? "light" : "teal"}>{eyebrow}</Eyebrow>}
      <Tag
        className={cx(
          "mt-4 text-[2rem] font-bold leading-[1.12] sm:text-[2.5rem] lg:text-[2.75rem]",
          tone === "light" && "!text-white",
        )}
      >
        {title}
      </Tag>
      {intro && (
        <div className={cx("mt-5 text-lg leading-relaxed", tone === "light" ? "text-white/75" : "text-muted")}>{intro}</div>
      )}
    </div>
  );
}

export function Section({
  id,
  className,
  children,
  tone = "white",
  labelledBy,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  tone?: "white" | "muted" | "tint" | "slate";
  labelledBy?: string;
}) {
  const tones = {
    white: "bg-white",
    muted: "bg-surface-muted",
    tint: "bg-tint",
    slate: "bg-slate text-white",
  };
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("py-20 sm:py-24 lg:py-28", tones[tone], className)}>
      {children}
    </section>
  );
}

/** Small note used to flag owner-confirmable content in the UI without looking broken. */
export function ScopeNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("border-l-2 border-teal pl-4 text-sm leading-relaxed text-muted", className)}>{children}</p>
  );
}
