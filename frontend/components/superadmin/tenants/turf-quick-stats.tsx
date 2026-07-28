/**
 * Turf Quick Stats
 *
 * Summary statistics cards for the superadmin dashboard
 */

import { Building2, Users, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TurfQuickStatsProps {
  totalTurfs: number
  activeTurfs: number
  totalMembers: number
  totalBookings: number
  className?: string
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  trend?: string
}

/**
 * Individual stat card
 */
function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          {trend && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Quick stats row component
 *
 * Shows:
 * - Total turfs
 * - Active turfs
 * - Total members
 * - Total bookings (placeholder for now)
 */
export function TurfQuickStats({
  totalTurfs,
  activeTurfs,
  totalMembers,
  totalBookings,
  className,
}: TurfQuickStatsProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        label="Total Turfs"
        value={totalTurfs}
        icon={<Building2 className="h-6 w-6" />}
      />
      <StatCard
        label="Active Turfs"
        value={activeTurfs}
        icon={<Building2 className="h-6 w-6" />}
        trend={`${Math.round((activeTurfs / totalTurfs) * 100)}% of total`}
      />
      <StatCard
        label="Total Members"
        value={totalMembers}
        icon={<Users className="h-6 w-6" />}
      />
      <StatCard
        label="Total Bookings"
        value={totalBookings}
        icon={<Calendar className="h-6 w-6" />}
      />
    </div>
  )
}
