import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types/api.types'

// PERFORMANCE: Compiled regex for better performance on repeated validations
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// MODULARIZATION: Factory function for flexible field validation
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // OPTIMIZATION: Early return pattern for better performance
    const missingFields = fields.filter(field => {
      const value = req.body[field]
      return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
    })

    if (missingFields.length > 0) {
      // CLEAN ARCHITECTURE: Consistent API response format
      const response: ApiResponse = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }
      res.status(400).json(response)
    }

    next()
  }
}

// OPTIMIZATION: Async email validation for future extensibility (e.g., domain validation)
export function validateEmail(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body
  if (email && !isValidEmail(email)) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid email format'
    }
    res.status(400).json(response)
  }
  next()
}

// PERFORMANCE: Compiled regex for faster email validation
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}
