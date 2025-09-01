import { IOrder } from "../../types";

export interface IOrderRepository{
    create(orderData: {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    courseId: string;
    studentId: string;
  }): Promise<IOrder>
  findByRazorpayOrderId(razorpayOrderId: string): Promise<IOrder | null>
  updatePaymentStatus(
    razorpayOrderId: string,
    paymentData: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      isPaid: boolean;
      paidAt?: Date;
    }
  ): Promise<IOrder | null>
  findByStudent(studentId: string): Promise<IOrder[]>
  getUserLectureProgress(userId: string, courseId: string): Promise<any[]>

}
