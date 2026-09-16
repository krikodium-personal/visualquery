"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function QuestionResultChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
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
          <Bar dataKey="count" fill="var(--primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
