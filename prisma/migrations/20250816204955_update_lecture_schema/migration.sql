/*
  Warnings:

  - You are about to drop the column `isPreviewFree` on the `lectures` table. All the data in the column will be lost.
  - You are about to drop the column `lectureTitle` on the `lectures` table. All the data in the column will be lost.
  - Added the required column `title` to the `lectures` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add new columns first
ALTER TABLE "public"."lectures"
ADD COLUMN     "title" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isFree" BOOLEAN DEFAULT false,
ADD COLUMN     "position" INTEGER DEFAULT 0;

-- Migrate existing data
UPDATE "public"."lectures"
SET "title" = "lectureTitle",
    "isFree" = COALESCE("isPreviewFree", false);

-- Make title NOT NULL after data migration
ALTER TABLE "public"."lectures"
ALTER COLUMN "title" SET NOT NULL;

-- Drop old columns
ALTER TABLE "public"."lectures"
DROP COLUMN "isPreviewFree",
DROP COLUMN "lectureTitle";
