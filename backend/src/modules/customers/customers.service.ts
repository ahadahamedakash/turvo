import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import {
  Prisma,
  PrismaClient,
  Customer,
} from '../../../generated/prisma/client';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CustomerInfoDto } from './dto/customer-info.dto';
import { CustomerOptionDto } from './dto/customer-response.dto';

/**
 * Prisma transaction client type (find-or-create runs inside the booking
 * transaction — see findOrCreate). Mirrors the local type in SlotsService;
 * extracting to common/ is tracked as a separate cleanup task.
 */
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Typeahead search for the booking dialog. Phone-first: the frontend strips
   * non-digits from the query before sending, so "01711" is matched with a
   * plain contains against stored phones. Names match on raw contains.
   * All variants case-insensitive. Without a search term, returns the most
   * recently created customers (empty typeahead shows recents).
   */
  async search(
    tenantId: string,
    search: string | undefined,
    limit: number | undefined,
  ): Promise<CustomerOptionDto[]> {
    // Phone arm uses digits only; without digits (pure name query) it is skipped.
    const digits = search?.replace(/\D/g, '') ?? '';

    const where = search
      ? {
          tenantId,
          deletedAt: null,
          OR: [
            ...(digits.length > 0
              ? [{ phone: { contains: digits, mode: 'insensitive' as const } }]
              : []),
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { tenantId, deletedAt: null };

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
      take: Math.min(limit ?? 10, 20),
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  }

  /**
   * Find or create the customer a booking belongs to. Accepts an optional
   * transaction client so it runs INSIDE the booking transaction (mirrors
   * SlotsService.bookSlot). No HTTP route — called by the Bookings module.
   *
   * Resolution order:
   *   1. dto.customerId (typeahead pick) → 404 if stale
   *   2. dto.phone
   *   3. dto.email
   *   4. create a new row
   *
   * KNOWN & ACCEPTED RACE: two staff booking the same brand-new phone
   * concurrently can create two rows — there is no unique constraint on
   * (tenantId, phone) and none is planned (Task 2 decision). Duplicate rows
   * are benign for bookings; dedup is future customer-management work.
   * Soft-deleted customers are never matched (steps 1-2 filter deletedAt);
   * a create whose phone matches a soft-deleted row creates a fresh row
   * (intended). Email re-find after P2002 intentionally skips the
   * deletedAt filter so the unique-index collision always resolves.
   */
  async findOrCreate(
    tenantId: string,
    dto: CustomerInfoDto,
    tx?: PrismaTransaction,
  ): Promise<Customer> {
    const client = tx ?? this.prisma;

    if (dto.customerId) {
      const existing = await client.customer.findFirst({
        where: { id: dto.customerId, tenantId, deletedAt: null },
      });
      if (!existing) {
        // The typeahead offered a customer that has since been deleted (or
        // belongs to another tenant) — the dialog pick is stale.
        throw new NotFoundException('Selected customer not found');
      }
      return existing;
    }

    if (dto.phone) {
      const byPhone = await client.customer.findFirst({
        where: { tenantId, phone: dto.phone, deletedAt: null },
      });
      if (byPhone) return byPhone;
    }

    if (dto.email) {
      const byEmail = await client.customer.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (byEmail) return byEmail;
    }

    try {
      return await client.customer.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          // NULL (never '') for "no email" — '' would collide on the
          // (tenantId, email) unique index; Postgres treats NULLs as distinct.
          email: dto.email ?? null,
        },
      });
    } catch (error) {
      // Concurrent create hit the (tenantId, email) unique index — re-find.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        dto.email
      ) {
        return await client.customer.findFirstOrThrow({
          where: { tenantId, email: dto.email },
        });
      }
      throw error;
    }
  }
}
