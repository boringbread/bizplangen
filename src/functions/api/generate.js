import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

app.post('/generate', async (c) => {
  const { industry, budget } = await c.req.json()
  
  // This is where you'd eventually call an AI SDK
  // For the mockup, we'll return a structured response
  return c.json({
    planTitle: `${industry} Venture Strategy`,
    executiveSummary: `A comprehensive plan for a $${budget} startup in the ${industry} sector...`,
    steps: ["Market Analysis", "Operational Roadmap", "Financial Projections"]
  })
})

export const onRequest = handle(app)