import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

export interface RequestWithId extends Request {
  id: string
  startTime: number
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqWithId = req as RequestWithId
  reqWithId.id = req.headers['x-request-id'] as string || uuidv4()
  reqWithId.startTime = Date.now()

  res.setHeader('x-request-id', reqWithId.id)

  next()
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const reqWithId = req as RequestWithId
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      requestId: reqWithId.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).userId || 'anonymous',
      timestamp: new Date().toISOString()
    }

    console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} ${logData.statusCode} ${logData.duration} - ${logData.requestId}`)
  })

  next()
}
