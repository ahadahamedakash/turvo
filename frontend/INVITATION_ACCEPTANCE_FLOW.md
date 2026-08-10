# Invitation Acceptance Flow

## Overview

Users can accept invitations and join a tenant as either a new user or existing user.

## URL Routes

### Public Routes (No authentication required)
1. **`/invitations/accept?token=xyz`** - Email link (redirects to canonical route)
2. **`/invite/[token]`** - Canonical invitation acceptance page

## Flow

### 1. User clicks email link
```
http://localhost:3000/invitations/accept?token=b5f8d4c4dd597d348ab2d29401ab84cad67ffdd44ac45972de73503608de43a4
```

### 2. Redirect to canonical route
The page at `/invitations/accept` redirects to `/invite/[token]` for cleaner URLs.

### 3. Verify invitation
The page calls `POST /invitations/verify` to validate the token and get invitation details:
- Email address
- Tenant name
- Role name
- Expiration status

### 4. User acceptance flow

#### New User (not authenticated)
Shows registration form with:
- First Name (required)
- Last Name (required)
- Password (required, min 8 characters)
- Phone (optional)
- Gender (optional)

On submit → `POST /invitations/accept` with all fields → Creates user + tenant membership → Redirects to `/dashboard`

#### Existing User (authenticated, email matches)
Shows "Accept Invitation" button.

On click → `POST /invitations/accept` with only token → Adds tenant membership → Redirects to `/dashboard`

#### Existing User (authenticated, different email)
Shows error message: "Please log out first, then use this invitation link."

#### Not authenticated (but user exists with this email)
Redirects to `/login?redirect=/invite/[token]` so they can log in first.

## Backend API

### POST `/invitations/verify`
Public endpoint to verify invitation token.

**Request:**
```json
{ "token": "b5f8d4c4dd597d348ab2d29401ab84cad67ffdd44ac45972de73503608de43a4" }
```

**Response:**
```json
{
  "id": "invitation-id",
  "email": "invited@example.com",
  "tenantId": "tenant-id",
  "tenantName": "My Turf",
  "roleId": "role-id",
  "roleName": "Admin",
  "expiresAt": "2024-12-31T23:59:59.999Z",
  "status": "Pending"
}
```

### POST `/invitations/accept`
Public endpoint to accept invitation.

**Request (new user):**
```json
{
  "token": "b5f8d4c4dd597d348ab2d29401ab84cad67ffdd44ac45972de73503608de43a4",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+8801234567890",
  "gender": "Male"
}
```

**Request (existing user):**
```json
{
  "token": "b5f8d4c4dd597d348ab2d29401ab84cad67ffdd44ac45972de73503608de43a4"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tenantMember": {
    "id": "member-id",
    "tenantId": "tenant-id"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Session Management

After successful invitation acceptance:
1. `accessToken` is stored via `establishSession()`
2. In development: Cookie is set (for middleware)
3. In production: Backend sets HttpOnly cookies
4. User is redirected to `/dashboard`

## Dashboard Access

After accepting, users access:
- **Superadmins**: `/dashboard/superadmin/tenants`
- **Tenant members**: `/dashboard` (tenant-specific view)

## Files Involved

### Frontend
- `/app/invitations/accept/page.tsx` - Query param redirect page
- `/app/(public)/invite/[token]/page.tsx` - Main acceptance page
- `/hooks/invitations.ts` - API hooks
- `/lib/auth/session-manager.ts` - Session management
- `/middleware.ts` - Auth middleware

### Backend
- `/src/modules/invitation/invitation.controller.ts` - API endpoints
- `/src/modules/invitation/invitation.service.ts` - Business logic
- `/src/modules/invitation/dto/accept-invitation.dto.ts` - Validation

## Security Features

1. **Token verification** - Before showing form
2. **Atomic acceptance** - Race condition protected at DB level
3. **Password hashing** - bcrypt with 10 rounds
4. **JWT tokens** - 15min access + 7day refresh
5. **SameSite cookies** - Lax for CSRF protection
6. **Rate limiting** - 10 requests/minute on public endpoints

## Error Handling

| Error | Display |
|-------|---------|
| Invalid token | "Invalid or expired invitation" |
| Already accepted | "Invitation has already been accepted" |
| Revoked | "Invitation has been revoked" |
| Expired | "Invitation has expired" |
| Already member | "You are already a member of this organization" |
| Network error | Toast notification with error message |
