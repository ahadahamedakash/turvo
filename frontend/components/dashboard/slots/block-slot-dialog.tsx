"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2 } from "lucide-react";
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
import { RHFTextarea } from "@/components/forms/form-field";
import { useBlockSlot } from "@/hooks/slots";
import { blockSlotSchema, type BlockSlotForm } from "@/lib/schemas/slot";
import type { Slot } from "@/lib/types/slot";
import { SlotStatusBadge } from "./slot-status-badge";

interface BlockSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: Slot | null;
  onSuccess?: () => void;
}

export function BlockSlotDialog({
  open,
  onOpenChange,
  slot,
  onSuccess,
}: BlockSlotDialogProps) {
  const blockMutation = useBlockSlot();

  const form = useForm<BlockSlotForm>({
    resolver: zodResolver(blockSlotSchema),
    defaultValues: { reason: "" },
  });

  // Reset the reason field whenever a new slot is targeted
  useEffect(() => {
    if (open) {
      form.reset({ reason: "" });
    }
  }, [open, slot, form]);

  const onSubmit = (values: BlockSlotForm) => {
    if (!slot) return;

    blockMutation.mutate(
      { slotId: slot.id, data: values },
      {
        onSuccess: () => {
          toast.success("Slot blocked", {
            description: `${slot.courtName ?? "Court"} · ${slot.startTime}–${slot.endTime} is now unavailable.`,
          });
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (error: Error) => {
          toast.error("Failed to block slot", { description: error.message });
        },
      },
    );
  };

  const isLoading = blockMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 text-red-600">
              <Ban className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Close Slot</DialogTitle>
              <DialogDescription>
                Make this time unavailable (e.g. maintenance, private event).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {slot && (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">
                {slot.courtName ?? "Court"}
              </span>
              <SlotStatusBadge status={slot.status} />
            </div>
            <div className="text-muted-foreground">
              {slot.date} · {slot.startTime}–{slot.endTime}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFTextarea
              name="reason"
              label="Reason"
              placeholder="e.g. Court under maintenance"
              rows={3}
              maxLength={255}
              showCount
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
                disabled={isLoading || !slot}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Blocking...
                  </>
                ) : (
                  "Block Slot"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
