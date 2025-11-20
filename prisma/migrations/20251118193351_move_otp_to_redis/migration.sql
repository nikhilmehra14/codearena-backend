/*
  Warnings:

  - You are about to drop the column `emailVerificationOTP` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiresAt` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerificationOTP",
DROP COLUMN "otpExpiresAt";
