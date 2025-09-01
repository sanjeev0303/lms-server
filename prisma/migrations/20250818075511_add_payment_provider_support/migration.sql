-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('RAZORPAY', 'STRIPE');

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "paymentProvider" "public"."PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
ADD COLUMN     "stripePaymentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ALTER COLUMN "razorpayOrderId" DROP NOT NULL;
