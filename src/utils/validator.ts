import { z } from 'zod';
import { type Request, type Response, type NextFunction } from 'express';
import { ResponseHandler } from './api-response';

/**
 * Validation Middleware Factory
 * Creates middleware for validating request data using Zod schemas
 */
export const validateRequest = (schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate request parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        ResponseHandler.validationError(res, errorMessages);
        return;
      }

      ResponseHandler.error(res, 'Validation failed', 400);
      return;
    }
  };
};

/**
 * Utility function to validate data against a schema
 * @param schema - Zod validation schema
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};
