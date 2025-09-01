import { Router } from 'express';
import { CreateOrderDtoSchema, VerifyPaymentDtoSchema } from '../dto/order.dto';
import { CourseRepository, OrderRepository, UserRepository } from '@/repositories';
import { OrderService } from '@/services';
import { OrderController } from '@/controllers';
import { authenticateJWT } from '../middleware/jwt-auth';
import { validateRequest } from '@/utils/validator';
import { authenticateToken } from '@/middleware/auth';

/**
 * Order Routes
 */

// Initialize dependencies
const orderRepository = new OrderRepository();
const courseRepository = new CourseRepository();
const userRepository = new UserRepository();
const orderService = new OrderService(orderRepository, courseRepository);
const orderController = new OrderController(orderService, userRepository);

const router = Router();

// Create a new payment order
router.post(
  '/create-order',
  authenticateToken,
  validateRequest({ body: CreateOrderDtoSchema }),
  orderController.createOrder
);

// Verify payment and process enrollment
router.post(
  '/verify-payment',
  authenticateToken,
  validateRequest({ body: VerifyPaymentDtoSchema }),
  orderController.verifyPayment
);


export default router;
