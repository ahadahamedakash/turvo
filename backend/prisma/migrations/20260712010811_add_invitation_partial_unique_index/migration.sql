-- Migration: Add Partial Unique Index for Invitations
-- Prevents duplicate pending invitations per (tenantId, email)
-- Allows multiple accepted/revoked/expired invitations for same email

-- Create partial unique index on invitations
-- This ensures only ONE Pending invitation can exist per (tenantId, email)
CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_pending_per_tenant_email
ON invitations ("tenantId", "email")
WHERE status = 'Pending';
