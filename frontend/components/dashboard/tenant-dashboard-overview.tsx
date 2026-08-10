"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Percent,
  Banknote,
  Dumbbell,
  Plus,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  Calendar,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserData } from "@/hooks/use-user";

// Mock data for initial UI presentation (aligned with Prisma model schema)
const mockCourts = [
  { id: "1", name: "Court 1 - Premium Synthetic Turf", status: "Available", currentSlot: "Free until 4:00 PM" },
  { id: "2", name: "Court 2 - Indoor Futsal Arena", status: "Booked", currentSlot: "Booked (3:00 PM - 4:00 PM)" },
  { id: "3", name: "Court 3 - Outdoor Natural Grass", status: "Maintenance", currentSlot: "Under Maintenance" },
  { id: "4", name: "Court 4 - Floodlit Night Turf", status: "Available", currentSlot: "Free until 6:00 PM" },
];

const mockRecentBookings = [
  {
    id: "bk-101",
    customerName: "Rahim Uddin",
    customerPhone: "+880 1712-345678",
    courtName: "Court 1 - Premium Synthetic",
    timeSlot: "Today, 4:00 PM - 5:00 PM",
    amount: "৳1,500.00",
    status: "Confirmed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
  },
  {
    id: "bk-102",
    customerName: "Kamal Hossain",
    customerPhone: "+880 1819-876543",
    courtName: "Court 2 - Indoor Futsal",
    timeSlot: "Today, 5:00 PM - 6:00 PM",
    amount: "৳1,800.00",
    status: "Pending",
    paymentStatus: "Pending",
    paymentMethod: "MobileBanking",
  },
  {
    id: "bk-103",
    customerName: "Tariqul Islam",
    customerPhone: "+880 1911-223344",
    courtName: "Court 4 - Floodlit Night",
    timeSlot: "Today, 6:00 PM - 7:00 PM",
    amount: "৳2,000.00",
    status: "Confirmed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
  },
  {
    id: "bk-104",
    customerName: "Sumon Ahmed",
    customerPhone: "+880 1678-990011",
    courtName: "Court 1 - Premium Synthetic",
    timeSlot: "Today, 7:00 PM - 8:00 PM",
    amount: "৳1,500.00",
    status: "Completed",
    paymentStatus: "Paid",
    paymentMethod: "Cash",
  },
  {
    id: "bk-105",
    customerName: "Anisur Rahman",
    customerPhone: "+880 1552-114455",
    courtName: "Court 3 - Outdoor Natural Grass",
    timeSlot: "Tomorrow, 3:00 PM - 4:00 PM",
    amount: "৳1,200.00",
    status: "Cancelled",
    paymentStatus: "Refunded",
    paymentMethod: "Cash",
  },
];

export function TenantDashboardOverview() {
  const { userData } = useUserData();
  const [timeframe, setTimeframe] = useState<"Today" | "Week" | "Month">("Today");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium">
            <AlertCircle className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
      case "Completed":
        return (
          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-medium">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium">
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCourtStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Available</Badge>;
      case "Booked":
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">In Use</Badge>;
      case "Maintenance":
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-gradient-to-r from-teal-900 to-teal-800 p-6 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              Operational Dashboard
            </span>
            <Badge className="bg-teal-700 text-teal-100 border-teal-600 text-[10px]">
              Active Turf Tenant
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Welcome back, {userData?.firstName || "Turf Manager"}!
          </h2>
          <p className="text-xs text-teal-200/90 max-w-xl">
            Here is your live turf operational summary. Manage court schedules, view today&apos;s bookings, and track payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-lg bg-teal-950/60 p-1 border border-teal-700/50">
            {(["Today", "Week", "Month"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-teal-200 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Bookings"
          value="18 Slots"
          icon={CalendarCheck}
          trend={{ value: 12.5, label: "+2 slots vs yesterday" }}
          iconVariant="emerald"
        />
        <StatCard
          title="Court Occupancy Rate"
          value="84%"
          icon={Percent}
          trend={{ value: 5.4, label: "+5.4% this week" }}
          iconVariant="blue"
        />
        <StatCard
          title="Revenue Collected"
          value="৳24,500.00"
          icon={Banknote}
          trend={{ value: 18.2, label: "+18.2% vs last week" }}
          iconVariant="violet"
        />
        <StatCard
          title="Active Courts"
          value="3 / 4"
          description="1 court under scheduled maintenance"
          icon={Dumbbell}
          iconVariant="amber"
        />
      </div>

      {/* Real-time Court Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-teal-600" />
            Live Court Availability
          </h3>
          <Button variant="ghost" size="sm" asChild className="text-xs text-teal-600 hover:text-teal-700 gap-1">
            <Link href="/dashboard/courts">
              Manage Courts <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockCourts.map((court) => (
            <Card key={court.id} className="transition-all hover:border-teal-500/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                    {court.name}
                  </h4>
                  {getCourtStatusBadge(court.status)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-teal-600" />
                  <span>{court.currentSlot}</span>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] w-full">
                    View Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Bookings Section */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              Recent Turf Bookings
            </CardTitle>
            <CardDescription className="text-xs">
              Live view of slot reservations and customer payments
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-3.5 w-3.5" /> New Booking
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Booking ID</TableHead>
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold">Court</TableHead>
                <TableHead className="text-xs font-semibold">Time Slot</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Payment</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentBookings.map((booking) => (
                <TableRow key={booking.id} className="text-xs">
                  <TableCell className="font-mono font-medium text-foreground">
                    {booking.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{booking.customerName}</span>
                      <span className="text-[11px] text-muted-foreground">{booking.customerPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{booking.courtName}</TableCell>
                  <TableCell className="font-medium text-foreground">{booking.timeSlot}</TableCell>
                  <TableCell className="font-semibold text-foreground">{booking.amount}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {booking.paymentMethod} • {booking.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Record Payment</DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600">Cancel Booking</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
