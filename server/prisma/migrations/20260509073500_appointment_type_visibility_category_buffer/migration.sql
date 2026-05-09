-- CreateEnum
CREATE TYPE "AppointmentTypeVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "organizations"
ADD COLUMN "defaultAppointmentTypeCategory" TEXT;

-- AlterTable
ALTER TABLE "appointment_types"
ADD COLUMN "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "category" TEXT,
ADD COLUMN "visibility" "AppointmentTypeVisibility" NOT NULL DEFAULT 'DRAFT';

-- Backfill visibility from the legacy isPublished flag
UPDATE "appointment_types"
SET "visibility" = CASE
  WHEN "isPublished" = true THEN 'PUBLISHED'::"AppointmentTypeVisibility"
  ELSE 'DRAFT'::"AppointmentTypeVisibility"
END;
