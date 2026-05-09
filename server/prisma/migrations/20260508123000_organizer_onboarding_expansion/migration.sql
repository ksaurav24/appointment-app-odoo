-- AlterTable
ALTER TABLE "organizations"
ADD COLUMN "galleryImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "googlePlaceId" TEXT,
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "twitterUrl" TEXT,
ADD COLUMN "websiteUrl" TEXT;
