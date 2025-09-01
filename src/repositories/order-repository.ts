import { prisma } from "@/config";
import { IOrderRepository } from "@/interfaces/IRepository";
import { IOrder } from "@/types";
import { PrismaClient } from "@prisma/client";

export class OrderRepository implements IOrderRepository {
    constructor(private readonly db: PrismaClient = prisma) { }

    /**
     * Create a new order
    */
    async create(orderData: { razorpayOrderId: string; amount: number; currency: string; courseId: string; studentId: string; }): Promise<IOrder> {
        try {
            const order = await this.db.order.create({
                data: {
                    razorpayOrderId: orderData.razorpayOrderId,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    courseId: orderData.courseId,
                    studentId: orderData.studentId
                }
            })

            console.log("repository create order: ", order);

            // Create or update user course enrollment with order ID
            await this.createOrUpdateEnrollment(orderData.studentId, orderData.courseId, order.id);

            return order as IOrder
        } catch (error) {
            console.error('Error creating order:', error);
            throw new Error('Failed to create order');
        }
    }

    /**
     * Find order by Razorpay order ID
    */
     async findByRazorpayOrderId(razorpayOrderId: string): Promise<IOrder | null> {
        try {
            const order = await this.db.order.findFirst({
                where: { razorpayOrderId: razorpayOrderId }
            })

                        console.log("repository find by razorpay order id order: ", order);


            return order as IOrder
        } catch (error) {
            console.error('Error finding order by Razorpay ID:', error);
            throw new Error('Database operation failed');
        }
    }
    /**
     * Update order payment status
    */
    async updatePaymentStatus(razorpayOrderId: string, paymentData: { razorpayPaymentId?: string; razorpaySignature?: string; isPaid: boolean; paidAt?: Date; }): Promise<IOrder | null> {
        try {
            const order = await this.db.order.update({
                where: { razorpayOrderId: razorpayOrderId },
                data: {
                    ...(paymentData.razorpayPaymentId && { razorpayPaymentId: paymentData.razorpayPaymentId }),
                    ...(paymentData.razorpaySignature && { razorpaySignature: paymentData.razorpaySignature }),
                    isPaid: paymentData.isPaid,
                    status: paymentData.isPaid ? 'COMPLETED' : 'PENDING',
                    ...(paymentData.paidAt && { paidAt: paymentData.paidAt })
                }
            })

            console.log("repository update payment status order: ", order);

            // If payment is successful, unlock all lectures for the course
            if (paymentData.isPaid) {
                console.log(`🎯 PAYMENT SUCCESSFUL: Processing enrollment and lecture unlock for User: ${order.studentId}, Course: ${order.courseId}`);

                // Ensure enrollment exists and is properly updated
                await this.createOrUpdateEnrollment(order.studentId, order.courseId, order.id);

                // Unlock all lectures for the course
                await this.unlockCourseLectures(order.courseId, order.studentId);

                console.log(`✅ ENROLLMENT AND LECTURE UNLOCK COMPLETED for User: ${order.studentId}, Course: ${order.courseId}`);
            }

            return order as IOrder
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw new Error('Failed to update payment status');
        }
    }

    /**
     * Get orders by student ID
    */
    async findByStudent(studentId: string): Promise<IOrder[]> {
        try {
            const orders = await this.db.order.findMany({
                where: { studentId: studentId },
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            thumbnail: true,
                            price: true
                        }
                    }
                }
            })

            console.log("repository find by student order: ", orders);

            return orders as IOrder[]
        } catch (error) {
            console.error('Error finding orders by student:', error);
            throw new Error('Failed to get student orders');
        }
    }

    /**
     * Create or update user course enrollment with order ID
     */
    private async createOrUpdateEnrollment(userId: string, courseId: string, orderId: string): Promise<void> {
        try {
            await this.db.userCourseEnrollment.upsert({
                where: {
                    userId_courseId: {
                        userId,
                        courseId
                    }
                },
                update: {
                    orderId: orderId
                },
                create: {
                    userId,
                    courseId,
                    orderId
                }
            });

            console.log(`Enrollment created/updated for user ${userId} in course ${courseId} with order ${orderId}`);
        } catch (error) {
            console.error('Error creating/updating enrollment:', error);
            throw new Error('Failed to create/update enrollment');
        }
    }

    /**
     * Update enrollment with order ID
     */
    private async updateEnrollmentOrderId(userId: string, courseId: string, orderId: string): Promise<void> {
        try {
            await this.db.userCourseEnrollment.updateMany({
                where: {
                    userId,
                    courseId,
                    orderId: null // Only update if orderId is not already set
                },
                data: {
                    orderId
                }
            });

            console.log(`Enrollment order ID updated for user ${userId} in course ${courseId} with order ${orderId}`);
        } catch (error) {
            console.error('Error updating enrollment order ID:', error);
            // Don't throw error here as it's not critical for the payment flow
        }
    }

    /**
     * Unlock all lectures for a course when payment is successful
     */
    private async unlockCourseLectures(courseId: string, userId: string): Promise<void> {
        try {
            console.log(`🔓 STARTING LECTURE UNLOCK PROCESS for User: ${userId}, Course: ${courseId}`);

            // Get all lectures for the course
            const lectures = await this.db.lecture.findMany({
                where: { courseId },
                select: { id: true, title: true, position: true }
            });

            console.log(`📚 Found ${lectures.length} lectures to unlock for course ${courseId}:`,
                lectures.map(l => `[${l.position}] ${l.title} (${l.id})`));

            // Create user lecture progress records for all lectures (marking them as accessible)
            const progressRecords = lectures.map(lecture => ({
                userId,
                courseId,
                lectureId: lecture.id,
                isCompleted: false,
                isUnlocked: true  // ✅ This is the key fix - explicitly set to true
            }));

            let unlockedCount = 0;
            let alreadyUnlockedCount = 0;

            // Use upsert to avoid conflicts if records already exist
            for (const record of progressRecords) {
                console.log(`📝 CREATING/UPDATING UserLectureProgress:`, {
                    userId: record.userId,
                    lectureId: record.lectureId,
                    courseId: record.courseId,
                    isCompleted: record.isCompleted,
                    isUnlocked: record.isUnlocked  // ✅ Now this will show true
                });

                const result = await this.db.userLectureProgress.upsert({
                    where: {
                        userId_lectureId: {
                            userId: record.userId,
                            lectureId: record.lectureId
                        }
                    },
                    update: {
                        isUnlocked: true  // ✅ Ensure existing records are also unlocked
                    },
                    create: record
                });

                console.log(`💾 UserLectureProgress SAVED:`, {
                    id: result.id,
                    userId: result.userId,
                    lectureId: result.lectureId,
                    courseId: result.courseId,
                    isUnlocked: result.isUnlocked,
                    isCompleted: result.isCompleted,
                    watchedAt: result.watchedAt,
                    completedAt: result.completedAt,
                    createdAt: result.createdAt,
                    updatedAt: result.updatedAt
                });

                // Check if this was a new record or existing
                const isNewRecord = result.createdAt.getTime() === result.updatedAt.getTime();
                if (isNewRecord) {
                    unlockedCount++;
                    console.log(`✅ UNLOCKED: Lecture "${lectures.find(l => l.id === record.lectureId)?.title}" for user ${userId}`);
                } else {
                    alreadyUnlockedCount++;
                    console.log(`ℹ️  ALREADY UNLOCKED: Lecture "${lectures.find(l => l.id === record.lectureId)?.title}" for user ${userId}`);
                }
            }

            console.log(`🎉 LECTURE UNLOCK COMPLETE for User: ${userId}, Course: ${courseId}`);
            console.log(`📊 UNLOCK SUMMARY: ${unlockedCount} newly unlocked, ${alreadyUnlockedCount} already unlocked, ${lectures.length} total lectures`);

        } catch (error) {
            console.error(`❌ ERROR UNLOCKING LECTURES for User: ${userId}, Course: ${courseId}:`, error);
            throw new Error('Failed to unlock course lectures');
        }
    }

    /**
     * Get user's lecture progress for a course
     */
    async getUserLectureProgress(userId: string, courseId: string): Promise<any[]> {
        try {
            console.log(`🔍 FETCHING UserLectureProgress for User: ${userId}, Course: ${courseId}`);

            const progress = await this.db.userLectureProgress.findMany({
                where: {
                    userId,
                    courseId
                },
                include: {
                    lecture: {
                        select: {
                            id: true,
                            title: true,
                            position: true
                        }
                    }
                },
                orderBy: {
                    lecture: {
                        position: 'asc'
                    }
                }
            });

            console.log(`📊 UserLectureProgress RETRIEVED (${progress.length} records):`, progress.map(p => ({
                id: p.id,
                userId: p.userId,
                lectureId: p.lectureId,
                courseId: p.courseId,
                lectureTitle: p.lecture.title,
                lecturePosition: p.lecture.position,
                isUnlocked: p.isUnlocked,
                isCompleted: p.isCompleted,
                watchedAt: p.watchedAt,
                completedAt: p.completedAt,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })));

            const unlockedCount = progress.filter(p => p.isUnlocked).length;
            const completedCount = progress.filter(p => p.isCompleted).length;

            console.log(`📈 PROGRESS SUMMARY for User ${userId} in Course ${courseId}:`);
            console.log(`   🔓 Unlocked: ${unlockedCount}/${progress.length} lectures`);
            console.log(`   ✅ Completed: ${completedCount}/${progress.length} lectures`);

            return progress;
        } catch (error) {
            console.error(`❌ ERROR FETCHING UserLectureProgress for User: ${userId}, Course: ${courseId}:`, error);
            throw new Error('Failed to get user lecture progress');
        }
    }
}
