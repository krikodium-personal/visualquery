import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Content } from "@/components/marketing/content";
import { QUESTION_TYPE_GROUPS } from "@/lib/question-types";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const GREEN = "text-[#2e9e6b]";
const RED = "text-[#d6463b]";
const G = "#2e9e6b";
const B = "#3b6cf6";
const R = "#d6463b";

export function SectionTitle({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {children ? <p className="mt-3 text-lg text-muted-foreground">{children}</p> : null}
    </div>
  );
}

function MiniNode({ x, y, w = 70, h = 28, label, stroke }: { x: number; y: number; w?: number; h?: number; label: string; stroke?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} className="fill-background" stroke={stroke ?? "currentColor"} strokeOpacity={stroke ? 1 : 0.25} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={11} className="fill-foreground">
        {label}
      </text>
    </g>
  );
}

/* ---------- Beneficios de armar todo con nodos ---------- */

/** One map instead of rules hidden in menus: every path is a visible line. */
function MapVisual({ t }: { t: Content["benefits"]["map"] }) {
  return (
    <svg viewBox="0 0 320 130" role="img" aria-label={t.aria} className="h-full w-full">
      <g fill="none" strokeWidth={2.5} strokeLinecap="round">
        <path d="M80 65 C115 65 115 25 150 25" stroke={G} />
        <path d="M80 65 C115 65 115 65 150 65" stroke={G} />
        <path d="M80 65 C115 65 115 105 150 105" stroke={G} />
        <path d="M220 25 L250 25" stroke={B} />
        <path d="M220 105 L250 105" stroke={R} />
      </g>
      <MiniNode x={10} y={51} label={t.question} />
      <MiniNode x={150} y={11} label={t.paths[0]} />
      <MiniNode x={150} y={51} label={t.paths[1]} />
      <MiniNode x={150} y={91} label={t.paths[2]} />
      <MiniNode x={250} y={11} w={60} label={t.next} stroke={B} />
      <MiniNode x={250} y={91} w={60} label={t.end} stroke={R} />
    </svg>
  );
}

/** One survey that splits by group, instead of one survey per group. */
function GroupsVisual({ t }: { t: Content["benefits"]["groups"] }) {
  return (
    <svg viewBox="0 0 320 130" role="img" aria-label={t.aria} className="h-full w-full">
      <g fill="none" strokeWidth={2.5} strokeLinecap="round" stroke={G}>
        {t.names.map((_, i) => (
          <path key={i} d={`M100 65 C135 65 135 ${25 + i * 40} 170 ${25 + i * 40}`} />
        ))}
      </g>
      <MiniNode x={10} y={51} w={90} label={t.survey} />
      {t.names.map((label, i) => (
        <MiniNode key={label} x={170} y={11 + i * 40} w={100} label={label} />
      ))}
    </svg>
  );
}

/** Check the survey by walking each path, not by reading rules. */
function TryVisual({ paths }: { paths: string[][] }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 py-2">
      {paths.map((path) => (
        <div key={path[0]} className="flex flex-wrap items-center gap-1.5 text-xs">
          {path.map((step, i) => (
            <span key={step + i} className="flex items-center gap-1.5">
              <span className={cn("rounded-full border px-2.5 py-1", i === 0 && (path === paths[0] ? "border-[#2e9e6b] text-[#2e9e6b]" : "border-[#d6463b] text-[#d6463b]"), i === path.length - 1 && "bg-muted")}>{step}</span>
              {i < path.length - 1 ? <span className="text-muted-foreground">›</span> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Everyone's answers land in one analysis, ready to filter by group. */
function ResultsVisual({ names }: { names: string[] }) {
  const values = [64, 38, 21];
  return (
    <div className="flex h-full flex-col justify-center gap-3 text-xs">
      {names.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
          <span className="h-2.5 rounded-full bg-[#2e9e6b]" style={{ width: `${values[i]}%` }} />
          <span className="tabular-nums">{values[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function BenefitsSection({ t }: { t: Content["benefits"] }) {
  const visuals = [
    <MapVisual key="map" t={t.map} />,
    <GroupsVisual key="groups" t={t.groups} />,
    <TryVisual key="try" paths={t.tryPaths} />,
    <ResultsVisual key="results" names={t.groups.names} />,
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <SectionTitle title={t.title}>{t.intro}</SectionTitle>
      <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2">
        {t.items.map((benefit, i) => (
          <div key={benefit.title} className="flex flex-col gap-5">
            <div className="h-36 rounded-2xl border bg-card px-6 py-4">{visuals[i]}</div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight">{benefit.title}</h3>
              <p className="mt-2 text-muted-foreground">{benefit.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Cómo funciona ---------- */

export function HowItWorks({ t }: { t: Content["how"] }) {
  return (
    <section id="como-funciona" className="scroll-mt-16 border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title={t.title} />
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {t.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border bg-background text-sm font-semibold tabular-nums">{i + 1}</span>
              <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Funciones ---------- */

function Band({ title, text, points, visual, flip }: { title: string; text: string; points: string[]; visual: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={cn(flip && "md:order-2")}>
        <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h3>
        <p className="mt-3 text-lg text-muted-foreground">{text}</p>
        <ul className="mt-5 flex flex-col gap-2 text-sm">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#2e9e6b]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn("rounded-2xl border bg-card p-6", flip && "md:order-1")}>{visual}</div>
    </div>
  );
}

function Row({ left, right, tone }: { left: string; right: string; tone?: "green" | "red" | "blue" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
      <span>{left}</span>
      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", tone === "green" && GREEN, tone === "red" && RED, tone === "blue" && "text-[#3b6cf6]")}>{right}</span>
    </div>
  );
}

/** Question groups: named boxes that hold several cards and move as one piece. */
function GroupsBandVisual({ t }: { t: Content["features"]["groups"] }) {
  const layout = [
    { x: 10, y: 10, stroke: "#64748b" },
    { x: 150, y: 112, stroke: B },
    { x: 10, y: 258, stroke: G },
  ];
  const rowsOf = (count: number) => Math.ceil(count / 2);
  const heightOf = (count: number) => 86 + (rowsOf(count) - 1) * 44;
  return (
    <svg viewBox="0 0 370 354" role="img" aria-label={t.aria} className="h-auto w-full">
      <g fill="none" strokeWidth={2.5} strokeLinecap="round" stroke={B}>
        <path d="M138 82 L138 150 Q138 167 155 167 L160 167" />
        <path d="M328 167 L346 167 Q352 167 352 173 L352 307 Q352 313 346 313 L188 313" />
      </g>
      {layout.map((g, gi) => (
        <g key={t.names[gi]}>
          <rect x={g.x} y={g.y} width={190} height={heightOf(t.nodes[gi].length)} rx={12} fill={g.stroke} fillOpacity={0.07} stroke={g.stroke} strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 4" />
          <rect x={g.x} y={g.y} width={190} height={22} rx={12} fill={g.stroke} fillOpacity={0.15} />
          <text x={g.x + 10} y={g.y + 15} fontSize={11} fontWeight={600} className="fill-foreground">
            {t.names[gi]}
          </text>
          {t.nodes[gi].map((label, i) => (
            <MiniNode key={label} x={g.x + 10 + (i % 2) * 88} y={g.y + 38 + Math.floor(i / 2) * 44} w={80} h={34} label={label} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Features({ t }: { t: Content["features"] }) {
  return (
    <section id="funciones" className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-24 px-6 py-24">
      <SectionTitle title={t.title}>{t.intro}</SectionTitle>

      <Band
        title={t.branches.title}
        text={t.branches.text}
        points={t.branches.points}
        visual={
          <div>
            <p className="font-medium">{t.branches.question}</p>
            <div className="mt-3">
              {t.branches.rows.map(([left, right]) => (
                <Row key={left} left={left} right={right} tone="green" />
              ))}
            </div>
          </div>
        }
      />

      <Band flip title={t.groups.title} text={t.groups.text} points={t.groups.points} visual={<GroupsBandVisual t={t.groups} />} />

      <Band
        title={t.filter.title}
        text={t.filter.text}
        points={t.filter.points}
        visual={
          <div>
            <p className="font-medium">{t.filter.question}</p>
            <div className="mt-3">
              {t.filter.rows.map(([left, right], i) => (
                <Row key={left} left={left} right={right} tone={(["red", "blue", "green"] as const)[i]} />
              ))}
            </div>
          </div>
        }
      />

      <Band
        flip
        title={t.route.title}
        text={t.route.text}
        points={t.route.points}
        visual={
          <div className="flex flex-col gap-3 text-sm">
            {t.route.bars.map((label, i) => {
              const pct = [100, 18, 11][i];
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between"><span>{label}</span><span className="tabular-nums text-muted-foreground">{pct}%</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-[#2e9e6b]" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        }
      />

      <Band
        title={t.links.title}
        text={t.links.text}
        points={t.links.points}
        visual={
          <div>
            {t.links.rows.map(([left, right], i) => (
              <Row key={left} left={left} right={right} tone={i === 1 ? "blue" : undefined} />
            ))}
          </div>
        }
      />
    </section>
  );
}

/* ---------- Tipos de pregunta ---------- */

export function QuestionTypes({ t }: { t: Content["types"] }) {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title={t.title}>{t.intro}</SectionTitle>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTION_TYPE_GROUPS.map((group, i) => (
            <div key={group.label}>
              <h3 className="font-medium">{t.groups[i]}</h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {group.types.map((type) => (
                  <li key={type}>{t.labels[type]}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Casos de uso ---------- */

export function UseCases({ t }: { t: Content["cases"] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <SectionTitle title={t.title} />
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {t.items.map((item) => (
          <div key={item.title} className="border-t pt-5">
            <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-2 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Planes ---------- */

export function PricingTeaser({ t, plans }: { t: Content["teaser"]; plans: Content["pricing"]["plans"] }) {
  const shown = PLANS.filter((plan) => plan.id !== "enterprise");
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title={t.title}>{t.intro}</SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {shown.map((plan) => (
            <div key={plan.id} className={cn("rounded-2xl border bg-card p-6", plan.highlighted && "border-foreground")}>
              <p className="font-medium">{plans[plan.id].name}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {plan.monthly === 0 ? t.free : `US$${plan.yearly}`}
                {plan.monthly ? <span className="text-sm font-normal text-muted-foreground"> {t.perMonth}</span> : null}
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {plans[plan.id].limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Button variant="outline" nativeButton={false} render={<Link href="/precios">{t.button}</Link>} />
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq({ t }: { t: Content["faq"] }) {
  return (
    <section id="preguntas" className="mx-auto w-full max-w-3xl scroll-mt-16 px-6 py-24">
      <SectionTitle title={t.title} />
      <div className="mt-8 divide-y border-y">
        {t.items.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA final + footer ---------- */

export function FinalCta({ loggedIn, t, nav }: { loggedIn: boolean; t: Content["finalCta"]; nav: Content["nav"] }) {
  const label = loggedIn ? nav.mySurveys : nav.start;
  return (
    <section className="border-t bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h2>
        <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={loggedIn ? "/dashboard" : "/signup"}>{label}</Link>} />
      </div>
    </section>
  );
}

export function MarketingFooter({ t }: { t: Content["footer"] }) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Visualquery</p>
        <nav aria-label={t.nav} className="flex gap-5">
          <Link href="/precios" className="hover:text-foreground">{t.plans}</Link>
          <Link href="/login" className="hover:text-foreground">{t.login}</Link>
          <Link href="/signup" className="hover:text-foreground">{t.signup}</Link>
        </nav>
      </div>
    </footer>
  );
}
