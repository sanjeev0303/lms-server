import { Response } from 'express';
import { ApiResponse } from '../types/index';

/**
 * Standardized API Response Utility
 * Provides consistent response format across the application
 * Follows Single Responsibility Principle (SRP)
 */
export class ResponseHandler {
  /**
   * Send successful response
   * @param res - Express response object
   * @param data - Response data
   * @param message - Success message
   * @param statusCode - HTTP status code (default: 200)
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param error - Additional error details
   */
  static error(
    res: Response,
    message: string = 'Operation failed',
    statusCode: number = 500,
    error?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error && { error })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param res - Express response object
   * @param errors - Validation error details
   */
  static validationError(
    res: Response,
    errors: any,
    message: string = 'Validation failed'
  ): Response {
    return ResponseHandler.error(res, message, 400, errors);
  }

  /**
   * Send not found response
   * @param res - Express response object
   * @param message - Not found message
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return ResponseHandler.error(res, message, 404);
  }

  /**
   * Send unauthorized response
   * @param res - Express response object
   * @param message - Unauthorized message
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return ResponseHandler.error(res, message, 401);
  }

  /**
   * Send forbidden response
   * @param res - Express response object
   * @param message - Forbidden message
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden access'
  ): Response {
    return ResponseHandler.error(res, message, 403);
  }
}
