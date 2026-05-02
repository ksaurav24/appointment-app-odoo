-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_PENDING_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_REJECTED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "appointments_organizationId_status_startTime_idx" ON "appointments"("organizationId", "status", "startTime");

-- CreateIndex
CREATE INDEX "appointments_organizationId_paymentStatus_createdAt_idx" ON "appointments"("organizationId", "paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorRole_createdAt_idx" ON "audit_logs"("actorRole", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "users_role_createdAt_idx" ON "users"("role", "createdAt");
