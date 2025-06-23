import { serve } from '@hono/node-server'
import app from './app'

const port = parseInt(process.env.PORT || '3001')
console.log(`🚀 AnyWhereDoor API Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})

export default app