import { OrderResponseDto, PaymentVerificationResponseDto, CreateOrderDto, VerifyPaymentDto } from "@/dto";

export interface IPaymentService {
    createOrder(orderData: CreateOrderDto, course: any): Promise<OrderResponseDto>;
    verifyPayment(verifyData: VerifyPaymentDto): Promise<PaymentVerificationResponseDto>;
    isConfigured(): boolean;
}
