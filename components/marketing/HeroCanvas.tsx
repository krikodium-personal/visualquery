/**
 * A miniature of the real editor: questions are nodes, every answer has its own port and its own
 * edge. The dot travelling along the highlighted route is what one respondent sees.
 * Colours match the product: blue = next question, green = branch by answer, red = ending.
 */
const BLUE = "#3b6cf6";
const GREEN = "#2e9e6b";
const RED = "#d6463b";

type NodeProps = { x: number; y: number; w: number; h: number; title: string };

function Node({ x, y, w, h, title, children }: NodeProps & { children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} className="fill-card stroke-border" strokeWidth={1.5} />
      <text x={x + 18} y={y + 30} className="fill-foreground" fontSize={15} fontWeight={600}>
        {title}
      </text>
      {children}
    </g>
  );
}

function TextBox({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={36} rx={8} className="fill-muted stroke-border" />
      <text x={x + 12} y={y + 23} className="fill-muted-foreground" fontSize={12}>
        Respuesta abierta…
      </text>
    </>
  );
}

export function HeroCanvas() {
  const route = "M280 304 C330 304 330 430 380 430 L640 430 C690 430 690 270 740 270";
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 960 520"
        role="img"
        aria-label="Ejemplo de encuesta en el canvas: una pregunta sobre la experiencia se ramifica en tres preguntas distintas según la respuesta y todas terminan en una pantalla final."
        className="mx-auto block h-auto min-w-[760px] w-full max-w-[1100px]"
      >
        {/* Edges first, so nodes sit on top. */}
        <g fill="none" strokeWidth={2.5} strokeLinecap="round">
          <path d="M280 248 C330 248 330 90 380 90" stroke={GREEN} />
          <path d="M280 276 C330 276 330 260 380 260" stroke={GREEN} />
          <path d="M280 304 C330 304 330 430 380 430" stroke={GREEN} />
          <path d="M640 90 C690 90 690 270 740 270" stroke={BLUE} />
          <path d="M640 260 C690 260 690 270 740 270" stroke={BLUE} />
          <path d="M640 430 C690 430 690 270 740 270" stroke={BLUE} />
        </g>

        <Node x={30} y={190} w={250} h={140} title="¿Cómo fue tu experiencia?">
          {[
            ["Buena", 252],
            ["Regular", 280],
            ["Mala", 308],
          ].map(([label, y]) => (
            <g key={label}>
              <line x1={30} x2={280} y1={Number(y) - 17} y2={Number(y) - 17} className="stroke-border" />
              <text x={48} y={y as number} className="fill-foreground" fontSize={13}>
                {label}
              </text>
              <circle cx={280} cy={Number(y) - 4} r={5.5} className="fill-background" stroke={GREEN} strokeWidth={2} />
            </g>
          ))}
        </Node>

        <Node x={380} y={40} w={260} h={100} title="¿Qué fue lo mejor?">
          <TextBox x={398} y={82} w={224} />
        </Node>
        <Node x={380} y={210} w={260} h={100} title="¿Qué podríamos mejorar?">
          <TextBox x={398} y={252} w={224} />
        </Node>
        <Node x={380} y={380} w={260} h={100} title="¿Qué pasó? Contanos.">
          <TextBox x={398} y={422} w={224} />
        </Node>

        {/* Ports */}
        {[90, 260, 430].map((y) => (
          <g key={y}>
            <circle cx={380} cy={y} r={5.5} className="fill-background" stroke={GREEN} strokeWidth={2} />
            <circle cx={640} cy={y} r={5.5} className="fill-background" stroke={BLUE} strokeWidth={2} />
          </g>
        ))}

        <g>
          <rect x={740} y={240} width={190} height={60} rx={30} className="fill-card" stroke={RED} strokeWidth={2} />
          <text x={835} y={275} textAnchor="middle" className="fill-foreground" fontSize={15} fontWeight={600}>
            Fin · ¡Gracias!
          </text>
          <circle cx={740} cy={270} r={5.5} className="fill-background" stroke={BLUE} strokeWidth={2} />
        </g>

        {/* The route one respondent takes: answered "Mala". */}
        <circle r={7} fill={GREEN} className="motion-reduce:hidden">
          <animateMotion dur="4.5s" repeatCount="indefinite" path={route} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </circle>

        {/* Legend */}
        <g fontSize={12} className="fill-muted-foreground">
          <line x1={30} x2={56} y1={500} y2={500} stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" />
          <text x={64} y={504}>Rama según la respuesta</text>
          <line x1={250} x2={276} y1={500} y2={500} stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" />
          <text x={284} y={504}>Siguiente pregunta</text>
          <line x1={440} x2={466} y1={500} y2={500} stroke={RED} strokeWidth={2.5} strokeLinecap="round" />
          <text x={474} y={504}>Final de la encuesta</text>
        </g>
      </svg>
    </div>
  );
}
