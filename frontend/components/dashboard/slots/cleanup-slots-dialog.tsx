"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Loader2 } from "lucide-react";
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
import { RHFInput } from "@/components/forms/form-field";
import { useCleanupSlots } from "@/hooks/slots";
import { cleanupSlotsSchema, type CleanupSlotsForm } from "@/lib/schemas/slot";

interface CleanupSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default "before" date (today), computed once at module load (purity rule). */
const DEFAULT_BEFORE_DATE = toISODate(new Date());

export function CleanupSlotsDialog({
  open,
  onOpenChange,
  onSuccess,
}: CleanupSlotsDialogProps) {
  const cleanupMutation = useCleanupSlots();

  const form = useForm<CleanupSlotsForm>({
    resolver: zodResolver(cleanupSlotsSchema),
    defaultValues: { beforeDate: DEFAULT_BEFORE_DATE },
  });

  const onSubmit = (values: CleanupSlotsForm) => {
    cleanupMutation.mutate(values.beforeDate, {
      onSuccess: (result) => {
        toast.success("Cleanup complete", {
          description: `${result.deleted} stale slot${
            result.deleted === 1 ? "" : "s"
          } deleted. Booked slots were kept.`,
        });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast.error("Failed to clean up slots", { description: error.message });
      },
    });
  };

  const isLoading = cleanupMutation.isPending;

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 text-red-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Cleanup Old Slots</DialogTitle>
              <DialogDescription>
                Remove stale inventory to keep the slot table lean.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <p>
            <strong>This permanently deletes</strong> all slots before the chosen
            date that are <strong>not booked</strong> and have no booking
            referencing them. Booked slots and booking history are preserved.
            Slots can always be regenerated from pricing rules.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFInput
              name="beforeDate"
              label="Delete slots before"
              type="date"
              required
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cleaning up...
                  </>
                ) : (
                  "Delete Old Slots"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
