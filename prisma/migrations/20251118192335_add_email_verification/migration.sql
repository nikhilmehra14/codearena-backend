-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificationOTP" VARCHAR(6),
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);
