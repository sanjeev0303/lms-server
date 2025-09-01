/*
  Warnings:

  - The values [STRIPE] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stripePaymentId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `orders` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentProvider_new" AS ENUM ('RAZORPAY');
ALTER TABLE "public"."orders" ALTER COLUMN "paymentProvider" DROP DEFAULT;
ALTER TABLE "public"."orders" ALTER COLUMN "paymentProvider" TYPE "public"."PaymentProvider_new" USING ("paymentProvider"::text::"public"."PaymentProvider_new");
ALTER TYPE "public"."PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "public"."PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "public"."PaymentProvider_old";
ALTER TABLE "public"."orders" ALTER COLUMN "paymentProvider" SET DEFAULT 'RAZORPAY';
COMMIT;

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "stripePaymentId",
DROP COLUMN "stripeSessionId";
