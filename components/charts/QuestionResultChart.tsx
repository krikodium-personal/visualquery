"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartViewMode, CountRow } from "@/lib/analysis";

const PALETTE = [
  "var(--foreground)",
  "hsl(210 70% 45%)",
  "hsl(25 70% 45%)",
  "hsl(0 65% 50%)",
  "hsl(220 55% 40%)",
  "hsl(160 45% 40%)",
  "hsl(280 40% 50%)",
  "hsl(45 75% 45%)",
];

export function QuestionResultChart({
  data,
  view,
  trendData,
}: {
  data: CountRow[];
  view: Exclude<ChartViewMode, "rating">;
  trendData?: { label: string; value: number }[];
}) {
  if (view === "trend") {
    const points = trendData ?? [];
    if (points.length === 0) {
      return <EmptyChart message="Todavía no hay datos de tendencia." />;
    }
    return (
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (view === "donut") {
    const pieData = data.filter((row) => row.count > 0);
    if (pieData.length === 0) {
      return <EmptyChart message="Todavía no hay respuestas." />;
    }
    return (
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="label"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {pieData.map((row, index) => (
                <Cell key={row.key} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (view === "bar_vertical") {
    return (
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
            <Tooltip cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((row, index) => (
                <Cell key={row.key} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // bar_horizontal
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="count" fill="var(--foreground)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RatingSummaryView({
  average,
  max,
  rows,
}: {
  average: number;
  max: number;
  rows: CountRow[];
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(140px,180px)_1fr] sm:items-center">
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-end gap-2">
          <StarMark className="mb-1 size-8 text-foreground" />
          <span className="text-4xl font-semibold tracking-tight tabular-nums">
            {average.toFixed(2)}
          </span>
          <span className="mb-1 text-lg text-muted-foreground">/{max}</span>
        </div>
        <p className="text-sm text-muted-foreground">Average Rating</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[24px_1fr] items-center gap-3">
            <span className="text-sm tabular-nums text-muted-foreground">{row.label}</span>
            <div className="h-3.5 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm bg-foreground transition-[width]"
                style={{ width: `${(row.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsDataTable({ rows }: { rows: CountRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Opciones de respuesta</th>
            <th className="px-3 py-2 font-medium">Porcentaje</th>
            <th className="px-3 py-2 font-medium">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: PALETTE[index % PALETTE.length] }}
                  />
                  {row.label}
                </span>
              </td>
              <td className="px-3 py-2 tabular-nums">
                {row.percentage.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                %
              </td>
              <td className="px-3 py-2 tabular-nums">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.77l-5.8 3.05 1.11-6.47-4.7-4.58 6.49-.94L12 2.5z"
      />
    </svg>
  );
}
