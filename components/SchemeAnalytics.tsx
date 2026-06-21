"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

// Hardcoded from Combined Master Dataset V2 — this panel is a standalone
// analytics widget, not wired to the live MyScheme data the rest of the
// schemes page fetches per state/category.
const schemeStats = { total: 4720, central: 680, stateUT: 4040 };

const categories = [
  { name: "Agriculture, Rural & Env", count: 1, color: "#1D9E75" },
  { name: "Banking & Financial", count: 1, color: "#3B82F6" },
  { name: "Education & Learning", count: 1, color: "#A855F7" },
  { name: "Health & Wellness", count: 1, color: "#EF4444" },
  { name: "Housing & Shelter", count: 1, color: "#F59E0B" },
  { name: "Science, IT & Comms", count: 1, color: "#14B8A6" },
  { name: "Skills & Employment", count: 1, color: "#6366F1" },
  { name: "Social Welfare & Emp", count: 1, color: "#F472B6" },
  { name: "Sports & Culture", count: 1, color: "#FB923C" },
  { name: "Transport & Infra", count: 1, color: "#60A5FA" },
  { name: "Travel & Tourism", count: 1, color: "#34D399" },
  { name: "Utility & Sanitation", count: 1, color: "#FBBF24" },
  { name: "Women and Child", count: 1, color: "#F472B6" },
  { name: "Public Safety, Law", count: 1, color: "#818CF8" },
  { name: "Business & Entrepr.", count: 1, color: "#D97706" },
  { name: "Others", count: 7, color: "#374151" },
];

type TabId = "overview" | "category";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "category", label: "By category" },
];

const AXIS_TICK_STYLE = { fill: "var(--text-4)", fontSize: 10 };
const AXIS_LINE_STYLE = { stroke: "var(--border-subtle)" };

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className={`text-base font-medium leading-none ${accent ? "text-[#1D9E75]" : "text-[var(--text-1)]"}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1.5 text-[10px] text-[var(--text-4)]">{label}</div>
    </div>
  );
}

// Local, narrowed prop shapes for Recharts' custom content/tooltip render
// slots — only what these two components actually read, not an attempt to
// mirror Recharts' own (much larger) internal prop types.
interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { name: string } }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const data = item.payload ?? { name: "" };
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] shadow-lg">
      <p className="font-medium text-[var(--text-1)]">{data.name}</p>
      <p className="text-[var(--text-4)]">{item.value} schemes</p>
    </div>
  );
}

function CategoryLegend({ items }: { items: typeof categories }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {items.map((c) => (
        <div key={c.name} className="flex items-center gap-1.5 text-[10px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
          <span className="truncate text-[var(--text-4)]">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

interface TreemapCellProps {
  // All optional — Recharts injects these via cloneElement at render time,
  // so the JSX call site (`<TreemapCell />`, with no props) has none of them.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
}

function TreemapCell({ x = 0, y = 0, width = 0, height = 0, index = 0, name = "" }: TreemapCellProps) {
  if (width < 2 || height < 2) return null;
  const color = categories[index]?.color ?? "#374151";

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="var(--surface-1)" strokeWidth={2} rx={3} />
      {width > 50 && height > 22 && (
        <text x={x + 6} y={y + 16} fontSize={10} fontWeight={500} fill="#fff">
          {name}
        </text>
      )}
    </g>
  );
}

function OverviewTab() {
  return (
    <div className="flex flex-col gap-3">
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={categories} dataKey="count" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {categories.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <CategoryLegend items={categories} />
    </div>
  );
}

function CategoryTab() {
  return (
    <div className="flex flex-col gap-3">
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <BarChart data={categories} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-3)" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={10}>
              {categories.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer>
          <Treemap data={categories} dataKey="count" stroke="var(--surface-1)" content={<TreemapCell />}>
            <Tooltip content={<ChartTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SchemeAnalytics() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-3.5">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total Schemes" value={schemeStats.total} accent />
        <StatCard label="Central" value={schemeStats.central} />
        <StatCard label="State & UT" value={schemeStats.stateUT} />
      </div>

      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-3)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
              tab === t.id ? "bg-[#1D9E75]/10 text-[#1D9E75]" : "text-[var(--text-4)] hover:text-[var(--text-3)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "category" && <CategoryTab />}
    </div>
  );
}
