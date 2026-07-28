/**
 * Turf Detail Card
 *
 * Displays detailed information about a single turf/tenant
 */

import Link from 'next/link'
import { MapPin, Globe, Clock, Globe2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TurfStatusBadge } from './turf-status-badge'
import { cn } from '@/lib/utils'
import type { Tenant } from '@/lib/types/tenant'

interface TurfDetailCardProps {
  tenant: Tenant
  showActions?: boolean
  className?: string
}

/**
 * Format time from HH:mm to readable format
 */
function formatTime(time: string | null | undefined): string {
  if (!time) return 'Not set'
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

/**
 * Stats row component
 */
interface StatsRowProps {
  members?: number
  bookings?: number
  customers?: number
}

function StatsRow({ members, bookings, customers }: StatsRowProps) {
  const stats = [
    { label: 'Members', value: members ?? 0 },
    { label: 'Bookings', value: bookings ?? 0 },
    { label: 'Customers', value: customers ?? 0 },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-2xl font-semibold">{stat.value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * Turf detail card component
 *
 * Shows:
 * - Turf name and slug
 * - Status badge
 * - Stats (members, bookings, customers)
 * - Address, website, hours, timezone
 * - Action buttons
 */
export function TurfDetailCard({
  tenant,
  showActions = true,
  className,
}: TurfDetailCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl">{tenant.name}</CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              {tenant.slug}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <TurfStatusBadge status={tenant.status} />
            {showActions && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/superadmin/tenants/${tenant.id}/edit`}>
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <StatsRow members={tenant.memberCount} />

        {/* Location and contact info */}
        <div className="space-y-3 text-sm">
          {tenant.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{tenant.address}</span>
            </div>
          )}
          {tenant.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={tenant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {tenant.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {(tenant.openingHour || tenant.closingHour) && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                Open: {formatTime(tenant.openingHour)} - Close:{' '}
                {formatTime(tenant.closingHour)}
              </span>
            </div>
          )}
          {tenant.timezone && (
            <div className="flex items-center gap-3">
              <Globe2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{tenant.timezone}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {tenant.description && (
          <div className="rounded-lg border p-4">
            <p className="text-sm leading-relaxed">{tenant.description}</p>
          </div>
        )}

        {/* Quick actions */}
        {showActions && (
          <div className="flex flex-wrap gap-3 pt-4">
            <Button variant="outline" asChild>
              <Link href={`/superadmin/tenants/${tenant.id}/members`}>
                View Members
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/superadmin/tenants/${tenant.id}/invitations`}>
                Invitations
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
