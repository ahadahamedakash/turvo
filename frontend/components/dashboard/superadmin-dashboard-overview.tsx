"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  CalendarCheck,
  Banknote,
  Plus,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Mail,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useUserData } from "@/hooks/use-user";

const mockRecentTenants = [
  {
    id: "t-1",
    name: "Dhaka Turf Arena",
    slug: "dhaka-turf-arena",
    address: "Gulshan 2, Dhaka",
    status: "Active",
    createdAt: "2026-08-01",
    membersCount: 5,
    courtsCount: 3,
  },
  {
    id: "t-2",
    name: "Chittagong Sports Complex",
    slug: "chittagong-sports",
    address: "GEC Circle, Chittagong",
    status: "Active",
    createdAt: "2026-07-28",
    membersCount: 4,
    courtsCount: 2,
  },
  {
    id: "t-3",
    name: "Sylhet Futsal Hub",
    slug: "sylhet-futsal",
    address: "Zindabazar, Sylhet",
    status: "Inactive",
    createdAt: "2026-07-15",
    membersCount: 2,
    courtsCount: 2,
  },
  {
    id: "t-4",
    name: "Uttara Night Turf",
    slug: "uttara-night-turf",
    address: "Sector 11, Uttara",
    status: "Active",
    createdAt: "2026-07-10",
    membersCount: 6,
    courtsCount: 4,
  },
];

const mockAuditLogs = [
  {
    id: "log-1",
    action: "Tenant Created",
    entity: "Dhaka Turf Arena",
    user: "Super Admin",
    timestamp: "10 minutes ago",
    type: "Create",
  },
  {
    id: "log-2",
    action: "Role Assigned",
    entity: "Admin -> Rahim Uddin",
    user: "Super Admin",
    timestamp: "1 hour ago",
    type: "Update",
  },
  {
    id: "log-3",
    action: "Invitation Sent",
    entity: "staff@chittagongsports.com",
    user: "Tenant Member",
    timestamp: "3 hours ago",
    type: "Create",
  },
  {
    id: "log-4",
    action: "Court Status Changed",
    entity: "Court 3 -> Maintenance",
    user: "Tenant Member",
    timestamp: "5 hours ago",
    type: "Update",
  },
];

export function SuperadminDashboardOverview() {
  const { userData } = useUserData();

  return (
    <div className="space-y-6">
      {/* Superadmin Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-900 p-6 text-white shadow-md border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Super Admin Portal
            </span>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
              Platform System
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Welcome, System Administrator ({userData?.firstName || "Admin"})
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Multi-tenant SaaS control center. Oversee all registered turf organizations, user memberships, platform activity logs, and global invitations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs shadow-xs">
            <Link href="/dashboard/superadmin/tenants/new">
              <Plus className="h-4 w-4" /> Add New Turf
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs gap-1.5">
            <Link href="/dashboard/superadmin/invitations">
              <Mail className="h-4 w-4" /> Team Invitations
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Platform Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Turfs / Organizations"
          value="24 Tenants"
          icon={Building2}
          trend={{ value: 14.2, label: "+3 new this month" }}
          iconVariant="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value="21 Active"
          description="3 suspended / pending approval"
          icon={CheckCircle2}
          iconVariant="emerald"
        />
        <StatCard
          title="Total Platform Bookings"
          value="1,420"
          icon={CalendarCheck}
          trend={{ value: 22.8, label: "+22.8% vs last month" }}
          iconVariant="violet"
        />
        <StatCard
          title="Gross Platform Revenue"
          value="৳1.85M"
          icon={Banknote}
          trend={{ value: 16.5, label: "+16.5% YTD" }}
          iconVariant="emerald"
        />
      </div>

      {/* Main Grid: Recent Tenants Table & System Audit Log Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Turf Organizations (2 Cols) */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-600" />
                Turf Organizations
              </CardTitle>
              <CardDescription className="text-xs">
                Recently registered multi-tenant turf venues
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-teal-600 hover:text-teal-700 gap-1">
              <Link href="/dashboard/superadmin/tenants">
                View All <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Turf Name</TableHead>
                  <TableHead className="text-xs font-semibold">Address</TableHead>
                  <TableHead className="text-xs font-semibold">Courts</TableHead>
                  <TableHead className="text-xs font-semibold">Staff</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRecentTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="text-xs">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{tenant.name}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">/{tenant.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tenant.address}</TableCell>
                    <TableCell className="font-medium text-foreground">{tenant.courtsCount}</TableCell>
                    <TableCell className="font-medium text-foreground">{tenant.membersCount}</TableCell>
                    <TableCell>
                      {tenant.status === "Active" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                        <Link href={`/dashboard/superadmin/tenants/${tenant.id}`}>
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Audit Activity Feed (1 Col) */}
        <Card className="shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                System Audit Events
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time security and mutation trail across platform
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {mockAuditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.entity}
                    </p>
                    <span className="text-[10px] text-muted-foreground/80 block">
                      By: {log.user}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </div>

          <div className="p-4 border-t">
            <Button variant="outline" size="sm" asChild className="w-full text-xs gap-1">
              <Link href="/dashboard/superadmin/audit">
                View Full Audit Logs <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
