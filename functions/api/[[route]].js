import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { streamText } from 'hono/streaming'

const app = new Hono().basePath('/api')

app.post('/generate', async (c) => {
  const { industry, budget, vision } = await c.req.json()

  // Use Hono's streaming helper to send text as it's generated
  return streamText(c, async (stream) => {
    const ai = c.env.AI; // This comes from our wrangler.toml binding

    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an expert startup consultant. Create a professional, concise business plan structure.' },
        { role: 'user', content: `Generate a business plan for a ${industry} startup with a budget of ${budget}. Vision: ${vision}` }
      ],
      stream: true, // Tell the AI to stream the response
    });

    // Pipe the AI stream directly to the client
    for await (const chunk of response) {
      await stream.write(chunk.response);
    }
  })
})

export const onRequest = handle(app)