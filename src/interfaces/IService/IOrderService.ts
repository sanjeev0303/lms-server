import { CreateOrderDto, OrderResponseDto, PaymentVerificationResponseDto, VerifyPaymentWithUserDto } from "@/dto/order.dto"

export interface IOrderService {
    createOrder(orderData: CreateOrderDto, userId: string): Promise<OrderResponseDto>
    verifyPayment(verifyData: VerifyPaymentWithUserDto): Promise<PaymentVerificationResponseDto>
}
