/*
  Warnings:

  - You are about to drop the column `enrolledCourses` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clerkId]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkId` to the `user` table without a default value. This is not possible if the table is not empty.
  - Made the column `role` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "enrolledCourses",
DROP COLUMN "name",
DROP COLUMN "photoUrl",
ADD COLUMN     "clerkId" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "role" SET NOT NULL;

-- DropEnum
DROP TYPE "public"."PaymentProvider";

-- CreateIndex
CREATE UNIQUE INDEX "user_clerkId_key" ON "public"."user"("clerkId");
