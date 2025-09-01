/*
  Warnings:

  - You are about to drop the column `paymentProvider` on the `orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[razorpayOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "paymentProvider";

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpayOrderId_key" ON "public"."orders"("razorpayOrderId");
