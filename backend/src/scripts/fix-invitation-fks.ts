/**
 * Audit and Fix Script for Invitation Foreign Keys
 *
 * This script finds and fixes invalid foreign key references in the invitations table.
 * Invalid FKs include:
 * - 'SUPERADMIN' strings stored in invitedByMemberId or invitedByUserId
 * - Any other non-UUID values in FK fields
 *
 * Run with: npm run script:fix-invitation-fks
 * Or directly: ts-node src/scripts/fix-invitation-fks.ts
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// UUID regex pattern
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InvalidInvitation {
  id: string;
  email: string;
  field: 'invitedByMemberId' | 'invitedByUserId' | 'revokedBy';
  invalidValue: string | null;
  status: string;
}

interface AuditResult {
  totalInvitations: number;
  invalidFksFound: number;
  invalidInvitations: InvalidInvitation[];
  fixedCount: number;
}

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(value: string | null): boolean {
  if (!value) return false;
  return UUID_PATTERN.test(value);
}

/**
 * Audit invitations for invalid FK references
 */
async function auditInvitations(): Promise<InvalidInvitation[]> {
  const invalidInvitations: InvalidInvitation[] = [];

  console.log('🔍 Auditing invitations for invalid foreign keys...');

  // Fetch all invitations with FK fields
  const invitations = await prisma.invitation.findMany({
    select: {
      id: true,
      email: true,
      invitedByMemberId: true,
      invitedByUserId: true,
      revokedBy: true,
      status: true,
    },
  });

  console.log(`📊 Found ${invitations.length} total invitations`);

  for (const invitation of invitations) {
    // Check invitedByMemberId
    if (
      invitation.invitedByMemberId &&
      !isValidUUID(invitation.invitedByMemberId)
    ) {
      invalidInvitations.push({
        id: invitation.id,
        email: invitation.email,
        field: 'invitedByMemberId',
        invalidValue: invitation.invitedByMemberId,
        status: invitation.status,
      });
    }

    // Check invitedByUserId
    if (
      invitation.invitedByUserId &&
      !isValidUUID(invitation.invitedByUserId)
    ) {
      invalidInvitations.push({
        id: invitation.id,
        email: invitation.email,
        field: 'invitedByUserId',
        invalidValue: invitation.invitedByUserId,
        status: invitation.status,
      });
    }

    // Check revokedBy (from previous fix, but verify)
    if (invitation.revokedBy && !isValidUUID(invitation.revokedBy)) {
      invalidInvitations.push({
        id: invitation.id,
        email: invitation.email,
        field: 'revokedBy',
        invalidValue: invitation.revokedBy,
        status: invitation.status,
      });
    }
  }

  return invalidInvitations;
}

/**
 * Fix invalid FK references by setting them to NULL
 */
async function fixInvalidFKs(
  invalidInvitations: InvalidInvitation[],
): Promise<number> {
  let fixedCount = 0;

  console.log('\n🔧 Fixing invalid foreign keys...');

  for (const invalid of invalidInvitations) {
    try {
      const updateData: Record<string, null> = {};

      switch (invalid.field) {
        case 'invitedByMemberId':
          updateData.invitedByMemberId = null;
          break;
        case 'invitedByUserId':
          updateData.invitedByUserId = null;
          break;
        case 'revokedBy':
          updateData.revokedBy = null;
          break;
      }

      await prisma.invitation.update({
        where: { id: invalid.id },
        data: updateData,
      });

      console.log(
        `✅ Fixed: ${invalid.field} for ${invalid.email} (was: "${invalid.invalidValue}")`,
      );
      fixedCount++;
    } catch (error) {
      console.error(
        `❌ Failed to fix ${invalid.field} for ${invalid.email}:`,
        error,
      );
    }
  }

  return fixedCount;
}

/**
 * Verify that FK references are valid (check if referenced records exist)
 */
async function verifyFKReferences(): Promise<void> {
  console.log('\n🔍 Verifying FK references exist...');

  // Check invitedByMemberId references
  const invitationsWithMemberFK = await prisma.invitation.findMany({
    where: { invitedByMemberId: { not: null } },
    select: { id: true, invitedByMemberId: true },
  });

  let missingMemberCount = 0;
  for (const invitation of invitationsWithMemberFK) {
    if (invitation.invitedByMemberId) {
      const member = await prisma.tenantMember.findUnique({
        where: { id: invitation.invitedByMemberId },
        select: { id: true },
      });
      if (!member) {
        console.log(
          `⚠️  TenantMember not found for invitation ${invitation.id}: ${invitation.invitedByMemberId}`,
        );
        missingMemberCount++;
      }
    }
  }

  // Check invitedByUserId references
  const invitationsWithUserFK = await prisma.invitation.findMany({
    where: { invitedByUserId: { not: null } },
    select: { id: true, invitedByUserId: true },
  });

  let missingUserCount = 0;
  for (const invitation of invitationsWithUserFK) {
    if (invitation.invitedByUserId) {
      const user = await prisma.user.findUnique({
        where: { id: invitation.invitedByUserId },
        select: { id: true },
      });
      if (!user) {
        console.log(
          `⚠️  User not found for invitation ${invitation.id}: ${invitation.invitedByUserId}`,
        );
        missingUserCount++;
      }
    }
  }

  if (missingMemberCount === 0 && missingUserCount === 0) {
    console.log('✅ All FK references are valid!');
  } else {
    console.log(
      `⚠️  Found ${missingMemberCount} missing TenantMember refs and ${missingUserCount} missing User refs`,
    );
  }
}

/**
 * Main execution function
 */
async function main(): Promise<AuditResult> {
  try {
    await prisma.$connect();
    console.log('🚀 Connected to database\n');

    // Step 1: Audit
    const invalidInvitations = await auditInvitations();

    // Step 2: Display results
    console.log('\n📋 Audit Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (invalidInvitations.length === 0) {
      console.log('✅ No invalid foreign keys found!');
    } else {
      console.log(
        `❌ Found ${invalidInvitations.length} invalid foreign key(s):`,
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const invalid of invalidInvitations) {
        console.log(
          `\n  📧 ${invalid.email}`,
          `\n  ├─ Field: ${invalid.field}`,
          `\n  ├─ Invalid Value: "${invalid.invalidValue}"`,
          `\n  ├─ Status: ${invalid.status}`,
          `\n  └─ ID: ${invalid.id}`,
        );
      }

      // Step 3: Ask if we should fix
      console.log('\n🔧 Automatically fixing invalid FKs...\n');

      const fixedCount = await fixInvalidFKs(invalidInvitations);

      return {
        totalInvitations: await prisma.invitation.count(),
        invalidFksFound: invalidInvitations.length,
        invalidInvitations,
        fixedCount,
      };
    }

    // Step 4: Verify FK references exist
    await verifyFKReferences();

    return {
      totalInvitations: await prisma.invitation.count(),
      invalidFksFound: 0,
      invalidInvitations: [],
      fixedCount: 0,
    };
  } catch (error) {
    console.error('💥 Error during audit:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run the script
main()
  .then((result) => {
    console.log('\n✨ Script completed successfully!');
    console.log(`📊 Summary:`, {
      totalInvitations: result.totalInvitations,
      invalidFksFound: result.invalidFksFound,
      fixedCount: result.fixedCount,
    });
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
