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
  // Action only, e.g. 'update' — stored slug becomes `${module.toLowerCase()}.${slug}`
  slug: string;
  name: string;
}

interface RoleWithPermissions {
  role: {
    slug: string;
    name: string;
    description: string;
  };
  // Full stored slugs — must exist in PERMISSION_CATALOG (enforced below)
  permissionSlugs: string[];
}

/**
 * Full permission catalog — every row is upserted on each seed run.
 * Keep in sync with @RequirePermissions(...) strings in controllers
 * (PascalCase in code, lowercase slugs in DB; PermissionGuard normalizes).
 * `{module}.all` is the explicit per-module wildcard.
 */
const PERMISSION_CATALOG: PermissionData[] = [
  // Booking
  { module: 'Booking', slug: 'view', name: 'View Bookings' },
  { module: 'Booking', slug: 'create', name: 'Create Bookings' },
  { module: 'Booking', slug: 'update', name: 'Update Bookings' },
  { module: 'Booking', slug: 'delete', name: 'Delete Bookings' },
  { module: 'Booking', slug: 'all', name: 'All Booking Operations' },
  // Customer
  { module: 'Customer', slug: 'view', name: 'View Customers' },
  { module: 'Customer', slug: 'create', name: 'Create Customers' },
  { module: 'Customer', slug: 'update', name: 'Update Customers' },
  { module: 'Customer', slug: 'delete', name: 'Delete Customers' },
  { module: 'Customer', slug: 'all', name: 'All Customer Operations' },
  // Court
  { module: 'Court', slug: 'view', name: 'View Courts' },
  { module: 'Court', slug: 'create', name: 'Create Courts' },
  { module: 'Court', slug: 'update', name: 'Update Courts' },
  { module: 'Court', slug: 'delete', name: 'Delete Courts' },
  { module: 'Court', slug: 'all', name: 'All Court Operations' },
  // Payment
  { module: 'Payment', slug: 'view', name: 'View Payments' },
  { module: 'Payment', slug: 'create', name: 'Record Payments' },
  { module: 'Payment', slug: 'update', name: 'Update Payments' },
  { module: 'Payment', slug: 'delete', name: 'Delete Payments' },
  { module: 'Payment', slug: 'all', name: 'All Payment Operations' },
  // Reports (read-only module — no write endpoints exist)
  { module: 'Reports', slug: 'view', name: 'View Reports' },
  { module: 'Reports', slug: 'all', name: 'All Report Operations' },
  // Users
  { module: 'Users', slug: 'view', name: 'View Users' },
  { module: 'Users', slug: 'invite', name: 'Invite Users' },
  { module: 'Users', slug: 'manage', name: 'Manage Users' },
  { module: 'Users', slug: 'all', name: 'All User Operations' },
];

/**
 * Coarse slugs from an earlier seed generation. They never matched any
 * @RequirePermissions string (controllers use view/create/update/delete),
 * so retiring them revokes nothing that ever worked. Role grants that
 * reference them are removed first (role_permissions FK is RESTRICT).
 * Custom roles holding them should be re-granted via the RBAC UI.
 */
const RETIRED_PERMISSION_SLUGS = ['court.manage', 'customer.manage'];

// Define roles and their permission grants
const ROLES_AND_PERMISSIONS: RoleWithPermissions[] = [
  {
    role: {
      slug: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access across all tenants',
    },
    permissionSlugs: [
      'booking.all',
      'customer.all',
      'court.all',
      'payment.all',
      'reports.all',
      'users.all',
    ],
  },
  {
    role: {
      slug: 'admin',
      name: 'Admin',
      description: 'Tenant administrator with full tenant access',
    },
    permissionSlugs: [
      'booking.all',
      'customer.all',
      'court.all',
      'payment.view',
      'reports.view',
      'users.view',
      'users.invite',
      'users.manage',
    ],
  },
  {
    role: {
      slug: 'staff',
      name: 'Staff',
      description: 'Regular staff member with limited permissions',
    },
    permissionSlugs: [
      'booking.create',
      'booking.view',
      'customer.view',
      'payment.create',
    ],
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed the full permission catalog (independent table)
  console.log('📋 Seeding permissions...');
  const permissionIdBySlug = new Map<string, string>();
  for (const perm of PERMISSION_CATALOG) {
    const slug = `${perm.module.toLowerCase()}.${perm.slug}`;
    const p = await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: {
        // Fixed: Properly cast module string to PermissionModule enum
        module: perm.module,
        slug,
        name: perm.name,
      },
      select: {
        id: true,
        slug: true,
      },
    });
    permissionIdBySlug.set(slug, p.id);
  }
  console.log(`✅ Upserted ${permissionIdBySlug.size} permissions`);

  // 1b. Retire stale coarse slugs (delete grants first — FK is RESTRICT)
  for (const slug of RETIRED_PERMISSION_SLUGS) {
    const stale = await prisma.permission.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!stale) continue;

    const removed = await prisma.rolePermission.deleteMany({
      where: { permissionId: stale.id },
    });
    await prisma.permission.delete({ where: { id: stale.id } });
    console.log(
      `🗑️  Retired "${slug}" (removed ${removed.count} role grant(s); re-grant granular equivalents via RBAC UI if needed)`,
    );
  }

  // 2. Seed roles and link permissions
  console.log('👥 Seeding roles...');
  for (const roleData of ROLES_AND_PERMISSIONS) {
    const role = await prisma.role.upsert({
      where: { slug: roleData.role.slug },
      update: {},
      create: roleData.role,
    });

    // Resolve grants via the catalog map — fail hard on unknown slugs
    const permissionIds = roleData.permissionSlugs.map((slug) => {
      const id = permissionIdBySlug.get(slug);
      if (!id) {
        throw new Error(
          `Role "${role.slug}" references unknown permission slug "${slug}" — add it to PERMISSION_CATALOG`,
        );
      }
      return id;
    });

    // Reset seeded roles to seed defaults (custom roles are untouched)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
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
      isSuperAdmin: true,
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

  // 4b. Seed Bangladesh public holidays (fixed-date national holidays)
  // NOTE: Lunar holidays (Eid, Durga Puja, etc.) shift yearly and must be
  // added by the tenant admin via the Holidays manager.
  console.log('📅 Seeding Bangladesh fixed-date holidays...');
  const year = new Date().getFullYear();
  const bdFixedHolidays = [
    { month: 2, day: 21, name: 'Language Martyrs Day' },
    { month: 3, day: 26, name: 'Independence Day' },
    { month: 4, day: 14, name: 'Bengali New Year' },
    { month: 5, day: 1, name: 'Labour Day' },
    { month: 8, day: 15, name: 'National Mourning Day' },
    { month: 12, day: 16, name: 'Victory Day' },
    { month: 12, day: 25, name: 'Christmas Day' },
  ];
  for (const h of bdFixedHolidays) {
    const date = new Date(Date.UTC(year, h.month - 1, h.day));
    await prisma.holiday.upsert({
      where: { tenantId_date: { tenantId: tenant.id, date } },
      update: {},
      create: { tenantId: tenant.id, date, name: h.name },
    });
  }
  console.log(`✅ Seeded ${bdFixedHolidays.length} holidays for ${year}`);

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
