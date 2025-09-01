import express from "express";
import { UserRepository } from "@/repositories";
import { ClerkService } from "@/services/external-service/clerk.service";
import { ImageUploadService } from "@/services/external-service/image-upload.service";
import { PasswordService } from "@/services/external-service/password.service";
import { AuthService } from "@/services";
import { UserController, WebhookController } from "@/controllers";
import { authenticateToken } from "@/middleware/auth";
import upload from "@/config/multer";
import {
  validateEmail,
  validateRequired,
} from "@/middleware/validation.middleware";

const userRepository = new UserRepository();
const clerkService = new ClerkService();
const imageUploadService = new ImageUploadService();
const passwordService = new PasswordService();
const userService = new AuthService(
  userRepository,
  clerkService,
  imageUploadService,
  passwordService
);
const userController = new UserController(userService);
const webhookController = new WebhookController();

const router = express.Router();

/**
 * POST /clerk/webhook
 * Handles Clerk authentication webhooks
 * Must be before JSON parsing middleware for raw body access
 * Processes user creation, updates, and deletion events from Clerk
 */
router.post(
  "/clerk/webhook",
  webhookController.handleClerkWebhook.bind(webhookController),
  userController.handleClerkWebhook.bind(userController)
);

/**
 * POST /auth/signup
 * Creates a new user account
 * Validates required fields: email, password, firstName, lastName, clerkId
 * Validates email format
 */
router.post(
  "/auth/signup",
  validateRequired(["email", "password", "firstName", "lastName", "clerkId"]),
  validateEmail,
  userController.signUp.bind(userController)
);

/**
 * POST /auth/verify-password
 * Verifies user password for authentication
 * Validates required fields: email, password
 * Validates email format
 */
router.post(
  "/auth/verify-password",
  validateRequired(["email", "password"]),
  validateEmail,
  userController.verifyPassword.bind(userController)
);

// =============================================================================
// PUBLIC USER ROUTES
// =============================================================================

/**
 * GET /users
 * Retrieves a list of all users
 * Public endpoint - no authentication required
 */
router.get("/users", userController.getAllUsers.bind(userController));

/**
 * GET /users/:id
 * Retrieves a specific user by their ID
 * Public endpoint - no authentication required
 */
router.get("/users/:id", userController.getUserById.bind(userController));

/**
 * POST /users
 * Creates a new user without authentication
 * Validates required fields: firstName, lastName
 */
router.post(
  "/users",
  validateRequired(["firstName", "lastName"]),
  userController.createUser.bind(userController)
);

// =============================================================================
// PROTECTED USER ROUTES
// =============================================================================

/**
 * GET /me
 * Retrieves the authenticated user's profile information
 * Requires valid authentication token
 */
router.get("/me", authenticateToken, userController.getMe.bind(userController));

/**
 * PUT /user/profile
 * Updates the authenticated user's profile
 * Supports file upload for profile image
 * Requires valid authentication token
 */
router.put(
  "/user/profile",
  authenticateToken,
  upload.single("profileImage"),
  userController.updateProfile.bind(userController)
);

/**
 * POST /user/verify-phone
 * Initiates phone number verification for authenticated user
 * Validates required field: phoneNumber
 * Requires valid authentication token
 */
router.post(
  "/user/verify-phone",
  authenticateToken,
  validateRequired(["phoneNumber"]),
  userController.verifyPhone.bind(userController)
);

export default router;
