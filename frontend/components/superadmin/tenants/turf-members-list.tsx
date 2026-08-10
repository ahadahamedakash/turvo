"use client";

import Link from "next/link";
import { Shield, User, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTenantMembers } from "@/hooks/tenants";
import type { TenantMember } from "@/lib/types/tenant";

interface TurfMembersListProps {
  tenantId: string;
  tenantName: string;
  limit?: number;
  showViewAll?: boolean;
}

function MemberRow({ member }: { member: TenantMember }) {
  const firstName = member.user?.firstName || "";
  const lastName = member.user?.lastName || "";
  const email = member.user?.email || "Unknown Email";

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email;
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : email[0].toUpperCase();

  const roleName = member.roles?.[0]?.name || "Member";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-teal-600/30">
          <AvatarFallback className="bg-teal-600/10 font-bold text-xs text-teal-700 dark:text-teal-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-foreground">{fullName}</span>
          <span className="text-[11px] text-muted-foreground">{email}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[10px] font-medium gap-1 text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/50">
          <Shield className="h-3 w-3" />
          {roleName}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
          Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export function TurfMembersList({
  tenantId,
  tenantName,
  limit = 5,
  showViewAll = true,
}: TurfMembersListProps) {
  const { data: members, isLoading, error } = useTenantMembers(tenantId);

  if (isLoading) {
    return (
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Staff Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const membersList = members || [];
  const displayMembers = membersList.slice(0, limit);

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Staff Members ({membersList.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Users assigned to {tenantName}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {displayMembers.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No staff members assigned to this turf yet.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {displayMembers.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
