"use client";

import { ChevronLeft, ChevronRight, Search, DollarSign, Clock, Calendar, MoreHorizontal, Edit, Trash2, Building2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeletePricingRule } from "@/hooks/pricing";
import type { PricingRule, PricingRuleListResponse, DayType } from "@/lib/types/pricing";

interface PricingDataTableProps {
  data: PricingRuleListResponse;
  onPageChange: (page: number) => void;
  onDayTypeFilter: (dayType: DayType | "All") => void;
  onSearch: (search: string) => void;
  onCourtFilter: (courtId: string | undefined) => void;
  currentDayType: DayType | "All";
  currentSearch: string;
  currentCourtId: string | undefined;
  courts: Array<{ id: string; name: string }>;
  onEditClick: (rule: PricingRule) => void;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed bg-card/50 p-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 mb-3">
        <DollarSign className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">
        No Pricing Rules Found
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Showing Page{" "}
        <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DayTypeBadge({ dayType }: { dayType: DayType }) {
  const variants: Record<DayType, string> = {
    Weekday: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
    Weekend: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900",
    Holiday: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  };

  return (
    <Badge variant="outline" className={variants[dayType]}>
      {dayType}
    </Badge>
  );
}

function formatTime(time: string): string {
  // Convert HH:mm to 12-hour format
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return Math.round((end - start) / 60);
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function PricingDataTable({
  data,
  onPageChange,
  onDayTypeFilter,
  onSearch,
  onCourtFilter,
  currentDayType,
  currentSearch,
  currentCourtId,
  courts,
  onEditClick,
}: PricingDataTableProps) {
  const deleteMutation = useDeletePricingRule();

  const handleDelete = (id: string, courtName: string, timeRange: string) => {
    if (confirm(`Are you sure you want to delete pricing rule for "${courtName}" (${timeRange})?`)) {
      deleteMutation.mutate(id);
    }
  };

  const rulesList = data?.data ?? [];
  const weekdayCount = rulesList.filter((r) => r.dayType === "Weekday").length;
  const weekendCount = rulesList.filter((r) => r.dayType === "Weekend").length;
  const holidayCount = rulesList.filter((r) => r.dayType === "Holiday").length;

  return (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/30">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-foreground">{weekdayCount}</span>
          <span className="text-muted-foreground">Weekday</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50/50 border border-purple-200/30">
          <Calendar className="h-3.5 w-3.5 text-purple-600" />
          <span className="font-medium text-foreground">{weekendCount}</span>
          <span className="text-muted-foreground">Weekend</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200/30">
          <Tag className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-medium text-foreground">{holidayCount}</span>
          <span className="text-muted-foreground">Holiday</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{data?.total ?? 0}</span> rules
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by court name..."
              value={currentSearch}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Select value={currentDayType} onValueChange={onDayTypeFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card">
              <SelectValue placeholder="Filter Day Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Day Types</SelectItem>
              <SelectItem value="Weekday">Weekday</SelectItem>
              <SelectItem value="Weekend">Weekend</SelectItem>
              <SelectItem value="Holiday">Holiday</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentCourtId ?? "all"} onValueChange={(value) => onCourtFilter(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-40 h-9 text-xs bg-card">
              <SelectValue placeholder="Filter Court" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courts</SelectItem>
              {courts.map((court) => (
                <SelectItem key={court.id} value={court.id}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty State */}
      {rulesList.length === 0 ? (
        <EmptyState
          message={
            currentSearch
              ? `No pricing rules matching "${currentSearch}"`
              : currentDayType !== "All"
                ? `No ${currentDayType.toLowerCase()} pricing rules found`
                : "No pricing rules configured yet. Create your first rule to get started."
          }
        />
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">Court</th>
                  <th className="p-3.5">Day Type</th>
                  <th className="p-3.5">Time Range</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Slots</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rulesList.map((rule) => (
                  <tr
                    key={rule.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-medium text-foreground">{rule.courtName}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <DayTypeBadge dayType={rule.dayType} />
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(rule.startTime)} - {formatTime(rule.endTime)}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {calculateDuration(rule.startTime, rule.endTime)}h
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="font-semibold text-foreground">{rule.price.toLocaleString()}</span>
                        <span className="text-muted-foreground">/hr</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {rule.slotCount}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onEditClick(rule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Rule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule.id, rule.courtName ?? "Unknown", `${rule.startTime} - ${rule.endTime}`)}
                            disabled={deleteMutation.isPending}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </div>
  );
}
