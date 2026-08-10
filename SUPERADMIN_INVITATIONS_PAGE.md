# Superadmin Invitations Page

## Overview

Located at `/dashboard/superadmin/invitations`, this page allows superadmins to:
- View all invitations across all tenants
- Filter by status (Pending, Accepted, Revoked, Expired)
- Search by email or tenant name
- Revoke pending invitations
- Delete any invitation
- Copy invite links
- View accepting user details

## Features

### 1. Quick Stats Cards
- **Total Invitations**: Overall count
- **Pending**: Active pending invitations
- **Accepted**: Successfully accepted invitations

### 2. Search & Filter
- **Search**: By email address or tenant name
- **Status Filter**: All, Pending, Accepted, Revoked, Expired
- **Pagination**: 10 items per page

### 3. Data Table Columns
| Column | Description |
|--------|-------------|
| Email & Role | Invitee email and assigned role |
| Tenant | Target organization |
| Status | Current invitation status |
| Invited By | Who created the invitation (with type badge) |
| Expires | Expiration date |
| Created | Creation date |
| Actions | Menu with available actions |

### 4. Action Menu

#### For Pending Invitations
- **Copy Invite Link**: Copies `/invitations/accept?token=xyz` to clipboard
- **Open Invite Page**: Opens invitation page in new tab
- **Revoke**: Cancels the invitation (becomes Revoked)
- **Delete**: Permanently removes the record

#### For Accepted Invitations
- **View Accepting User**: Shows who accepted (toast notification)
- **Delete**: Permanently removes the record

#### For Revoked/Expired
- **Delete**: Permanently removes the record

## Inviter Type Badges

| Badge | Meaning |
|-------|---------|
| 🛡️ Superadmin | Created by platform superadmin |
| 🛡️ Tenant Member | Created by tenant staff member |

## Status Badges

| Status | Color | Icon |
|--------|-------|------|
| Pending | Blue | 🕐 Clock |
| Accepted | Green | ✓ CheckCircle |
| Revoked | Red | ✕ XCircle |
| Expired | Yellow | ⚠ AlertCircle |

## Backend API

### GET `/invitations`
Returns paginated list of invitations.
- **Superadmin**: All invitations across all tenants
- **Tenant Members**: Only their tenant's invitations

Query params:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `tenantId`: Filter by tenant (superadmin only)
- `search`: Search by email or tenant name

### POST `/invitations/:id/revoke`
Revokes a pending invitation.

### DELETE `/invitations/:id`
Permanently deletes an invitation (superadmin only).

## Files

### Frontend
- `/app/dashboard/superadmin/invitations/page.tsx` - Main page
- `/components/superadmin/invitations/invitations-data-table.tsx` - Data table
- `/hooks/invitations.ts` - React Query hooks
- `/lib/api/invitations.ts` - API client
- `/lib/types/invitation.ts` - TypeScript types

### Backend
- `/src/modules/invitation/invitation.controller.ts` - API endpoints
- `/src/modules/invitation/invitation.service.ts` - Business logic
- Added: `findAllForSuperadmin()` method
- Added: `delete()` method

## Security

- ✅ JWT authentication required
- ✅ Delete action limited to superadmins only
- ✅ Tenant members can only revoke their own tenant's invitations
- ✅ Status filtering prevents confusion between invitation states
