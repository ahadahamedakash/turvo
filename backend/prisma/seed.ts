import 'dotenv/config';
import {
  Gender,
  PrismaClient,
  PermissionModule,
} from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

/**
 * Type-safe permission data structure
 */
interface PermissionData {
  module: PermissionModule;
  slug: string;
  name: string;
}

interface RoleWithPermissions {
  role: {
    slug: string;
    name: string;
    description: string;
  };
  permissions: PermissionData[];
}

// Define roles and permissions for the system
const ROLES_AND_PERMISSIONS: RoleWithPermissions[] = [
  {
    role: {
      slug: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access across all tenants',
    },
    permissions: [
      { module: 'Booking', slug: 'all', name: 'All Booking Operations' },
      { module: 'Customer', slug: 'all', name: 'All Customer Operations' },
      { module: 'Court', slug: 'all', name: 'All Court Operations' },
      { module: 'Payment', slug: 'all', name: 'All Payment Operations' },
      { module: 'Reports', slug: 'all', name: 'All Report Operations' },
      { module: 'Users', slug: 'all', name: 'All User Operations' },
    ],
  },
  {
    role: {
      slug: 'admin',
      name: 'Admin',
      description: 'Tenant administrator with full tenant access',
    },
    permissions: [
      { module: 'Booking', slug: 'all', name: 'All Booking Operations' },
      { module: 'Customer', slug: 'manage', name: 'Manage Customers' },
      { module: 'Court', slug: 'manage', name: 'Manage Courts' },
      { module: 'Payment', slug: 'view', name: 'View Payments' },
      { module: 'Reports', slug: 'view', name: 'View Reports' },
      { module: 'Users', slug: 'invite', name: 'Invite Users' },
    ],
  },
  {
    role: {
      slug: 'staff',
      name: 'Staff',
      description: 'Regular staff member with limited permissions',
    },
    permissions: [
      { module: 'Booking', slug: 'create', name: 'Create Bookings' },
      { module: 'Booking', slug: 'view', name: 'View Bookings' },
      { module: 'Customer', slug: 'view', name: 'View Customers' },
      { module: 'Payment', slug: 'create', name: 'Record Payments' },
    ],
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed permissions first (independent table)
  console.log('📋 Seeding permissions...');
  const permissions: Array<{
    permission: { id: string; slug: string };
    roleSlug: string;
  }> = [];

  for (const roleData of ROLES_AND_PERMISSIONS) {
    for (const perm of roleData.permissions) {
      const permissionSlug = `${perm.module.toLowerCase()}.${perm.slug}`;

      const p = await prisma.permission.upsert({
        where: { slug: permissionSlug },
        update: {},
        create: {
          // Fixed: Properly cast module string to PermissionModule enum
          module: perm.module,
          slug: permissionSlug,
          name: perm.name,
        },
        // Select only the fields we need to avoid type issues
        select: {
          id: true,
          slug: true,
        },
      });

      permissions.push({ permission: p, roleSlug: roleData.role.slug });
    }
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // 2. Seed roles and link permissions
  console.log('👥 Seeding roles...');
  for (const roleData of ROLES_AND_PERMISSIONS) {
    const role = await prisma.role.upsert({
      where: { slug: roleData.role.slug },
      update: {},
      create: roleData.role,
    });

    // Link permissions to role
    const rolePermissions = permissions.filter((p) => p.roleSlug === role.slug);

    // Clear existing permissions and create new ones
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (rolePermissions.length > 0) {
      // Fixed: Properly extract permission ID from the stored permission object
      await prisma.rolePermission.createMany({
        data: rolePermissions.map((rp) => ({
          roleId: role.id,
          permissionId: rp.permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`✅ Created ${ROLES_AND_PERMISSIONS.length} roles`);

  // 3. Create super admin user from environment variables
  console.log('👤 Creating super admin user...');
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment variables',
    );
  }

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password: await bcrypt.hash(superAdminPassword, 10),
      firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
      gender: (process.env.SUPER_ADMIN_GENDER as Gender) || 'Male',
      phone: process.env.SUPER_ADMIN_PHONE || null,
    },
  });
  console.log(`✅ Super admin user created: ${superAdmin.email}`);

  // 4. Create default tenant for super admin
  console.log('🏢 Creating default tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      timezone: process.env.TZ || 'UTC',
      status: 'Active',
      description: 'Default tenant for super admin',
    },
  });
  console.log(`✅ Default tenant created: ${tenant.name}`);

  // 5. Create tenant membership
  console.log('🔗 Creating tenant membership...');
  const tenantMember = await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: superAdmin.id },
    },
    update: {},
    create: { tenantId: tenant.id, userId: superAdmin.id },
  });
  console.log(`✅ Tenant membership created`);

  // 6. Assign super admin role
  console.log('🔑 Assigning super admin role...');
  const superAdminRole = await prisma.role.findUnique({
    where: { slug: 'super_admin' },
  });

  if (!superAdminRole) {
    throw new Error('Super admin role not found after seeding');
  }

  await prisma.userRole.upsert({
    where: {
      tenantMemberId_roleId: {
        tenantMemberId: tenantMember.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      tenantMemberId: tenantMember.id,
      roleId: superAdminRole.id,
      assignedBy: superAdmin.id,
    },
  });
  console.log(`✅ Super admin role assigned`);

  console.log('');
  console.log('✨ Seed completed successfully!');
  console.log('');
  console.log('Super Admin Credentials:');
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Password: ${'*'.repeat(superAdminPassword.length)}`);
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
  console.log('');
  console.log(
    'You can now login with these credentials and create additional tenants.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
