/*
  Warnings:

  - A unique constraint covering the columns `[courtId,date,startTime]` on the table `slots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `issuedBy` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('Advance', 'Due', 'Refund');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('Pending', 'Accepted', 'Revoked', 'Expired');

-- AlterEnum
ALTER TYPE "SlotStatus" ADD VALUE 'Held';

-- DropIndex
DROP INDEX "bookings_slotId_key";

-- DropIndex
DROP INDEX "slots_tenantId_courtId_date_startTime_idx";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "issuedBy" UUID NOT NULL,
ADD COLUMN     "type" "PaymentType" NOT NULL;

-- AlterTable
ALTER TABLE "slots" ADD COLUMN     "heldAt" TIMESTAMP(3),
ADD COLUMN     "heldBy" UUID,
ADD COLUMN     "heldUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'Pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" UUID,
    "invitedBy" UUID NOT NULL,
    "revokedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_tenantId_email_status_idx" ON "invitations"("tenantId", "email", "status");

-- CreateIndex
CREATE INDEX "bookings_slotId_idx" ON "bookings"("slotId");

-- CreateIndex
CREATE INDEX "payments_bookingId_type_idx" ON "payments"("bookingId", "type");

-- CreateIndex
CREATE INDEX "slots_tenantId_status_date_idx" ON "slots"("tenantId", "status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "slots_courtId_date_startTime_key" ON "slots"("courtId", "date", "startTime");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "tenant_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "tenant_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "tenant_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
