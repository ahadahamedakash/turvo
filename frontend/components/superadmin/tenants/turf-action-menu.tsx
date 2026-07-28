/**
 * Turf Action Menu
 *
 * Dropdown menu for turf row actions
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface TurfActionMenuProps {
  tenantId: string
  tenantName: string
  onDelete?: (id: string, name: string) => void
}

/**
 * Action menu for each turf row
 *
 * Provides quick access to:
 * - View details
 * - Edit
 * - Delete (with confirmation)
 */
export function TurfActionMenu({
  tenantId,
  tenantName,
  onDelete,
}: TurfActionMenuProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = () => {
    if (onDelete) {
      onDelete(tenantId, tenantName)
      setDeleteConfirm(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/superadmin/tenants/${tenantId}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/superadmin/tenants/${tenantId}/edit`)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!deleteConfirm ? (
          <DropdownMenuItem
            onClick={() => setDeleteConfirm(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete turf
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              Confirm delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirm(false)}
            >
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
