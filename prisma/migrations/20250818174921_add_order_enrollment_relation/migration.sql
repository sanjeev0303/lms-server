-- AlterTable
ALTER TABLE "public"."user_course_enrollments" ADD COLUMN     "orderId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."user_course_enrollments" ADD CONSTRAINT "user_course_enrollments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
