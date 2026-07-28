/**
 * Turf Status Badge
 *
 * Color-coded status indicator for tenant/turf status
 */

import { cn } from '@/lib/utils'
import type { TenantStatus } from '@/lib/types/tenant'

interface TurfStatusBadgeProps {
  status: TenantStatus
  showLabel?: boolean
}

const statusConfig: Record<
  TenantStatus,
  { label: string; className: string }
> = {
  Active: {
    label: 'Active',
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  },
  Inactive: {
    label: 'Inactive',
    className:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900',
  },
  Suspended: {
    label: 'Suspended',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  },
}

/**
 * Status badge component
 *
 * @example
 * <TurfStatusBadge status="Active" />
 * <TurfStatusBadge status="Active" showLabel={false} /> // dot only
 */
export function TurfStatusBadge({
  status,
  showLabel = true,
}: TurfStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
