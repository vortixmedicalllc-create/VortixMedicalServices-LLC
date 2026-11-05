/**
 * Custom brand illustrations.
 * Built from forms in the supplied logo: the stethoscope tube curve, the
 * chestpiece ring, and the blue-to-teal blend. Colors reference brand tokens only.
 */
import { useId } from "react";
import { cx } from "@/components/ui/primitives";

function TubeGradient({ id, vertical }: { id: string; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
      <stop offset="0%" stopColor="var(--brand-blue)" />
      <stop offset="55%" stopColor="var(--brand-tube)" />
      <stop offset="100%" stopColor="var(--brand-teal)" />
    </linearGradient>
  );
}

/** Homepage hero composition: one continuous tube from DME intake through billing to payment. */
export function HeroVisual({ className }: { className?: string }) {
  const g = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 560 600" className={className} role="img" aria-labelledby={`${g}-t`}>
      <title id={`${g}-t`}>
        Illustration of a single connected line running from DME operations through the revenue cycle to claims and payment
      </title>
      <defs>
        <TubeGradient id={`${g}-tube`} vertical />
        <pattern id={`${g}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="var(--brand-slate)" opacity="0.13" />
        </pattern>
        <clipPath id={`${g}-clip`}>
          <rect x="0" y="0" width="560" height="600" rx="6" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${g}-clip)`}>
        <rect width="560" height="600" fill="var(--brand-tint)" />
        <rect width="560" height="600" fill={`url(#${g}-dots)`} />
        {/* faint large chestpiece ring */}
        <circle cx="470" cy="120" r="150" fill="none" stroke="var(--brand-blue)" strokeOpacity="0.07" strokeWidth="38" />
        {/* heartbeat trace from the brand cover */}
        <path
          d="M0 572 H250 L268 556 L282 588 L298 520 L316 596 L332 572 H560"
          fill="none"
          stroke="var(--brand-teal)"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* the tube */}
        <path
          className="draw-path"
          style={{ ["--len" as string]: 1400 }}
          d="M110 78 C110 230, 420 170, 420 318 C420 466, 110 380, 110 500"
          fill="none"
          stroke={`url(#${g}-tube)`}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>

      {/* Stations */}
      <Station x={110} y={78} color="var(--brand-blue)" label="DME OPERATIONS" sub="Intake, verification, orders" side="right" />
      <Station x={420} y={318} color="var(--brand-tube)" label="DOCUMENTATION" sub="Orders, records, authorization" side="left" />
      <Station x={110} y={500} color="var(--brand-teal)" label="CLAIMS AND PAYMENT" sub="Submission, posting, follow-up" side="right" />
    </svg>
  );
}

function Station({
  x,
  y,
  color,
  label,
  sub,
  side,
  last,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  sub: string;
  side: "left" | "right";
  last?: boolean;
}) {
  const tx = side === "right" ? x + 44 : x - 44;
  const anchor = side === "right" ? "start" : "end";
  const ty = last ? y - 14 : y - 4;
  return (
    <g>
      <circle cx={x} cy={y} r="26" fill="#fff" stroke={color} strokeWidth="9" />
      <circle cx={x} cy={y} r="10" fill={color} className="pulse-node" />
      <text x={tx} y={ty} textAnchor={anchor} fontFamily="var(--font-display)" fontSize="13" fontWeight="700" letterSpacing="2.4" fill="var(--brand-slate)">
        {label}
      </text>
      <text x={tx} y={ty + 22} textAnchor={anchor} fontFamily="var(--font-sans)" fontSize="15" fill="var(--text-secondary)">
        {sub}
      </text>
    </g>
  );
}

/* ---------------- Equipment line icons (DME) ---------------- */

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const equipmentIcons = {
  wheelchair: (
    <g {...iconProps}>
      <circle cx="20" cy="32" r="11" />
      <circle cx="20" cy="32" r="2" />
      <circle cx="39" cy="40" r="3" />
      <path d="M12 8h5v15h14l5 9v8" />
      <path d="M17 23h-3" />
      <path d="M31 23l3-8h6" />
    </g>
  ),
  bed: (
    <g {...iconProps}>
      <path d="M6 14v28M42 24v18" />
      <path d="M6 30h36" />
      <path d="M6 36h36" />
      <rect x="9" y="23" width="9" height="6" rx="2" />
      <path d="M20 29l4-5h18" />
      <circle cx="11" cy="42" r="2" />
      <circle cx="37" cy="42" r="2" />
    </g>
  ),
  walker: (
    <g {...iconProps}>
      <path d="M15 9h18" />
      <path d="M15 9 10 42M33 9l5 33" />
      <path d="M12 27h24" />
      <path d="M13 13h-2M35 13h2" />
      <circle cx="10" cy="43" r="1.6" />
      <circle cx="38" cy="43" r="1.6" />
    </g>
  ),
  cpap: (
    <g {...iconProps}>
      <rect x="5" y="26" width="22" height="15" rx="3" />
      <circle cx="13" cy="33.5" r="3" />
      <path d="M20 31h4M20 36h4" />
      <path d="M27 33c8 0 9-9 6-14" />
      <path d="M27 9c3-3 9-3 12 0 2 3 0 9-6 11-6-2-8-8-6-11Z" />
      <path d="M41 11l3-2M25 11l-3-2" />
    </g>
  ),
  oxygen: (
    <g {...iconProps}>
      <rect x="16" y="15" width="16" height="28" rx="7" />
      <path d="M21 15v-4h6v4" />
      <path d="M19 7h10" />
      <path d="M24 7V5" />
      <path d="M16 24h16" />
      <path d="M32 11c5 0 8 4 8 9v8" />
    </g>
  ),
  nebulizer: (
    <g {...iconProps}>
      <rect x="4" y="29" width="22" height="13" rx="3" />
      <circle cx="11" cy="35.5" r="2.5" />
      <path d="M19 33h3M19 38h3" />
      <path d="M26 35c9 0 11-6 11-13" />
      <path d="M32 12h10l-2 10h-6Z" />
      <path d="M37 12V7h6" />
    </g>
  ),
  lift: (
    <g {...iconProps}>
      <path d="M8 42h28" />
      <path d="M13 42V8h22" />
      <path d="M13 22l10-14" />
      <path d="M35 8v8" />
      <path d="M29 18c0 8 3 12 6 12s6-4 6-12Z" />
      <circle cx="9" cy="44" r="1.6" />
      <circle cx="35" cy="44" r="1.6" />
    </g>
  ),
  diabetic: (
    <g {...iconProps}>
      <rect x="9" y="8" width="20" height="32" rx="5" />
      <rect x="13" y="12" width="12" height="9" rx="1.5" />
      <circle cx="19" cy="29" r="3" />
      <path d="M29 33h10" />
      <path d="M40 15c-3 4-3.5 7-3.5 8a3.5 3.5 0 0 0 7 0c0-1-.5-4-3.5-8Z" />
    </g>
  ),
  wound: (
    <g {...iconProps}>
      <g transform="rotate(-35 24 24)">
        <rect x="5" y="17" width="38" height="14" rx="7" />
        <rect x="18" y="17" width="12" height="14" />
        <path d="M22 22h.01M26 22h.01M22 26h.01M26 26h.01" strokeWidth="2.4" />
      </g>
    </g>
  ),
};

export type EquipmentKey = keyof typeof equipmentIcons;

export function EquipmentIcon({ name, className }: { name: EquipmentKey; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {equipmentIcons[name]}
    </svg>
  );
}

/* ---------------- Service vignettes (homepage + service heroes) ---------------- */

export function DmeVignette({ className }: { className?: string }) {
  return (
    <div className={cx("relative grid grid-cols-3 gap-px overflow-hidden rounded-[6px] bg-line ring-1 ring-line", className)}>
      {(["wheelchair", "bed", "oxygen", "cpap", "walker", "lift"] as EquipmentKey[]).map((k, i) => (
        <div key={k} className={cx("grid aspect-square place-items-center bg-white", i % 2 === 0 ? "text-blue" : "text-teal-ink")}>
          <EquipmentIcon name={k} className="size-[46%]" />
        </div>
      ))}
    </div>
  );
}

/** A claim moving through stages: abstract, not a dashboard. */
export function BillingVignette({ className }: { className?: string }) {
  const g = useId().replace(/:/g, "");
  const stages = ["Registered", "Coded", "Submitted", "Adjudicated", "Posted"];
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-labelledby={`${g}-t`}>
      <title id={`${g}-t`}>Illustration of a claim progressing through five revenue cycle stages</title>
      <defs>
        <TubeGradient id={`${g}-tube`} />
      </defs>
      <rect width="420" height="300" rx="6" fill="var(--brand-tint)" />
      {/* stacked claim sheets */}
      <g transform="translate(46 44)">
        <rect x="16" y="-10" width="150" height="190" rx="4" fill="#fff" stroke="var(--line)" />
        <rect x="8" y="-4" width="150" height="190" rx="4" fill="#fff" stroke="var(--line)" />
        <rect x="0" y="2" width="150" height="190" rx="4" fill="#fff" stroke="var(--line)" />
        <rect x="16" y="20" width="56" height="8" rx="2" fill="var(--brand-slate)" />
        {[46, 64, 82, 100, 118, 136].map((y, i) => (
          <g key={y}>
            <rect x="16" y={y} width={i % 3 === 0 ? 96 : 118} height="5" rx="2" fill="var(--line)" />
          </g>
        ))}
        <rect x="16" y="160" width="40" height="14" rx="2" fill="var(--brand-teal)" opacity="0.9" />
        <rect x="62" y="160" width="40" height="14" rx="2" fill="var(--brand-blue)" opacity="0.9" />
      </g>
      {/* stage rail */}
      <path d="M252 52 V248" stroke={`url(#${g}-tube)`} strokeWidth="3" strokeLinecap="round" />
      {stages.map((s, i) => {
        const y = 52 + i * 49;
        return (
          <g key={s}>
            <circle cx="252" cy={y} r="8" fill="#fff" stroke={i < 3 ? "var(--brand-blue)" : "var(--brand-teal)"} strokeWidth="3" />
            <text x="272" y={y + 5} fontFamily="var(--font-display)" fontSize="13.5" fontWeight="600" fill="var(--brand-slate)">
              {s}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Revenue cycle ring with numbered stages. Labels are rendered as HTML alongside. */
export function RevenueCycleRing({ count, className }: { count: number; className?: string }) {
  const g = useId().replace(/:/g, "");
  const cx0 = 200;
  const cy0 = 200;
  const r = 150;
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-labelledby={`${g}-t`}>
      <title id={`${g}-t`}>Revenue cycle diagram showing {count} connected stages in a continuous loop</title>
      <defs>
        <linearGradient id={`${g}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-blue)" />
          <stop offset="100%" stopColor="var(--brand-teal)" />
        </linearGradient>
      </defs>
      <circle cx={cx0} cy={cy0} r={r} fill="none" stroke={`url(#${g}-ring)`} strokeWidth="10" />
      <circle cx={cx0} cy={cy0} r={r - 34} fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx={cx0} cy={cy0} r="70" fill="var(--brand-tint)" />
      <text x={cx0} y={cy0 - 6} textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fontWeight="700" letterSpacing="2.5" fill="var(--brand-teal-ink)">
        REVENUE
      </text>
      <text x={cx0} y={cy0 + 14} textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fontWeight="700" letterSpacing="2.5" fill="var(--brand-slate)">
        CYCLE
      </text>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = cx0 + r * Math.cos(a);
        const y = cy0 + r * Math.sin(a);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="19" fill="#fff" stroke={i < count / 2 ? "var(--brand-blue)" : "var(--brand-teal)"} strokeWidth="3" />
            <text x={x} y={y + 4.5} textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fontWeight="700" fill="var(--brand-slate)">
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Decorative tube line used at the edge of page heroes. */
export function TubeFlourish({ className }: { className?: string }) {
  const g = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 600 400" className={className} aria-hidden preserveAspectRatio="none">
      <defs>
        <TubeGradient id={`${g}-t`} />
      </defs>
      <path
        d="M-20 330 C 140 330, 180 120, 330 120 S 520 260, 620 90"
        fill="none"
        stroke={`url(#${g}-t)`}
        strokeWidth="2"
        strokeOpacity="0.55"
      />
      <path
        d="M-20 360 C 160 360, 200 160, 340 160 S 520 300, 620 130"
        fill="none"
        stroke={`url(#${g}-t)`}
        strokeWidth="1"
        strokeOpacity="0.3"
      />
    </svg>
  );
}
