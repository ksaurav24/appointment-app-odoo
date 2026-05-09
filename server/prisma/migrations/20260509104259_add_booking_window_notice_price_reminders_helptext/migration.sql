-- AlterTable
ALTER TABLE "appointment_types" ADD COLUMN     "advanceBookingWindowDays" INTEGER DEFAULT 30,
ADD COLUMN     "minimumNoticePeriodHours" INTEGER DEFAULT 0,
ADD COLUMN     "price" DECIMAL(12,2),
ADD COLUMN     "reminderIntervals" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "booking_questions" ADD COLUMN     "helpText" TEXT;
