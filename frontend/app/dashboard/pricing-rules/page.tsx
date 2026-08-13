"use client";

import { useState } from "react";
import { DollarSign, Plus, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePricingRules } from "@/hooks/pricing";
import { useCourts } from "@/hooks/courts";
import { PricingDataTable } from "@/components/dashboard/pricing/pricing-data-table";
import { PricingRuleDialog } from "@/components/dashboard/pricing/pricing-rule-dialog";
import type { PricingRule } from "@/lib/types/pricing";
import { DayType } from "@/lib/types/enums";

export default function PricingRulesPage() {
  const [page, setPage] = useState(1);
  const [dayType, setDayType] = useState<DayType | "All">("All");
  const [search, setSearch] = useState("");
  const [courtId, setCourtId] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<PricingRule | null>(null);

  const { data, isLoading, error } = usePricingRules({
    page,
    dayType: dayType === "All" ? undefined : dayType,
    courtId,
  });

  const { data: courts } = useCourts({ limit: 100 });

  // Calculate stats
  const rulesList = data?.data ?? [];
  const totalRules = data?.total ?? 0;
  const avgPrice =
    rulesList.length > 0
      ? Math.round(
          rulesList.reduce((sum, r) => sum + r.price, 0) / rulesList.length,
        )
      : 0;
  const totalSlots = rulesList.reduce((sum, r) => sum + r.slotCount, 0);

  const handleCreateClick = () => {
    setRuleToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (rule: PricingRule) => {
    setRuleToEdit(rule);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Refetch is handled by the mutation's onSuccess
  };

  const handleRefresh = () => {
    setPage(1);
    setDayType("All");
    setSearch("");
    setCourtId(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950"
            >
              <DollarSign className="mr-1 h-3 w-3" /> Pricing
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pricing Rules
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Configure pricing for courts based on day types and time ranges.
            Rules are used to generate booking slots with price snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRefresh}
          >
            <Sparkles className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
            onClick={handleCreateClick}
          >
            <Plus className="h-4 w-4" />
            Add Pricing Rule
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-teal-200/30 bg-teal-50/30 dark:border-teal-900/50 dark:bg-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {totalRules}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-teal-600/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/30 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {avgPrice.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BDT
                  </span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-600/10 flex items-center justify-center">
                <div className="text-green-600 font-semibold text-xs">AVG</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {totalSlots}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">
                How Pricing Rules Work
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pricing rules define price templates for different courts, day
                types, and time ranges. When slots are generated, they capture
                the current price as a snapshot. Changes to pricing rules only
                affect new slots, not existing bookings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center text-xs text-destructive">
            Failed to load pricing rules. Please refresh or verify network
            connection.
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {!isLoading && !error && data && (
        <PricingDataTable
          data={data}
          onPageChange={setPage}
          onDayTypeFilter={setDayType}
          onSearch={setSearch}
          onCourtFilter={setCourtId}
          currentDayType={dayType}
          currentSearch={search}
          currentCourtId={courtId}
          courts={courts?.data ?? []}
          onEditClick={handleEditClick}
        />
      )}

      {/* Create/Edit Dialog */}
      <PricingRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ruleToEdit={ruleToEdit}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
