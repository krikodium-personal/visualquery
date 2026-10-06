"use client";

import {
  BarChart3,
  ChartPie,
  ChevronDown,
  LayoutList,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ChartViewMode } from "@/lib/analysis";

const VIEW_META: Record<
  ChartViewMode,
  { label: string; shortLabel: string; icon: typeof Star }
> = {
  rating: { label: "Valoración", shortLabel: "Valoración", icon: Star },
  bar_vertical: { label: "Barra vertical", shortLabel: "Barra vertical", icon: BarChart3 },
  bar_horizontal: {
    label: "Barra horizontal",
    shortLabel: "Barra horizont...",
    icon: LayoutList,
  },
  donut: { label: "Anillo", shortLabel: "Anillo", icon: ChartPie },
  trend: { label: "Tendencia", shortLabel: "Tendencia", icon: TrendingUp },
};

export function ViewAsMenu({
  views,
  value,
  onChange,
  showTable,
  onShowTableChange,
}: {
  views: ChartViewMode[];
  value: ChartViewMode;
  onChange: (view: ChartViewMode) => void;
  showTable: boolean;
  onShowTableChange: (show: boolean) => void;
}) {
  const current = VIEW_META[value];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Icon className="size-3.5" />
        {current.shortLabel}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-3" sideOffset={6}>
        <p className="px-0 pb-2 text-xs font-normal text-muted-foreground">Ver como</p>
        <div className="grid grid-cols-2 gap-2">
          {views.map((view) => {
            const meta = VIEW_META[view];
            const ViewIcon = meta.icon;
            const selected = view === value;
            return (
              <button
                key={view}
                type="button"
                onClick={() => onChange(view)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors",
                  selected
                    ? "border-emerald-600 bg-emerald-50 text-foreground dark:border-emerald-500 dark:bg-emerald-950/40"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <ViewIcon className="size-5" />
                <span className="line-clamp-1 text-center">{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator className="my-3" />
        <label className="flex items-center justify-between gap-3 px-0.5 text-sm">
          <span>Tabla de datos</span>
          <Switch
            checked={showTable}
            onCheckedChange={onShowTableChange}
            size="sm"
          />
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
