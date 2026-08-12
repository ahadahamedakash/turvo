# Role Permissions Management Fix - Task Index

## Overview

This directory contains the step-by-step tasks to fix the role permissions management system in the Turvo platform.

## Problem Statement

The "Manage Permissions" modal in the superadmin settings page has critical issues:
- Clicking a permission checkbox creates an API call but doesn't update properly
- The entire permission list gets deleted instead of toggling individual permissions
- During fetching roles, the permissions array shows as empty
- The UI state doesn't reflect the actual database state

## Tasks

| Task | Description | Status | Priority |
|------|-------------|--------|----------|
| [Task 1](./task-1-fix-role-permissions-frontend-ui-sync.md) | Fix Frontend UI Synchronization | Pending | HIGH |
| [Task 2](./task-2-backend-hard-delete-role-permissions.md) | Backend Hard Delete Implementation | Pending | HIGH |
| [Task 3](./task-3-frontend-hard-delete-integration.md) | Frontend Hard Delete Integration | Pending | HIGH |
| [Task 4](./task-4-testing-and-verification.md) | End-to-End Testing and Verification | Pending | MEDIUM |

## Execution Order

```
Task 1 → Task 2 → Task 3 → Task 4
```

1. **Task 1** - Fix frontend UI synchronization (optimistic updates, query invalidation)
2. **Task 2** - Implement hard delete on backend (remove soft-delete behavior)
3. **Task 3** - Update frontend to work with hard delete backend
4. **Task 4** - Comprehensive testing and verification

## Key Changes

### Frontend
- Optimistic updates for instant UI feedback
- Proper query invalidation timing
- Error rollback for failed mutations
- Loading states on checkboxes

### Backend
- Hard delete for role permissions (DELETE instead of soft-delete)
- Efficient permission updates (only delete what needs to be deleted)
- Removed `deletedAt` filtering where applicable

## Quick Start

To start working on these tasks:

```bash
# Navigate to tasks directory
cd /media/ahad/drive6/ahad/2026/turvo/tasks

# Read Task 1 first
cat task-1-fix-role-permissions-frontend-ui-sync.md

# Then proceed sequentially through each task
```

## Files Modified

### Backend
- `backend/src/modules/permissions/permissions.service.ts`
- `backend/src/modules/permissions/permissions.controller.ts`
- `backend/prisma/schema.prisma` (optional)

### Frontend
- `frontend/app/dashboard/superadmin/settings/page.tsx`
- `frontend/hooks/permissions.ts`
- `frontend/lib/api/permissions.ts`

## Verification

After completing all tasks, the system should:
- ✅ Instant UI feedback when toggling permissions
- ✅ Correct database state after each change
- ✅ No empty permissions arrays
- ✅ Proper error handling with rollback
- ✅ Hard delete of removed permissions

## Notes

- Each task is designed to be completed independently
- Tasks build on each other, so follow the order
- Test after each task completion before proceeding
- Document any issues found during testing
