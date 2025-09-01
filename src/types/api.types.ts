export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  details?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  data: T[]
  total: number
  page?: number
  limit?: number
}

export interface ErrorResponse {
  success: false
  error: string
  details?: string
  statusCode?: number
}
