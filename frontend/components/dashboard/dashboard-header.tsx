"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Plus,
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  User,
  ShieldAlert,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUserData } from "@/hooks/use-user";
import { useLogout } from "@/hooks/auth";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const pathname = usePathname();
  const { userData } = useUserData();
  const logoutMutation = useLogout();
  const { theme, setTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = userData?.isSuperAdmin ?? false;

  // Breadcrumb generator
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname.includes("/superadmin/tenants")) return "Turfs & Tenants";
    if (pathname.includes("/superadmin/invitations")) return "Invitations";
    if (pathname.includes("/superadmin/audit")) return "Audit Logs";
    if (pathname.includes("/courts")) return "Courts & Venues";
    if (pathname.includes("/slots")) return "Time Slots";
    if (pathname.includes("/bookings")) return "Bookings";
    if (pathname.includes("/payments")) return "Payments";
    if (pathname.includes("/customers")) return "Customers";
    if (pathname.includes("/team")) return "Team Members";
    return "Dashboard";
  };

  const getInitials = (
    firstName?: string | null,
    lastName?: string | null,
    email?: string,
  ) => {
    if (firstName && lastName)
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return "U";
  };

  const initials = getInitials(
    userData?.firstName,
    userData?.lastName,
    userData?.email,
  );
  const fullName =
    [userData?.firstName, userData?.lastName].filter(Boolean).join(" ") ||
    userData?.email ||
    "User";

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      {/* Left side: Mobile Menu Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Sheet Navigation */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <DashboardSidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Page Title & Breadcrumbs */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Turvo</span>
            <span>/</span>
            <span className="text-foreground font-medium">
              {getPageTitle()}
            </span>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Input (Hidden on extra small screens) */}
        <div className="relative hidden sm:block w-48 lg:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search bookings, turfs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 text-xs h-9 bg-muted/40 border-muted"
          />
        </div>

        {/* Active Tenant Context Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex gap-2 text-xs font-medium"
            >
              <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span className="max-w-30 truncate">
                {isSuperAdmin ? "Global Organization" : "Primary Turf"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Tenant Scope
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 font-medium">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>
                {isSuperAdmin
                  ? "All Tenants (Super Admin)"
                  : "Active Turf Organization"}
              </span>
              <Check className="h-3.5 w-3.5 ml-auto text-teal-600" />
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/superadmin/tenants"
                    className="cursor-pointer text-xs"
                  >
                    Manage All Turfs
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Action Button */}
        {isSuperAdmin ? (
          <Button
            asChild
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <Link href="/dashboard/superadmin/tenants/new">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New Turf</span>
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">New Booking</span>
          </Button>
        )}

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-teal-600 ring-2 ring-background" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0"
            >
              <Avatar className="h-9 w-9 border border-teal-600/30">
                <AvatarFallback className="bg-teal-600/10 font-semibold text-xs text-teal-700 dark:text-teal-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{fullName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {userData?.email}
                </p>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-semibold text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950"
                  >
                    {isSuperAdmin ? "Super Admin" : "Tenant Staff"}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>My Profile</span>
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href="/dashboard/superadmin/tenants">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span>Superadmin Controls</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
                <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
