import {
  CreateUserDto,
  UpdateUserDto,
  SignUpDto,
  VerifyPasswordDto,
  UpdateProfileDto,
  VerifyPhoneDto,
  ClerkWebhookDto,
} from "@/dto";
import { User } from "../../types/user.types";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";

export interface IAuthService {
  // User CRUD operations
  getUserById(id: string): Promise<ApiResponse<User>>;
  getUserByClerkId(clerkId: string): Promise<ApiResponse<User>>;
  getAllUsers(): Promise<PaginatedResponse<User>>;
  createUser(dto: CreateUserDto): Promise<ApiResponse<User>>;
  updateUser(clerkId: string, dto: UpdateUserDto): Promise<ApiResponse<User>>;
  deleteUser(clerkId: string): Promise<ApiResponse<void>>;

  // Authentication operations
  signUp(dto: SignUpDto): Promise<ApiResponse<User>>;
  verifyPassword(dto: VerifyPasswordDto): Promise<ApiResponse<any>>;

  // Profile operations
  getMe(clerkId: string): Promise<ApiResponse<User>>;
  updateProfile(
    clerkId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File
  ): Promise<ApiResponse<User>>;
  verifyPhone(clerkId: string, dto: VerifyPhoneDto): Promise<ApiResponse<any>>;

  // Webhook operations
  handleClerkWebhook(dto: ClerkWebhookDto): Promise<ApiResponse<void>>;
}
