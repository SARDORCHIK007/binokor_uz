"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function FunnelChart({ rows }: { rows: { name: string; value: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <XAxis dataKey="name" tick={{ fill: "#475467", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Bar dataKey="value" fill="#0C1B33" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
