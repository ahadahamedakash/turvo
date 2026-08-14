"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { RHFInput, RHFSelect } from "@/components/forms/form-field";
import { useGenerateSlots, useSlotSettings } from "@/hooks/slots";
import { useCourts } from "@/hooks/courts";
import {
  generateSlotsSchema,
  type GenerateSlotsForm,
  MAX_GENERATE_RANGE_DAYS,
} from "@/lib/schemas/slot";
import { WEEKDAY_LABELS } from "@/lib/types/slot";

interface GenerateSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** Sentinel select value meaning "every court in the organization". */
const ALL_COURTS = "all";

/** Format a Date as YYYY-MM-DD using local components (no timezone shift). */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Default date range for generation, computed once at module load so we never
 * call `new Date()` during render (React purity rule). The user can override
 * both values in the form.
 */
const DEFAULT_START_DATE = toISODate(new Date());
const DEFAULT_END_DATE = toISODate(
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
);

export function GenerateSlotsDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateSlotsDialogProps) {
  const generateMutation = useGenerateSlots();
  const { data: courts } = useCourts({ limit: 100 });
  const { data: settings } = useSlotSettings();

  const form = useForm<GenerateSlotsForm>({
    resolver: zodResolver(generateSlotsSchema),
    defaultValues: {
      courtId: ALL_COURTS,
      startDate: DEFAULT_START_DATE,
      endDate: DEFAULT_END_DATE,
    },
  });

  const courtOptions = [
    { value: ALL_COURTS, label: "All courts" },
    ...(courts?.data.map((court) => ({ value: court.id, label: court.name })) ??
      []),
  ];

  /** Quick range presets — clicking one fills both date fields. */
  const applyPreset = (days: number) => {
    form.setValue("startDate", toISODate(new Date()));
    form.setValue(
      "endDate",
      toISODate(new Date(Date.now() + days * 24 * 60 * 60 * 1000)),
    );
  };

  const weekendLabel = (settings?.weekendDays ?? [5, 6])
    .map((d) => WEEKDAY_LABELS[d]?.slice(0, 3))
    .join(" & ");

  const onSubmit = (values: GenerateSlotsForm) => {
    generateMutation.mutate(
      {
        courtId: values.courtId === ALL_COURTS ? undefined : values.courtId,
        startDate: values.startDate,
        endDate: values.endDate,
      },
      {
        onSuccess: (result) => {
          toast.success("Slots generated", {
            description: `${result.generated} created${
              result.skipped > 0 ? `, ${result.skipped} already existed` : ""
            }.`,
          });
          form.reset();
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast.error("Failed to generate slots", { description: error.message });
        },
      },
    );
  };

  const isLoading = generateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) form.reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Open for Booking</DialogTitle>
              <DialogDescription>
                Turn your pricing rules into bookable slots for a date range.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Quick presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                Quick ranges
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPreset(7)}
                  disabled={isLoading}
                >
                  Next 7 days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPreset(30)}
                  disabled={isLoading}
                >
                  Next 30 days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPreset(90)}
                  disabled={isLoading}
                >
                  Next 90 days
                </Button>
              </div>
            </div>

            <RHFSelect
              name="courtId"
              label="Court"
              placeholder="Select a court"
              options={courtOptions}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <RHFInput name="startDate" label="From" type="date" required />
              <RHFInput name="endDate" label="To" type="date" required />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
              {settings && (
                <p>
                  <strong>Pricing days:</strong> {weekendLabel} count as
                  weekends, holiday dates use holiday pricing (timezone{" "}
                  {settings.timezone}).
                </p>
              )}
              <p>
                Slots use each court&apos;s configured length. Dates that
                already have slots are skipped — max range{" "}
                {MAX_GENERATE_RANGE_DAYS} days.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
