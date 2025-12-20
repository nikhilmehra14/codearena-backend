-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "preferredPlatforms" JSONB NOT NULL DEFAULT '[]';
