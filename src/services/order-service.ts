import { getRazorpayInstance } from "@/config/razorpay";
import { CreateOrderDto, OrderResponseDto, PaymentVerificationResponseDto, VerifyPaymentWithUserDto } from "@/dto";
import { ICourseRepository, IOrderRepository } from "@/interfaces/IRepository";
import { IOrderService } from "@/interfaces/IService";

export class OrderService implements IOrderService {
    constructor(private readonly orderRepository: IOrderRepository, private readonly courseRepository: ICourseRepository) { }

    /**
     * Create a new payment order
    */
    async createOrder(orderData: CreateOrderDto, userId: string): Promise<OrderResponseDto> {
        try {
            // Find Course
            const course = await this.courseRepository.findById(orderData.courseId)
            if (!course) {
                throw new Error("Course not found!");
            }

            console.log("order course service result: ", course);


            if (!course.price) {
                throw new Error("Course price not set");
            }

            // Create shorter receipt that meets Razorpay's 40-character limit
            const timestamp = Date.now().toString().slice(-8);
            const randomStr = Math.random().toString(36).substr(2, 6);
            const receipt = `ord_${timestamp}_${randomStr}`;

            // Create Razorpay order
            const options = {
                amount: course.price * 100,
                currency: 'INR',
                receipt: receipt
            }

            // Get Razorpay instance
            const razorpayInstance = getRazorpayInstance();
            if (!razorpayInstance) {
                throw new Error('Payment service not configured. Please set up Razorpay credentials.');
            }

            // Integrate Razorpay
            const razorpayOrder = await razorpayInstance.orders.create(options)

            console.log("order service razorpayOrder: ", razorpayOrder);

            // Create order record in database immediately
            await this.orderRepository.create({
                razorpayOrderId: razorpayOrder.id,
                amount: course.price,
                currency: 'INR',
                courseId: orderData.courseId,
                studentId: userId
            });

            return {
                id: razorpayOrder.id,
                amount: +razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt ?? ''
            };

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            console.error('Create order service error:', error);
            throw new Error('Order creation failed');
        }
    }

    /**
     * Verify payment and process enrollment
    */
    async verifyPayment(verifyData: VerifyPaymentWithUserDto): Promise<PaymentVerificationResponseDto> {
        try {
            // Get Razorpay instance
            const razorpayInstance = getRazorpayInstance();
            if (!razorpayInstance) {
                throw new Error('Payment service not configured. Please set up Razorpay credentials.');
            }

            // Fetch order information from Razorpay
            const orderInfo = await razorpayInstance.orders.fetch(verifyData.razorpayOrderId)
            if (orderInfo.status === 'paid') {
                // Find course
                const course = await this.courseRepository.findById(verifyData.courseId)
                if (!course) {
                    throw new Error('Course not found')
                }

                // Find the order in our database
                const order = await this.orderRepository.findByRazorpayOrderId(verifyData.razorpayOrderId);
                if (!order) {
                    throw new Error('Order not found in database')
                }

                // Update order payment status with payment details
                // This will also unlock lectures and update enrollment via the repository
                console.log(`💰 PAYMENT VERIFICATION SUCCESS for User: ${verifyData.userId}, Course: ${verifyData.courseId}, Order: ${verifyData.razorpayOrderId}`);

                const updatedOrder = await this.orderRepository.updatePaymentStatus(verifyData.razorpayOrderId, {
                    razorpayPaymentId: verifyData.razorpayPaymentId,
                    razorpaySignature: verifyData.razorpaySignature,
                    isPaid: true,
                    paidAt: new Date()
                });

                console.log(`🎯 ORDER STATUS UPDATED: Order ${verifyData.razorpayOrderId} marked as paid for user ${verifyData.userId}`);

                // Verify that enrollment was created
                const enrollmentCheck = await this.courseRepository.findEnrollment(verifyData.userId, verifyData.courseId);
                console.log(`🔍 ENROLLMENT VERIFICATION for User: ${verifyData.userId}, Course: ${verifyData.courseId}:`,
                    enrollmentCheck ? `✅ ENROLLED (ID: ${enrollmentCheck.id})` : `❌ NOT ENROLLED`);

                // Verify that lectures are properly unlocked
                const lectureAccess = await this.verifyLectureAccess(verifyData.userId, verifyData.courseId);
                console.log(`🔍 LECTURE ACCESS VERIFICATION for User: ${verifyData.userId}, Course: ${verifyData.courseId}`);
                console.log(`📈 LECTURE UNLOCK STATUS: ${lectureAccess.unlockedLectures}/${lectureAccess.totalLectures} lectures available`);

                if (lectureAccess.allUnlocked && enrollmentCheck) {
                    console.log(`✅ COMPLETE SUCCESS: User ${verifyData.userId} is fully enrolled in course ${verifyData.courseId} with all lectures unlocked`);
                } else {
                    console.log(`⚠️  PARTIAL SUCCESS for User: ${verifyData.userId}, Course: ${verifyData.courseId}`);
                    console.log(`   - Enrollment: ${enrollmentCheck ? '✅' : '❌'}`);
                    console.log(`   - Lectures: ${lectureAccess.unlockedLectures}/${lectureAccess.totalLectures} unlocked`);

                    // If enrollment failed but payment was successful, create enrollment manually
                    if (!enrollmentCheck) {
                        console.log(`🔧 FIXING ENROLLMENT: Creating missing enrollment for User: ${verifyData.userId}, Course: ${verifyData.courseId}`);
                        try {
                            await this.courseRepository.enrollStudent(verifyData.courseId, verifyData.userId);
                            console.log(`✅ ENROLLMENT FIXED: Manually created enrollment for User: ${verifyData.userId}, Course: ${verifyData.courseId}`);
                        } catch (enrollError) {
                            console.error(`❌ ENROLLMENT FIX FAILED for User: ${verifyData.userId}, Course: ${verifyData.courseId}:`, enrollError);
                        }
                    }
                }

                // Note: Lecture unlocking is handled automatically in updatePaymentStatus method
                // which calls unlockCourseLectures to create UserLectureProgress records

                return {
                    success: true,
                    message: `Payment verified successfully! You are now enrolled in the course with ${lectureAccess.unlockedLectures} lectures unlocked.`,
                    enrollmentStatus: 'enrolled',
                    orderId: updatedOrder?.id
                };
            } else {
                 return {
                    success: false,
                    message: 'Payment verification failed'
                };
            }

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            console.error('Verify payment service error:', error);
            throw new Error('Payment verification failed');
        }
    }

    /**
     * Verify that lectures are unlocked for a user after payment
     */
    async verifyLectureAccess(userId: string, courseId: string): Promise<{ unlockedLectures: number; totalLectures: number; allUnlocked: boolean }> {
        try {
            // Get all lectures for the course
            const allLectures = await this.courseRepository.findById(courseId);
            if (!allLectures || !allLectures.lectures) {
                throw new Error('Course or lectures not found');
            }

            // Get user's lecture progress
            const lectureProgress = await this.orderRepository.getUserLectureProgress(userId, courseId);

            const totalLectures = allLectures.lectures.length;
            const unlockedLectures = lectureProgress.length;
            const allUnlocked = unlockedLectures === totalLectures;

            console.log(`Lecture access verification for user ${userId} in course ${courseId}: ${unlockedLectures}/${totalLectures} lectures unlocked`);

            return {
                unlockedLectures,
                totalLectures,
                allUnlocked
            };
        } catch (error) {
            console.error('Error verifying lecture access:', error);
            throw new Error('Failed to verify lecture access');
        }
    }

}
