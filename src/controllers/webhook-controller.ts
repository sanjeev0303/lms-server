import { Request, Response, NextFunction } from 'express'
import { Webhook } from 'svix'
import * as env from '../env/index'

export class WebhookController {
  async handleClerkWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      res.status(500).json({ error: 'Missing CLERK_WEBHOOK_SECRET' })
      return
    }

    const svix_id = req.header('svix-id')
    const svix_timestamp = req.header('svix-timestamp')
    const svix_signature = req.header('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      res.status(400).json({ error: 'Missing Svix headers' })
      return
    }

    try {
      const wh = new Webhook(WEBHOOK_SECRET)

      // req.body is a Buffer because of express.raw on this route
      const payload = (req as any).body as Buffer
      const body = payload.toString('utf8')

      const evt: any = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })

      // Add the verified event data to the request for the user controller
      req.body = evt

      // Continue to next middleware (user controller)
      next()
    } catch (err) {
      console.error('Webhook verification failed', err)
      res.status(400).json({ error: 'Webhook verification failed' })
    }
  }
}
