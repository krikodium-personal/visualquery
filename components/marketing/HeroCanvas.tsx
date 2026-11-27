/**
 * A miniature of the real editor: questions are nodes, every answer has its own port and its own
 * edge. «Sí» walks a two-question branch; «No» skips it and goes straight to the ending. The dots
 * travelling each route show what one respondent sees.
 * Colours match the product: blue = next question, green = branch by answer, red = ending.
 */
import type { Content } from "@/components/marketing/content";

const BLUE = "#3b6cf6";
const GREEN = "#2e9e6b";
const RED = "#d6463b";
const AMBER = "#f5a524";

/** Points of a five-pointed star centred on (cx, cy). */
function starPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}

function Node({
  x,
  y,
  w,
  h,
  title,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  children?: React.ReactNode;
}) {
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

function Port({ x, y, color }: { x: number; y: number; color: string }) {
  return <circle cx={x} cy={y} r={5.5} className="fill-background" stroke={color} strokeWidth={2} />;
}

const YES_ROUTE =
  "M280 263 C330 263 330 70 380 70 L510 70 L510 208 L640 208 C700 208 700 330 740 330";
const NO_ROUTE = "M280 291 C330 291 330 440 430 440 L640 440 C700 440 700 330 740 330";

export function HeroCanvas({ t }: { t: Content["canvas"] }) {
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 960 520"
        role="img"
        aria-label={t.aria}
        className="mx-auto block h-auto min-w-[760px] w-full max-w-[1100px]"
      >
        {/* Edges first, so nodes sit on top. */}
        <g fill="none" strokeWidth={2.5} strokeLinecap="round">
          <path d="M280 263 C330 263 330 70 380 70" stroke={GREEN} />
          <path d="M510 120 L510 150" stroke={BLUE} />
          <path d="M640 208 C700 208 700 330 740 330" stroke={BLUE} />
          <path d="M280 291 C330 291 330 440 430 440 L640 440 C700 440 700 330 740 330" stroke={RED} />
        </g>
        <text x={455} y={464} fontSize={12} className="fill-muted-foreground">
          {t.skip}
        </text>

        {/* Respondents travelling each route; hidden behind nodes while inside them. */}
        <circle r={7} fill={GREEN} visibility="hidden" className="motion-reduce:hidden">
          {/* Start hidden: before the motion kicks in an SVG shape sits at the origin. */}
          <set attributeName="visibility" to="visible" begin="0s" />
          {/* Cross the nodes quickly (the dot is hidden behind them) and travel the arrows at an even pace:
              edge, node, gap, node, edge. Fractions of the route length → fractions of the time. */}
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path={YES_ROUTE}
            calcMode="linear"
            keyPoints="0;0.2877;0.5145;0.5523;0.7892;1"
            keyTimes="0;0.4411;0.528;0.5859;0.6768;1"
          />
        </circle>
        <circle r={7} fill={RED} visibility="hidden" className="motion-reduce:hidden">
          <set attributeName="visibility" to="visible" begin="2s" />
          <animateMotion dur="4s" begin="2s" repeatCount="indefinite" path={NO_ROUTE} calcMode="linear" />
        </circle>

        <Node x={30} y={205} w={250} h={116} title={t.q1}>
          {[
            [t.yes, 267, GREEN],
            [t.no, 295, RED],
          ].map(([label, y, color]) => (
            <g key={String(label)}>
              <line x1={30} x2={280} y1={Number(y) - 17} y2={Number(y) - 17} className="stroke-border" />
              <text x={48} y={y as number} className="fill-foreground" fontSize={13}>
                {label}
              </text>
              <Port x={280} y={Number(y) - 4} color={color as string} />
            </g>
          ))}
        </Node>

        <Node x={380} y={20} w={260} h={100} title={t.q2}>
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon
              key={i}
              points={starPoints(406 + i * 34, 82, 13)}
              fill={i < 2 ? AMBER : "none"}
              stroke={AMBER}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ))}
        </Node>
        <Port x={380} y={70} color={GREEN} />
        <Port x={510} y={120} color={BLUE} />

        <Node x={380} y={150} w={260} h={116} title={t.q3}>
          {[
            [t.options[0], 204, true],
            [t.options[1], 224, false],
            [t.options[2], 244, false],
          ].map(([label, y, checked]) => (
            <g key={String(label)}>
              <rect
                x={398}
                y={Number(y) - 11}
                width={14}
                height={14}
                rx={3}
                className={checked ? "fill-foreground" : "fill-background stroke-border"}
                strokeWidth={1.5}
              />
              {checked ? (
                <path
                  d={`M401 ${Number(y) - 4} l3 3 l6 -7`}
                  fill="none"
                  className="stroke-background"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              <text x={422} y={y as number} className="fill-foreground" fontSize={13}>
                {label}
              </text>
            </g>
          ))}
        </Node>
        <Port x={510} y={150} color={BLUE} />
        <Port x={640} y={208} color={BLUE} />

        <g>
          <rect x={740} y={300} width={190} height={60} rx={30} className="fill-card" stroke={RED} strokeWidth={2} />
          <text x={835} y={335} textAnchor="middle" className="fill-foreground" fontSize={15} fontWeight={600}>
            {t.end}
          </text>
          <Port x={740} y={330} color={BLUE} />
        </g>

        {/* Legend */}
        <g fontSize={12} className="fill-muted-foreground">
          <line x1={30} x2={56} y1={500} y2={500} stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" />
          <text x={64} y={504}>{t.legend[0]}</text>
          <line x1={250} x2={276} y1={500} y2={500} stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" />
          <text x={284} y={504}>{t.legend[1]}</text>
          <line x1={440} x2={466} y1={500} y2={500} stroke={RED} strokeWidth={2.5} strokeLinecap="round" />
          <text x={474} y={504}>{t.legend[2]}</text>
        </g>
      </svg>
    </div>
  );
}
