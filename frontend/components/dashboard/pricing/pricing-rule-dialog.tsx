"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle, AlertCircle, DollarSign, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePricingRule, useUpdatePricingRule } from "@/hooks/pricing";
import { useCourts } from "@/hooks/courts";
import type { PricingRule, CreatePricingRuleDto } from "@/lib/types/pricing";
import { DayType } from "@/lib/schemas/pricing";

interface PricingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleToEdit: PricingRule | null;
  onSuccess?: () => void;
}

const defaultFormState: Omit<CreatePricingRuleDto, "price"> & { price: string } = {
  courtId: "",
  dayType: DayType.Weekday,
  startTime: "09:00",
  endTime: "23:00",
  price: "",
};

// Time slot presets for quick selection
const timePresets = [
  { label: "Morning (9AM-12PM)", start: "09:00", end: "12:00" },
  { label: "Afternoon (12PM-5PM)", start: "12:00", end: "17:00" },
  { label: "Evening (5PM-10PM)", start: "17:00", end: "22:00" },
  { label: "Full Day (9AM-11PM)", start: "09:00", end: "23:00" },
];

export function PricingRuleDialog({ open, onOpenChange, ruleToEdit, onSuccess }: PricingRuleDialogProps) {
  const createMutation = useCreatePricingRule();
  const updateMutation = useUpdatePricingRule();

  const { data: courts } = useCourts({ limit: 100 });

  const isEditing = !!ruleToEdit;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<Omit<CreatePricingRuleDto, "price"> & { price: string }>(
    defaultFormState
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [courtHours, setCourtHours] = useState<{ openingTime?: string; closingTime?: string } | null>(null);

  // Reset form when dialog opens/closes or ruleToEdit changes
  useEffect(() => {
    if (open) {
      if (ruleToEdit) {
        setForm({
          courtId: ruleToEdit.courtId,
          dayType: ruleToEdit.dayType,
          startTime: ruleToEdit.startTime,
          endTime: ruleToEdit.endTime,
          price: ruleToEdit.price.toString(),
        });
      } else {
        setForm(defaultFormState);
      }
      setErrors({});
    }
  }, [open, ruleToEdit]);

  // Fetch court hours when courtId changes
  useEffect(() => {
    if (form.courtId && courts?.data) {
      const selectedCourt = courts.data.find((c) => c.id === form.courtId);
      if (selectedCourt) {
        setCourtHours({
          openingTime: selectedCourt.openingTime || undefined,
          closingTime: selectedCourt.closingTime || undefined,
        });
      } else {
        setCourtHours(null);
      }
    } else {
      setCourtHours(null);
    }
  }, [form.courtId, courts]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.courtId) {
      newErrors.courtId = "Court is required";
    }

    if (!form.dayType) {
      newErrors.dayType = "Day type is required";
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(form.startTime)) {
      newErrors.startTime = "Invalid time format (use HH:mm)";
    }
    if (!timeRegex.test(form.endTime)) {
      newErrors.endTime = "Invalid time format (use HH:mm)";
    }

    // Validate that startTime < endTime
    // Special case: endTime of "00:00" (midnight) is treated as 24:00
    if (!newErrors.startTime && !newErrors.endTime) {
      const start = parseTime(form.startTime);
      let end = parseTime(form.endTime);

      // If endTime is midnight (00:00), treat it as 24:00 (1440 minutes)
      if (form.endTime === "00:00") {
        end = 1440; // 24 hours in minutes
      }

      if (start >= end) {
        newErrors.endTime = "End time must be after start time";
      }

      // Validate against court operating hours
      if (courtHours?.openingTime && courtHours?.closingTime) {
        const courtOpen = parseTime(courtHours.openingTime);
        const courtClose = parseTime(courtHours.closingTime);

        // Treat midnight closing as 24:00
        const effectiveClose = courtHours.closingTime === "00:00" ? 1440 : courtClose;

        if (start < courtOpen || end > effectiveClose) {
          newErrors.endTime =
            `Time range must be within court hours (${courtHours.openingTime} - ${courtHours.closingTime})`;
        }
      }
    }

    // Validate price
    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum)) {
      newErrors.price = "Price is required";
    } else if (priceNum <= 0) {
      newErrors.price = "Price must be greater than 0";
    } else if (priceNum >= 1000000) {
      newErrors.price = "Price must be less than 1,000,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data: CreatePricingRuleDto = {
      courtId: form.courtId,
      dayType: form.dayType,
      startTime: form.startTime,
      endTime: form.endTime,
      price: parseFloat(form.price),
    };

    if (isEditing && ruleToEdit) {
      updateMutation.mutate(
        { id: ruleToEdit.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      });
    }
  };

  const handlePresetClick = (preset: { start: string; end: string }) => {
    setForm({ ...form, startTime: preset.start, endTime: preset.end });
    setErrors({ ...errors, startTime: undefined, endTime: undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>{isEditing ? "Edit Pricing Rule" : "Create Pricing Rule"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update the pricing rule for this court and time period."
                  : "Configure pricing for a court and time period."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Court Selection */}
          <div className="space-y-2">
            <Label htmlFor="courtId">
              Court <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.courtId}
              onValueChange={(value) => setForm({ ...form, courtId: value })}
              disabled={isLoading}
            >
              <SelectTrigger id="courtId" className={errors.courtId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a court" />
              </SelectTrigger>
              <SelectContent>
                {courts?.data.map((court) => (
                  <SelectItem key={court.id} value={court.id}>
                    {court.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.courtId && (
              <p className="text-[11px] text-destructive">{errors.courtId}</p>
            )}
          </div>

          {/* Court Operating Hours Info */}
          {courtHours && (
            <div className="bg-muted/50 rounded-lg p-3 text-[11px]">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
                <span className="font-medium text-foreground">
                  Court Hours: {courtHours.openingTime || "06:00"} - {courtHours.closingTime || "23:59"}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                Pricing time range must be within court operating hours
              </p>
            </div>
          )}

          {/* Day Type */}
          <div className="space-y-2">
            <Label htmlFor="dayType">
              Day Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.dayType}
              onValueChange={(value) => setForm({ ...form, dayType: value as typeof DayType[keyof typeof DayType] })}
              disabled={isLoading}
            >
              <SelectTrigger id="dayType" className={errors.dayType ? "border-destructive" : ""}>
                <SelectValue placeholder="Select day type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DayType.Weekday}>Weekday</SelectItem>
                <SelectItem value={DayType.Weekend}>Weekend</SelectItem>
                <SelectItem value={DayType.Holiday}>Holiday</SelectItem>
              </SelectContent>
            </Select>
            {errors.dayType && (
              <p className="text-[11px] text-destructive">{errors.dayType}</p>
            )}
          </div>

          {/* Time Range with Presets */}
          <div className="space-y-2">
            <Label>Time Range <span className="text-destructive">*</span></Label>

            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {timePresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={form.startTime === preset.start && form.endTime === preset.end ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => handlePresetClick(preset)}
                  disabled={isLoading}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Time Validation Warning */}
            {courtHours && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                {form.startTime < (courtHours.openingTime || "00:00") ||
                form.endTime > (courtHours.closingTime || "23:59") ? (
                  <>
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">
                      Warning: Times outside court hours may be rejected
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">
                      Within court operating hours
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Custom Time Inputs */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={errors.startTime ? "border-destructive" : ""}
                  disabled={isLoading}
                />
                {errors.startTime && (
                  <p className="text-[11px] text-destructive mt-1">{errors.startTime}</p>
                )}
              </div>
              <span className="text-muted-foreground pt-2">to</span>
              <div className="flex-1">
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={errors.endTime ? "border-destructive" : ""}
                  disabled={isLoading}
                />
                {errors.endTime && (
                  <p className="text-[11px] text-destructive mt-1">{errors.endTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              Price per Hour (BDT) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="500"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={errors.price ? "border-destructive pr-12" : "pr-12"}
                disabled={isLoading}
              />
              <span className="absolute right-3 top-2 text-muted-foreground text-sm">BDT</span>
            </div>
            {errors.price && (
              <p className="text-[11px] text-destructive">{errors.price}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              This price will be applied to all slots generated within this time range.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-3 text-[11px] text-muted-foreground">
            <p><strong>Note:</strong> Pricing rules are templates used to generate booking slots.
            Changing a rule will only affect newly generated slots, not existing bookings.</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
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
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Update Rule" : "Create Rule"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper function to parse HH:mm time to minutes
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
