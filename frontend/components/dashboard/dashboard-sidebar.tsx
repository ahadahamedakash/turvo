"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Ticket,
  CreditCard,
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  Settings,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldAlert,
  User,
  DollarSign,
} from "lucide-react";
import { useUserData } from "@/hooks/use-user";
import { useLogout } from "@/hooks/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
  superAdminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Turf Operations",
    items: [
      {
        title: "Courts & Venues",
        href: "/dashboard/courts",
        icon: Building2,
      },
      {
        title: "Pricing Rules",
        href: "/dashboard/pricing-rules",
        icon: DollarSign,
      },
      {
        title: "Time Slots",
        href: "/dashboard/slots",
        icon: CalendarDays,
      },
      {
        title: "Bookings",
        href: "/dashboard/bookings",
        icon: Ticket,
        badge: "Live",
      },
      {
        title: "Payments",
        href: "/dashboard/payments",
        icon: CreditCard,
      },
      {
        title: "Customers",
        href: "/dashboard/customers",
        icon: Users,
      },
      {
        title: "Team Members",
        href: "/dashboard/team",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "Platform Admin",
    superAdminOnly: true,
    items: [
      {
        title: "Turfs (Tenants)",
        href: "/dashboard/superadmin/tenants",
        icon: Building2,
      },
      {
        title: "Invitations",
        href: "/dashboard/superadmin/invitations",
        icon: Mail,
      },
      {
        title: "Audit Logs",
        href: "/dashboard/superadmin/audit",
        icon: ShieldCheck,
      },
      {
        title: "Platform Settings",
        href: "/dashboard/superadmin/settings",
        icon: Settings,
      },
    ],
  },
];

interface DashboardSidebarProps {
  onNavClick?: () => void;
  className?: string;
}

export function DashboardSidebar({ onNavClick, className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { userData } = useUserData();
  const logoutMutation = useLogout();

  const isSuperAdmin = userData?.isSuperAdmin ?? false;

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return "U";
  };

  const userInitials = getInitials(userData?.firstName, userData?.lastName, userData?.email);
  const fullName = [userData?.firstName, userData?.lastName].filter(Boolean).join(" ") || userData?.email || "User";

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col justify-between border-r bg-card px-4 py-5 text-card-foreground shadow-xs",
        className
      )}
    >
      {/* Top Logo & App Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold shadow-sm shadow-teal-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight">TURVO</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold text-teal-700 bg-teal-50 dark:bg-teal-950 dark:text-teal-300">
                SaaS
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Turf Management System
            </span>
          </div>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs border border-border/50">
            {isSuperAdmin ? (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <User className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            )}
            <div className="flex flex-1 items-center justify-between overflow-hidden">
              <span className="font-medium text-muted-foreground uppercase text-[10px] tracking-wider">
                Role
              </span>
              <span className="font-semibold text-foreground truncate">
                {isSuperAdmin ? "Super Admin" : "Tenant Member"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-5 px-1 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
          {navSections.map((section) => {
            // Hide superadmin sections for regular tenant members
            if (section.superAdminOnly && !isSuperAdmin) {
              return null;
            }

            return (
              <div key={section.label} className="space-y-1.5">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavClick}
                        className={cn(
                          "group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>

                        {item.badge && (
                          <Badge
                            className={cn(
                              "px-1.5 py-0 text-[10px] font-semibold",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}

                        {isActive && !item.badge && (
                          <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Logout */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9 border border-teal-500/30">
              <AvatarFallback className="bg-teal-600/10 font-bold text-teal-700 dark:text-teal-300">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-foreground truncate">
                {fullName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {userData?.email}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span>{logoutMutation.isPending ? "Logging out..." : "Sign Out"}</span>
        </Button>
      </div>
    </aside>
  );
}
