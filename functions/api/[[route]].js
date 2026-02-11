import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

const MAX_FIELD_LEN = 500

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

function tryParseJsonModelOutput(text) {
  // 1) Attempt direct parse
  try {
    return JSON.parse(text)
  } catch {
    // 2) Best-effort: extract first {...} block
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      const candidate = text.slice(first, last + 1)
      return JSON.parse(candidate)
    }
    throw new Error('AI returned non-JSON output')
  }
}

const SECTION_KEYS = [
  'executive_summary',
  'problem',
  'solution',
  'market',
  'gtm',
  'business_model',
  'competition',
  'operations',
  'team',
  'risks',
  'milestones',
  'financials'
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

  // Ensure all keys exist
  for (const key of SECTION_KEYS) {
    if (!out[key]) out[key] = { markdown: '' }
  }

  // Best-effort TAM/SAM/SOM extraction from market markdown
  const marketMd = out.market?.markdown ?? ''
  const tam = /\bTAM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  const sam = /\bSAM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  const som = /\bSOM\s*:\s*(.+)/i.exec(marketMd)?.[1]?.trim()
  if (tam || sam || som) {
    out.market.tam_sam_som = { tam: tam ?? '', sam: sam ?? '', som: som ?? '' }
  }

  return out
}

app.post('/generate', async (c) => {
  try {
    const body = await c.req.json()
    const industry = asShortString(body?.industry, 'industry')
    const budget = asShortString(body?.budget, 'budget')
    const vision = asShortString(body?.vision, 'vision')

    const ai = c.env.AI
    if (!ai) {
      return c.json(
        {
          error: 'Missing AI binding',
          hint: 'Check wrangler.jsonc has "ai": { "binding": "AI" } and that wrangler dev started successfully.'
        },
        500
      )
    }

    // NOTE: We intentionally do NOT ask the model to emit JSON.
    // Many models will occasionally return invalid JSON (trailing commas, etc.),
    // which breaks the endpoint. Instead, we ask for a strict *sectioned text*
    // format and we build JSON ourselves (deterministic).
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert startup consultant. Follow the exact output format. Do not add extra sections.'
      },
      {
        role: 'user',
        content: [
          'Create a concise but professional business plan. Use markdown within each section.',
          '',
          'Inputs:',
          `- industry: ${industry}`,
          `- budget: ${budget}`,
          `- vision: ${vision}`,
          '',
          'OUTPUT FORMAT (MUST FOLLOW EXACTLY):',
          '---SECTION: executive_summary---',
          '(markdown)',
          '---SECTION: problem---',
          '(markdown)',
          '---SECTION: solution---',
          '(markdown)',
          '---SECTION: market---',
          '(markdown; include these lines somewhere: "TAM: ...", "SAM: ...", "SOM: ...")',
          '---SECTION: gtm---',
          '(markdown)',
          '---SECTION: business_model---',
          '(markdown)',
          '---SECTION: competition---',
          '(markdown)',
          '---SECTION: operations---',
          '(markdown)',
          '---SECTION: team---',
          '(markdown)',
          '---SECTION: risks---',
          '(markdown)',
          '---SECTION: milestones---',
          '(markdown)',
          '---SECTION: financials---',
          '(markdown; include assumptions as bullet list and a simple markdown table)',
          '',
          'Rules:',
          '- Do not wrap the whole answer in code fences.',
          '- Do not include any text outside the sections.',
          '- Use realistic assumptions and explicitly label them.'
        ].join('\n')
      }
    ]

    const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      temperature: 0.2
    })

    const text = aiResponse?.response ?? ''
    const sections = parseSectionedText(text)

    const foundAny = Object.values(sections).some(
      (v) => typeof v?.markdown === 'string' && v.markdown.trim().length > 0
    )
    if (!foundAny) {
      return c.json(
        {
          error: 'AI returned unexpected format',
          hint: 'No sections were detected. Check prompt/format.',
          raw_preview: text.slice(0, 500)
        },
        502
      )
    }

    return c.json({ meta: { industry, budget, vision }, sections })
  } catch (err) {
    return c.json(
      {
        error: 'Failed to generate business plan',
        details: err instanceof Error ? err.message : String(err)
      },
      500
    )
  }
})

export const onRequest = handle(app)