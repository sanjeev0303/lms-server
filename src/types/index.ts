import { Role, OrderStatus } from "@prisma/client";
import { User } from "./user.types";


export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
}

// Course types (for future use)
export interface ICourse {
  creatorId: string;
  subTitle: string;
  id: string;
  title: string;
  description: string;
  instructor: string;
  price: number;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  thumbnail?: string;
  isPublished: boolean;
  enrolledStudents: string[];
  createdAt: Date;
  updatedAt?: Date;
  lectures?: ILecture[];
}

// Lesson types (for future use)
export interface ILecture {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  isFree?: boolean;
  position?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IOrder {
  id: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  isPaid: boolean;
  paidAt?: Date;
  courseId: string;
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview {
  id: string;
  rating: number;
  comment?: string;
  userId: string;
  courseId: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}


// // Request/Response types
// export interface AuthenticatedRequest extends Request {
//   user?: {
//     userId: string;
//   };
// }


export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
