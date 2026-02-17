import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

const MAX_FIELD_LEN = 500

// --- UTILITIES (from original file)

function asShortString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`Field '${fieldName}' must be a string`)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`Field '${fieldName}' is required`)
  }
  if (trimmed.length > MAX_FIELD_LEN) {
    throw new Error(`Field '${fieldName}' is too long (max ${MAX_FIELD_LEN} chars)`)
  }
  return trimmed
}

const SECTION_KEYS = [
  'executive_summary', 'problem', 'solution', 'market', 'gtm', 
  'business_model', 'competition', 'operations', 'team', 'risks', 
  'milestones', 'financials'
]

function parseSectionedText(text) {
  const out = {}
  const re = /---SECTION:\s*([a-z_]+)---\s*\n([\s\S]*?)(?=\n---SECTION:|$)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const key = m[1]
    const body = (m[2] ?? '').trim()
    if (SECTION_KEYS.includes(key)) {
      out[key] = { markdown: body }
    }
  }
  for (const key of SECTION_KEYS) {
    if (!out[key]) out[key] = { markdown: '' }
  }
  const marketMd = out.market?.markdown ?? ''
  const tam = /\bTAM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  const sam = /\bSAM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  const som = /\bSOM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  if (tam || sam || som) {
    out.market.tam_sam_som = { tam: tam ?? '', sam: sam ?? '', som: som ?? '' }
  }
  return out
}

// --- BACKGROUND AI TASK

async function runAiGeneration(db, ai, planId, industry, budget, vision) {
  try {
    // 1. Set status to 'running'
    await db.prepare('UPDATE plans SET status = ? WHERE id = ?').bind('running', planId).run()

    // 2. Formulate AI prompt
    const messages = [
        { role: 'system', content: 'You are an expert startup consultant. Follow the exact output format. Do not add extra sections.' },
        { role: 'user', content: [
            'Create a concise but professional business plan. Use markdown within each section.',
            '', `Inputs:`, `- industry: ${industry}`, `- budget: ${budget}`, `- vision: ${vision}`, '',
            'OUTPUT FORMAT (MUST FOLLOW EXACTLY):',
            '---SECTION: executive_summary---', '(markdown)',
            '---SECTION: problem---', '(markdown)',
            '---SECTION: solution---', '(markdown)',
            '---SECTION: market---', '(markdown; include these lines somewhere: "TAM: ...", "SAM: ...", "SOM: ...")',
            '---SECTION: gtm---', '(markdown)',
            '---SECTION: business_model---', '(markdown)',
            '---SECTION: competition---', '(markdown)',
            '---SECTION: operations---', '(markdown)',
            '---SECTION: team---', '(markdown)',
            '---SECTION: risks---', '(markdown)',
            '---SECTION: milestones---', '(markdown)',
            '---SECTION: financials---', '(markdown; include assumptions as bullet list and a simple markdown table)',
            '', 'Rules:', '- Do not wrap the whole answer in code fences.', '- Do not include any text outside the sections.', '- Use realistic assumptions and explicitly label them.'
        ].join('\n') }
    ]

    // 3. Run AI
    const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct', { messages, temperature: 0.2, max_tokens: 4096 })
    const text = aiResponse?.response ?? ''
    const sections = parseSectionedText(text)
    
    const foundAny = Object.values(sections).some(v => typeof v?.markdown === 'string' && v.markdown.trim().length > 0)
    if (!foundAny) {
      throw new Error('AI returned unexpected format: No sections were detected.')
    }
    
    const result = { meta: { industry, budget, vision }, sections }

    // 4. Store result and mark as 'done'
    await db.prepare('UPDATE plans SET status = ?, result_json = ? WHERE id = ?')
      .bind('done', JSON.stringify(result), planId)
      .run()

  } catch (err) {
    // 5. Store error and mark as 'error'
    const errorMessage = err instanceof Error ? err.message : String(err)
    await db.prepare('UPDATE plans SET status = ?, error_message = ? WHERE id = ?')
      .bind('error', errorMessage, planId)
      .run()
  }
}

// --- API ENDPOINTS

// POST /api/generate -> Enqueues a new business plan generation job
app.post('/generate', async (c) => {
  try {
    const db = c.env.bizplangen_db
    const ai = c.env.AI
    if (!db || !ai) {
      return c.json({ error: 'Missing required bindings (DB or AI). Check wrangler.jsonc.' }, 500)
    }

    const body = await c.req.json()
    const industry = asShortString(body?.industry, 'industry')
    const budget = asShortString(body?.budget, 'budget')
    const vision = asShortString(body?.vision, 'vision')

    const planId = crypto.randomUUID()

    // Insert the new job into the database as 'queued'
    await db
      .prepare('INSERT INTO plans (id, status, industry, budget, vision) VALUES (?, ?, ?, ?, ?)')
      .bind(planId, 'queued', industry, budget, vision)
      .run()
    
    // Fire off the AI generation in the background, but don't wait for it
    c.executionCtx.waitUntil(runAiGeneration(db, ai, planId, industry, budget, vision))

    // Immediately return the job ID
    return c.json({ jobId: planId }, 202) // 202 Accepted

  } catch (err) {
    return c.json({ error: 'Failed to enqueue generation job', details: err.message }, 500)
  }
})

// GET /api/plan/:id -> Gets the status/result of a generation job
app.get('/plan/:id', async (c) => {
  try {
    const db = c.env.bizplangen_db
    if (!db) {
      return c.json({ error: 'Missing DB binding. Check wrangler.jsonc.' }, 500)
    }

    const { id } = c.req.param()
    if (!id) {
      return c.json({ error: 'Missing plan ID' }, 400)
    }

    const plan = await db.prepare('SELECT id, status, result_json, error_message FROM plans WHERE id = ?').bind(id).first()

    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404)
    }
    
    // If the result is stored as JSON, parse it before returning
    if (plan.result_json) {
      plan.result_json = JSON.parse(plan.result_json)
    }

    return c.json(plan)
  } catch (err) {
    return c.json({ error: 'Failed to retrieve plan status', details: err.message }, 500)
  }
})

export const onRequest = handle(app)