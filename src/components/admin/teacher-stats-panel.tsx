"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { fetchTeacherStatsForRangeAction } from "@/app/admin/teachers/stats-actions";
import type { TeacherStats, TeacherStatsPeriod } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatsPeriod = "today" | "yesterday" | "pastWeek" | "pastMonth" | "custom";

type TeacherStatsPanelProps = {
  teacherId: string;
  salaryPerHour: number;
  stats: TeacherStats;
};

const PERIOD_OPTIONS: { id: StatsPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "pastWeek", label: "Past 7 days" },
  { id: "pastMonth", label: "Past 30 days" },
  { id: "custom", label: "Custom range" },
];

function StatCard({
  title,
  data,
}: {
  title: string;
  data: TeacherStatsPeriod;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-sm">Classes</p>
          <p className="text-2xl font-semibold">{data.total}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Successful</p>
          <p className="text-2xl font-semibold text-emerald-600">{data.successful}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Missed</p>
          <p className="text-2xl font-semibold text-amber-600">{data.missed}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Payment</p>
          <p className="text-2xl font-semibold">${data.payment.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeacherStatsPanel({
  teacherId,
  salaryPerHour,
  stats,
}: TeacherStatsPanelProps) {
  const [period, setPeriod] = useState<StatsPeriod>("today");
  const [customFrom, setCustomFrom] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customStats, setCustomStats] = useState<TeacherStatsPeriod | null>(null);
  const [customLabel, setCustomLabel] = useState("Custom range");
  const [loadingCustom, setLoadingCustom] = useState(false);

  function getPresetStats(): { title: string; data: TeacherStatsPeriod } {
    switch (period) {
      case "yesterday":
        return { title: "Yesterday", data: stats.yesterday };
      case "pastWeek":
        return { title: "Past 7 days", data: stats.pastWeek };
      case "pastMonth":
        return { title: "Past 30 days", data: stats.pastMonth };
      case "custom":
        return {
          title: customLabel,
          data: customStats ?? {
            total: 0,
            successful: 0,
            missed: 0,
            payment: 0,
          },
        };
      case "today":
      default:
        return { title: "Today", data: stats.today };
    }
  }

  async function applyCustomRange() {
    if (!customFrom || !customTo) {
      toast.error("Select both start and end dates.");
      return;
    }

    setLoadingCustom(true);
    const result = await fetchTeacherStatsForRangeAction(
      teacherId,
      salaryPerHour,
      customFrom,
      customTo
    );
    setLoadingCustom(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      setCustomStats(result.data);
      setCustomLabel(
        `${format(new Date(customFrom), "d MMM yyyy")} – ${format(new Date(customTo), "d MMM yyyy")}`
      );
    }
  }

  const { title, data } = getPresetStats();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={period === option.id ? "default" : "outline"}
            onClick={() => setPeriod(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="stats_from">From</Label>
            <Input
              id="stats_from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stats_to">To</Label>
            <Input
              id="stats_to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="w-40"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={loadingCustom}
            onClick={applyCustomRange}
          >
            {loadingCustom ? "Loading…" : "Apply range"}
          </Button>
        </div>
      ) : null}

      <StatCard
        title={title}
        data={data}
      />

      {period === "custom" && !customStats ? (
        <p className={cn("text-sm text-muted-foreground")}>
          Select a date range and click Apply range to view stats.
        </p>
      ) : null}
    </div>
  );
}
