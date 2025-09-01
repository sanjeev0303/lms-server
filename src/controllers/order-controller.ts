import { CreateOrderDto, VerifyPaymentDto } from "@/dto";
import { IOrderService } from "@/interfaces/IService";
import { IAuthRepository } from "@/interfaces/IRepository";
import { AuthenticatedRequest } from "@/middleware/auth";
import { ResponseHandler } from "@/utils/api-response";
import { Response } from "express"

export class OrderController {
    constructor(
        private readonly orderService: IOrderService,
        private readonly userRepository: IAuthRepository
    ) { }

    /**
     * Helper method to get local user ID from Clerk user ID, creating user if not exists
     */
    private async getLocalUserId(req: AuthenticatedRequest): Promise<string> {
        const clerkUserId = req.user?.userId
        if (!clerkUserId) {
            throw new Error("User not authenticated")
        }

        // Use upsert to create user if they don't exist
        const localUser = await this.userRepository.upsert(
            clerkUserId,
            {
                // Create data - what to use if user doesn't exist
                clerkId: clerkUserId,
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                imageUrl: req.user?.imageUrl,
            },
            {
                // Update data - what to update if user exists
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                imageUrl: req.user?.imageUrl,
            }
        )

        return localUser.id
    }

    /**
     * Create a new payment order
    */
    createOrder = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const orderData: CreateOrderDto = req.body

            // Get local user ID from Clerk user ID, creating user if necessary
            const localUserId = await this.getLocalUserId(req)

            const order = await this.orderService.createOrder(orderData, localUserId)

            console.log("order controller from create order: ", order);

            return ResponseHandler.success(
                res,
                order,
                'Order created successfully',
                201
            )
        } catch (error) {
            console.error('Create order controller error:', error);
            return ResponseHandler.error(
                res,
                error instanceof Error ? error.message : 'Failed to create order',
                500
            );
        }
    }

    /**
     * Verify payment and process enrollment
    */
    verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const verifyData: VerifyPaymentDto = req.body

            // Get local user ID from Clerk user ID, ensuring consistency
            const localUserId = await this.getLocalUserId(req)

            // Add the authenticated local user ID to the verification data
            const verifyDataWithLocalUserId = {
                ...verifyData,
                userId: localUserId
            }

            const result = await this.orderService.verifyPayment(verifyDataWithLocalUserId)

            console.log("verify controller for verifyPayment: ", result);

            return ResponseHandler.success(
                res,
                result,
                result.message
            )
        } catch (error) {
            console.error('Verify payment controller error:', error);
            return ResponseHandler.error(
                res,
                error instanceof Error ? error.message : 'Failed to verify payment',
                500
            );
        }
    }

}
