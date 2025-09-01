import { z } from 'zod';

// Create order request validation schema
export const CreateOrderDtoSchema = z.object({
  courseId: z.string().cuid('Invalid course ID format'),
});

// Verify payment request validation schema
export const VerifyPaymentDtoSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
  courseId: z.string().cuid('Invalid course ID format'),
  // userId removed - will be obtained from authenticated request
});

// Type definitions from schemas
export type CreateOrderDto = z.infer<typeof CreateOrderDtoSchema>;
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentDtoSchema>;

// Extended type for internal service use (includes userId from authenticated request)
export type VerifyPaymentWithUserDto = VerifyPaymentDto & {
  userId: string;
};

// Response DTOs
export interface OrderResponseDto {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
}

export interface PaymentVerificationResponseDto {
  success: boolean;
  message: string;
  enrollmentStatus?: string;
  orderId?: string;
}
