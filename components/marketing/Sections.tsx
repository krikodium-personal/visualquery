import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_GROUPS, QUESTION_TYPE_LABELS } from "@/lib/question-types";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const GREEN = "text-[#2e9e6b]";
const RED = "text-[#d6463b]";

export function SectionTitle({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {children ? <p className="mt-3 text-lg text-muted-foreground">{children}</p> : null}
    </div>
  );
}

/* ---------- Beneficios de armar todo con nodos ---------- */

const G = "#2e9e6b";
const B = "#3b6cf6";
const R = "#d6463b";

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

/** One map instead of rules hidden in menus: every path is a visible line. */
function MapVisual() {
  return (
    <svg viewBox="0 0 320 130" role="img" aria-label="Tres caminos distintos salen de una misma pregunta y se ven como líneas." className="h-full w-full">
      <g fill="none" strokeWidth={2.5} strokeLinecap="round">
        <path d="M80 65 C115 65 115 25 150 25" stroke={G} />
        <path d="M80 65 C115 65 115 65 150 65" stroke={G} />
        <path d="M80 65 C115 65 115 105 150 105" stroke={G} />
        <path d="M220 25 L250 25" stroke={B} />
        <path d="M220 105 L250 105" stroke={R} />
      </g>
      <MiniNode x={10} y={51} label="Pregunta" />
      <MiniNode x={150} y={11} label="Camino 1" />
      <MiniNode x={150} y={51} label="Camino 2" />
      <MiniNode x={150} y={91} label="Camino 3" />
      <MiniNode x={250} y={11} w={60} label="Sigue" stroke={B} />
      <MiniNode x={250} y={91} w={60} label="Fin" stroke={R} />
    </svg>
  );
}

/** One survey that splits by group, instead of one survey per group. */
function GroupsVisual() {
  const groups = ["Clientes", "Prospectos", "Ex clientes"];
  return (
    <svg viewBox="0 0 320 130" role="img" aria-label="Una sola encuesta se divide en tres grupos." className="h-full w-full">
      <g fill="none" strokeWidth={2.5} strokeLinecap="round" stroke={G}>
        {groups.map((_, i) => (
          <path key={i} d={`M100 65 C135 65 135 ${25 + i * 40} 170 ${25 + i * 40}`} />
        ))}
      </g>
      <MiniNode x={10} y={51} w={90} label="Una encuesta" />
      {groups.map((label, i) => (
        <MiniNode key={label} x={170} y={11 + i * 40} w={100} label={label} />
      ))}
    </svg>
  );
}

/** Check the survey by walking each path, not by reading rules. */
function TryVisual() {
  const paths = [
    ["Sí", "Atención", "Motivo", "Fin"],
    ["No", "Fin"],
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 py-2">
      {paths.map((path) => (
        <div key={path[0]} className="flex flex-wrap items-center gap-1.5 text-xs">
          {path.map((step, i) => (
            <span key={step + i} className="flex items-center gap-1.5">
              <span className={cn("rounded-full border px-2.5 py-1", i === 0 && (step === "Sí" ? "border-[#2e9e6b] text-[#2e9e6b]" : "border-[#d6463b] text-[#d6463b]"), i === path.length - 1 && "bg-muted")}>{step}</span>
              {i < path.length - 1 ? <span className="text-muted-foreground">›</span> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Everyone's answers land in one analysis, ready to filter by group. */
function ResultsVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 text-xs">
      {[
        ["Clientes", 64],
        ["Prospectos", 38],
        ["Ex clientes", 21],
      ].map(([label, n]) => (
        <div key={String(label)} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
          <span className="h-2.5 rounded-full bg-[#2e9e6b]" style={{ width: `${n}%` }} />
          <span className="tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

const BENEFITS = [
  {
    title: "Sin lógica complicada de entender",
    text: "No hay reglas escondidas en menús ni condiciones que descifrar. Cada camino es una línea que podés seguir con el dedo, y cualquier persona del equipo entiende la encuesta en segundos.",
    visual: <MapVisual />,
  },
  {
    title: "Una sola encuesta para todos los grupos",
    text: "Cada grupo recorre su propia rama dentro de la misma encuesta. No necesitás duplicarla por cliente, mercado o segmento, ni mantener cinco versiones al corregir una pregunta.",
    visual: <GroupsVisual />,
  },
  {
    title: "Verificás probando, no leyendo reglas",
    text: "Probá cada camino en la vista previa mientras armás y confirmá que cada respuesta lleva a donde esperabas. Si algo no cierra, reconectás la flecha y listo.",
    visual: <TryVisual />,
  },
  {
    title: "Todos los resultados en un solo lugar",
    text: "Las respuestas de todos los grupos llegan al mismo análisis. Compará grupos, filtrá y mirá el recorrido sin juntar planillas de encuestas distintas.",
    visual: <ResultsVisual />,
  },
];

export function BenefitsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <SectionTitle title="Armar todo visualmente te ahorra trabajo">
        Cuando cada persona necesita un camino distinto, el canvas evita las encuestas duplicadas y las
        reglas que nadie se anima a tocar.
      </SectionTitle>

      <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="flex flex-col gap-5">
            <div className="h-36 rounded-2xl border bg-card px-6 py-4">{benefit.visual}</div>
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

const STEPS = [
  { title: "Sumá preguntas como nodos", text: "Cada pregunta es una tarjeta que acomodás en el canvas. Hay 18 tipos, desde opción múltiple hasta ranking y matrices." },
  { title: "Conectá cada respuesta", text: "Arrastrá una flecha desde una respuesta hasta la pregunta que sigue. Si no conectás nada, pasa a la siguiente." },
  { title: "Publicá y mirá los recorridos", text: "Compartí un enlace y fijate por dónde avanzó cada persona, cuántas llegaron a cada rama y dónde abandonaron." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-16 border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title="Tres pasos, sin menús de lógica" />
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((step, i) => (
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

export function Features() {
  return (
    <section id="funciones" className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-24 px-6 py-24">
      <SectionTitle title="Pensado para encuestas que no son una lista">
        Todo lo que necesitás cuando las preguntas dependen de lo que respondió la persona.
      </SectionTitle>

      <Band
        title="Una rama por cada respuesta"
        text="Cada opción tiene su propia salida. La persona que contesta «Mala» ve preguntas distintas a la que contesta «Buena», sin escribir una sola regla."
        points={["Ramas en opción múltiple, casillas, menús e imágenes", "Pregunta siguiente por defecto cuando no hay rama", "Vista previa en vivo mientras armás"]}
        visual={
          <div>
            <p className="font-medium">¿Cómo fue tu experiencia?</p>
            <div className="mt-3">
              <Row left="Buena" right="→ ¿Qué fue lo mejor?" tone="green" />
              <Row left="Regular" right="→ ¿Qué podríamos mejorar?" tone="green" />
              <Row left="Mala" right="→ ¿Qué pasó? Contanos." tone="green" />
            </div>
          </div>
        }
      />

      <Band
        flip
        title="Filtrá y cerrá en el momento justo"
        text="Terminá la encuesta o descalificá según una respuesta, y limitá cuántas personas pueden elegir cada opción."
        points={["Final o descalificación por respuesta, con mensaje o redirección", "Cupo por opción: se cierra sola al llenarse", "Variables personalizadas capturadas desde el enlace"]}
        visual={
          <div>
            <p className="font-medium">¿Qué edad tenés?</p>
            <div className="mt-3">
              <Row left="Menos de 18" right="Descalificar" tone="red" />
              <Row left="18 a 35" right="Cupo 40 / 50" tone="blue" />
              <Row left="Más de 35" right="Continuar" tone="green" />
            </div>
          </div>
        }
      />

      <Band
        title="Mirá el recorrido, no solo los totales"
        text="Además de los resultados por pregunta, ves por dónde avanzó la gente a través del mismo mapa con el que armaste la encuesta."
        points={["Resumen por pregunta con gráficos y tablas", "Respuestas individuales, filtros, comparación y vistas guardadas", "Exportación a CSV"]}
        visual={
          <div className="flex flex-col gap-3 text-sm">
            {[
              ["Empezaron", 100],
              ["Respondieron «Mala»", 18],
              ["Dejaron su contacto", 11],
            ].map(([label, pct]) => (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between"><span>{label}</span><span className="tabular-nums text-muted-foreground">{pct}%</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-[#2e9e6b]" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        }
      />

      <Band
        flip
        title="Un enlace para cada canal"
        text="Creá varios enlaces de la misma encuesta y compará de dónde vienen las respuestas."
        points={["Código QR, correo, redes e incrustado en tu sitio", "Contraseña, límite de respuestas y fecha de cierre por enlace", "Avisos cuando entran respuestas o se llena un límite"]}
        visual={
          <div>
            <Row left="Enlace web 1" right="48 respuestas" />
            <Row left="Newsletter" right="Límite 200" tone="blue" />
            <Row left="Local de Palermo (QR)" right="Cierra el 30/11" />
          </div>
        }
      />
    </section>
  );
}

/* ---------- Tipos de pregunta ---------- */

export function QuestionTypes() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title="18 tipos de pregunta, todos como nodos">
          Combinalos en el canvas y personalizá cómo se ve la encuesta con tu logo, colores y tipografías.
        </SectionTitle>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTION_TYPE_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="font-medium">{group.label}</h3>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {group.types.map((type) => (
                  <li key={type}>{QUESTION_TYPE_LABELS[type]}</li>
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

const CASES = [
  { title: "Filtros para investigación", text: "Hacé las preguntas de perfil primero y dejá afuera, desde la primera pantalla, a quienes no cumplen. Cerrá cada segmento al llegar a su cupo." },
  { title: "Diagnósticos con puntaje", text: "Armá un test donde cada respuesta suma puntos y las preguntas siguientes dependen de lo que contesta la persona." },
  { title: "NPS con seguimiento", text: "Preguntá cuánto recomendarían y, según la nota, pedí el motivo, ofrecé contacto o agradecé y cerrá." },
];

export function UseCases() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <SectionTitle title="Donde un canvas se nota" />
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {CASES.map((item) => (
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

export function PricingTeaser() {
  const shown = PLANS.filter((plan) => plan.id !== "enterprise");
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionTitle title="Empezá gratis">
          Probá el canvas sin tarjeta. Pasá a un plan pago cuando necesites más respuestas o más enlaces.
        </SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {shown.map((plan) => (
            <div key={plan.id} className={cn("rounded-2xl border bg-card p-6", plan.highlighted && "border-foreground")}>
              <p className="font-medium">{plan.name}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {plan.monthly === 0 ? "Gratis" : `US$${plan.yearly}`}
                {plan.monthly ? <span className="text-sm font-normal text-muted-foreground"> /mes</span> : null}
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {plan.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Button variant="outline" nativeButton={false} render={<Link href="/precios">Ver planes y precios</Link>} />
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQ = [
  { q: "¿Tengo que saber programar o escribir reglas?", a: "No. La lógica se arma conectando nodos: elegís una respuesta y la unís con la pregunta que sigue." },
  { q: "¿Cuántas ramas puedo armar?", a: "Todas las que necesites. Cada opción de una pregunta de selección puede llevar a una pregunta distinta o terminar la encuesta." },
  { q: "¿Cómo la comparto?", a: "Con un enlace, un código QR o incrustada en tu sitio. Podés crear varios enlaces de la misma encuesta, cada uno con su contraseña, límite y fecha de cierre." },
  { q: "¿Puedo sacar los resultados?", a: "Sí, desde el análisis exportás las respuestas a CSV. La exportación a Excel y PDF está en camino." },
  { q: "¿Qué incluye el plan gratis?", a: "3 encuestas con hasta 10 preguntas y 100 respuestas por mes, con el canvas completo. Las encuestas muestran un aviso de Visualquery." },
];

export function Faq() {
  return (
    <section id="preguntas" className="mx-auto w-full max-w-3xl scroll-mt-16 px-6 py-24">
      <SectionTitle title="Preguntas frecuentes" />
      <div className="mt-8 divide-y border-y">
        {FAQ.map((item) => (
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

export function FinalCta({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="border-t bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Armá tu primera encuesta como un mapa</h2>
        <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={loggedIn ? "/dashboard" : "/signup"}>{loggedIn ? "Ir a mis encuestas" : "Empezar gratis"}</Link>} />
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Visualquery</p>
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link href="/precios" className="hover:text-foreground">Planes</Link>
          <Link href="/login" className="hover:text-foreground">Iniciar sesión</Link>
          <Link href="/signup" className="hover:text-foreground">Crear cuenta</Link>
        </nav>
      </div>
    </footer>
  );
}
