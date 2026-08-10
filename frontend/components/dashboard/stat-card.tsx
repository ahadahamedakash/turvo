"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number; // percentage change, e.g. 12.5 or -4.2
    label?: string; // e.g. "vs last week"
  };
  iconVariant?: "emerald" | "blue" | "violet" | "amber" | "rose" | "slate";
  className?: string;
}

const iconVariantStyles = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  slate: "bg-muted text-foreground border-border",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconVariant = "emerald",
  className,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </p>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border transition-transform duration-200 hover:scale-105",
              iconVariantStyles[iconVariant]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>

          {trend && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1 font-medium text-xs border-transparent",
                isPositiveTrend
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
              )}
            >
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {isPositiveTrend ? "+" : ""}
                {trend.value}%
              </span>
            </Badge>
          )}
        </div>

        {(description || trend?.label) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {trend?.label ? `${trend.label}` : description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
