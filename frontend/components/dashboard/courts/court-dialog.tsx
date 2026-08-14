"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCourt, useUpdateCourt } from "@/hooks/courts";
import {
  ALLOWED_SLOT_INTERVALS,
  type Court,
  type CourtStatus,
  type CreateCourtDto,
} from "@/lib/types/court";

interface CourtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtToEdit: Court | null;
  onSuccess?: () => void;
}

/**
 * Local form state — fields are always strings/numbers while editing,
 * converted to the DTO shape on submit.
 */
interface CourtFormState {
  name: string;
  description: string;
  status: CourtStatus | "";
  slotIntervalMinutes: number;
}

const defaultFormState: CourtFormState = {
  name: "",
  description: "",
  status: "Available",
  slotIntervalMinutes: 60,
};

export function CourtDialog({ open, onOpenChange, courtToEdit, onSuccess }: CourtDialogProps) {
  const createMutation = useCreateCourt();
  const updateMutation = useUpdateCourt();

  const isEditing = !!courtToEdit;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<CourtFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset the form when the dialog opens with a different court (or for
  // creation). Uses React's render-phase state adjustment instead of an
  // effect so we never call setState inside useEffect.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastDialogState, setLastDialogState] = useState<{
    open: boolean;
    court: Court | null;
  }>({ open: false, court: null });

  if (open !== lastDialogState.open || courtToEdit !== lastDialogState.court) {
    setLastDialogState({ open, court: courtToEdit });
    if (open) {
      setForm(
        courtToEdit
          ? {
              name: courtToEdit.name,
              description: courtToEdit.description ?? "",
              status: courtToEdit.status,
              slotIntervalMinutes: courtToEdit.slotIntervalMinutes ?? 60,
            }
          : defaultFormState,
      );
      setErrors({});
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Court name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Court name must be at least 2 characters";
    }

    if (form.description && form.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data: CreateCourtDto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status || undefined,
      slotIntervalMinutes: form.slotIntervalMinutes,
    };

    if (isEditing && courtToEdit) {
      updateMutation.mutate(
        { id: courtToEdit.id, data },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>{isEditing ? "Edit Court" : "Create New Court"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update court information and status."
                  : "Add a new court to your venue."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Court Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Court Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Court 1 - Main Arena"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the court (surface type, lighting, etc.)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className={errors.description ? "border-destructive resize-none" : "resize-none"}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-[11px] text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm({ ...form, status: value as CourtStatus })}
              disabled={isLoading}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slot Interval */}
          <div className="space-y-2">
            <Label htmlFor="slotInterval">Slot Length</Label>
            <Select
              value={String(form.slotIntervalMinutes)}
              onValueChange={(value) =>
                setForm({ ...form, slotIntervalMinutes: Number(value) })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="slotInterval">
                <SelectValue placeholder="Select slot length" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_SLOT_INTERVALS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Length of each bookable slot generated for this court. Changing it
              only affects dates that don&apos;t have slots yet.
            </p>
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
                isEditing ? "Update Court" : "Create Court"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
