"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Globe,
  Clock,
  Globe2,
  Users,
  Pencil,
  Building2,
  CalendarCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TurfStatusBadge } from "./turf-status-badge";
import { EditTurfDialog } from "./edit-turf-dialog";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/lib/types/tenant";

interface TurfDetailCardProps {
  tenant: Tenant;
  showActions?: boolean;
  className?: string;
  onRefresh?: () => void;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "Not set";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function TurfDetailCard({
  tenant,
  showActions = true,
  className,
  onRefresh,
}: TurfDetailCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card className={cn("overflow-hidden shadow-xs border-border/80", className)}>
        <CardHeader className="bg-muted/20 pb-4 border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {tenant.name}
                </CardTitle>
                <TurfStatusBadge status={tenant.status} />
              </div>
              <CardDescription className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
                <span>/{tenant.slug}</span>
                <span className="text-border">•</span>
                <span>ID: {tenant.id}</span>
              </CardDescription>
            </div>

            {showActions && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="gap-1.5 text-xs h-9"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Turf
                </Button>
                <Button asChild size="sm" className="gap-1.5 text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white">
                  <Link href={`/dashboard/superadmin/tenants/${tenant.id}/invitations`}>
                    <Mail className="h-3.5 w-3.5" />
                    Manage Invitations
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-muted/30 p-4 border border-border/50">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Staff Members
              </span>
              <p className="text-xl font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-teal-600" />
                {tenant.memberCount ?? 0}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Organization Status
              </span>
              <p className="text-sm font-semibold text-foreground">
                {tenant.status}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Local Timezone
              </span>
              <p className="text-xs font-mono text-foreground truncate">
                {tenant.timezone || "UTC"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Date Registered
              </span>
              <p className="text-xs font-mono text-foreground">
                {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Details List */}
          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                <MapPin className="h-4 w-4 text-teal-600" />
                Location & Web
              </h4>

              <div className="space-y-2 text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Address: </span>
                  {tenant.address || "Not specified"}
                </div>
                {tenant.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-teal-600" />
                    <a
                      href={tenant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                    >
                      {tenant.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-teal-600" />
                Operating Schedule
              </h4>

              <div className="space-y-2 text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Opening Hours: </span>
                  {tenant.openingHour || tenant.closingHour
                    ? `${formatTime(tenant.openingHour)} - ${formatTime(tenant.closingHour)}`
                    : "Standard 24/7 or custom"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Timezone: </span>
                  {tenant.timezone || "Not set"}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {tenant.description && (
            <div className="rounded-lg bg-muted/20 border p-4 space-y-1">
              <h4 className="font-semibold text-xs text-foreground">About Turf</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tenant.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditTurfDialog
        tenant={tenant}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}
