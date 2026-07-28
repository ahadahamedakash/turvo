/**
 * Turf Members List
 *
 * Shows a list of members for a turf
 */

'use client'

import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantMembers } from '@/hooks/tenants'
import type { TenantMember } from '@/lib/types/tenant'

interface TurfMembersListProps {
  tenantId: string
  tenantName: string
  limit?: number
  showViewAll?: boolean
}

/**
 * Member row component
 */
function MemberRow({ member }: { member: TenantMember }) {
  const displayName = member.user.isActive
    ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email
    : 'Inactive User'

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="font-medium">{displayName}</p>
        <p className="text-sm text-muted-foreground">{member.user.email}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {member.roles.map((r) => r.name).join(', ')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

/**
 * Members list component
 *
 * Shows:
 * - List of members with roles
 * - "View all" link if more than limit
 */
export function TurfMembersList({
  tenantId,
  tenantName,
  limit = 5,
  showViewAll = true,
}: TurfMembersListProps) {
  const { data: members, isLoading, error } = useTenantMembers(tenantId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (error || !members) {
    return null
  }

  const displayMembers = members.slice(0, limit)
  const hasMore = members.length > limit

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members ({members.length})</CardTitle>
          {showViewAll && members.length > limit && (
            <Link
              href={`/superadmin/tenants/${tenantId}/members`}
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayMembers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No members yet. Invite team members to get started.
          </p>
        ) : (
          <div className="divide-y">
            {displayMembers.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
