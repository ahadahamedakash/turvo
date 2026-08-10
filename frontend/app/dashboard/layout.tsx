"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUserData } from "@/hooks/use-user";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userData, isLoading, isAuthenticated } = useUserData();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            Loading Turvo Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userData) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans antialiased">
      {/* Desktop Sidebar (hidden on mobile, drawer version handles mobile in DashboardHeader) */}
      <div className="hidden md:flex md:w-64 md:shrink-0 md:flex-col sticky top-0 h-screen">
        <DashboardSidebar />
      </div>

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Sticky Header */}
        <DashboardHeader />

        {/* Page Content */}
        <main className="flex-1 bg-muted/20 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
