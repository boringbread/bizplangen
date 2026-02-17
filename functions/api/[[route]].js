import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

const MAX_FIELD_LEN = 500

// --- UTILITIES

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

// --- BACKGROUND AI TASK

async function runAiGeneration(db, ai, planId, industry, location) {
  try {
    // 1. Set status to 'running'
    await db.prepare('UPDATE business_plans SET status = ? WHERE id = ?').bind('running', planId).run()

    // 2. Define JSON schema and formulate prompt
    const schema = {
      type: 'object',
      properties: {
        gap: { type: 'string', description: "A concise paragraph identifying a gap in the market." },
        solution: { type: 'string', description: "A concise paragraph describing the business's solution to the gap." },
        vision: { type: 'string' },
        mission: { type: 'string' },
        currency: { type: 'string', description: "The currency for financial figures (e.g., 'USD')." },
        tam: { type: 'number', description: "Total Addressable Market size as a numeric value." },
        sam: { type: 'number', description: "Serviceable Addressable Market size as a numeric value." },
        som: { type: 'number', description: "Serviceable Obtainable Market size as a numeric value." },
        swot: {
          type: 'object',
          properties: {
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            threats: { type: 'array', items: { type: 'string' } },
          },
          required: ['strengths', 'weaknesses', 'opportunities', 'threats']
        },
        pestel: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['factor', 'description']
          }
        },
        porters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              force_name: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['force_name', 'value']
          }
        },
        financialProjections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'string' },
              revenue: { type: 'number' },
              cogs: { type: 'number' },
              opex: { type: 'number' },
              netProfit: { type: 'number' },
            },
            required: ['year', 'revenue', 'cogs', 'opex', 'netProfit']
          },
          minItems: 5,
          maxItems: 5
        },
        roadmap: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['year', 'title', 'description']
          },
           minItems: 5,
           maxItems: 5
        },
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              risk_factor: { type: 'string' },
              mitigation: { type: 'string' },
            },
            required: ['risk_factor', 'mitigation']
          }
        }
      },
      required: ['gap', 'solution', 'vision', 'mission', 'currency', 'tam', 'sam', 'som', 'swot', 'pestel', 'porters', 'financialProjections', 'roadmap', 'risks']
    };

    const systemPrompt = `You are a professional business plan generator. Generate a realistic, data-driven business plan for a ${industry} business in ${location}. Your output must be a JSON object that strictly adheres to the provided schema.`;
    const userPrompt = `Generate the business plan for Industry: ${industry}, Location: ${location}.`;
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    // 3. Run AI
    const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct', { 
        messages, 
        response_format: { type: 'json_schema', json_schema: schema },
        max_tokens: 4096,
    })
    const result = aiResponse.response;
    
    // 4. Store results in the new structured tables
    const batch = [
        db.prepare('UPDATE business_plans SET vision = ?, mission = ?, gap = ?, solution = ?, currency = ? WHERE id = ?').bind(result.vision, result.mission, result.gap, result.solution, result.currency, planId),
        db.prepare('INSERT INTO market_analysis (id, plan_id, tam, sam, som) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), planId, result.tam, result.sam, result.som)
    ];

    const swotTypes = {
      strengths: 'strength',
      weaknesses: 'weakness',
      opportunities: 'opportunity',
      threats: 'threat',
    };

    for (const pluralType in swotTypes) {
        if (result.swot[pluralType]) {
            const singularType = swotTypes[pluralType];
            for (const statement of result.swot[pluralType]) {
                batch.push(db.prepare('INSERT INTO swot_analysis (id, plan_id, type, statement) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), planId, singularType, statement));
            }
        }
    }

    for (const item of result.pestel) {
        batch.push(db.prepare('INSERT INTO pestel_analysis (id, plan_id, factor, description) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), planId, item.factor, item.description));
    }
    
    if (result.porters) {
      for (const item of result.porters) {
          batch.push(db.prepare('INSERT INTO porters_five_forces (id, plan_id, force_name, value) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), planId, item.force_name, item.value));
      }
    }

    for (const item of result.financialProjections) {
        batch.push(db.prepare('INSERT INTO financial_projections (id, plan_id, year, revenue, cogs, opex, net_profit) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), planId, item.year, item.revenue, item.cogs, item.opex, item.netProfit));
    }

    for (const item of result.roadmap) {
        batch.push(db.prepare('INSERT INTO roadmap (id, plan_id, year, title, description) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), planId, item.year, item.title, item.description));
    }

    for (const item of result.risks) {
        batch.push(db.prepare('INSERT INTO risks (id, plan_id, risk_factor, mitigation) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), planId, item.risk_factor, item.mitigation));
    }
    
    await db.batch(batch);

    // 5. Mark as 'done'
    await db.prepare('UPDATE business_plans SET status = ? WHERE id = ?').bind('done', planId).run()

  } catch (err) {
    // 6. Store error and mark as 'error'
    const errorMessage = err instanceof Error ? err.message : String(err)
    await db.prepare('UPDATE business_plans SET status = ?, error_message = ? WHERE id = ?').bind('error', errorMessage, planId).run()
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
    const location = asShortString(body?.location, 'location')

    const planId = crypto.randomUUID()

    // Insert the new job into the database as 'queued'
    await db
      .prepare('INSERT INTO business_plans (id, status, industry, location) VALUES (?, ?, ?, ?)')
      .bind(planId, 'queued', industry, location)
      .run()
    
    // Fire off the AI generation in the background, but don't wait for it
    c.executionCtx.waitUntil(runAiGeneration(db, ai, planId, industry, location))

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

    const plan = await db.prepare('SELECT * FROM business_plans WHERE id = ?').bind(id).first()

    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404)
    }
    
    if (plan.status !== 'done') {
        return c.json(plan);
    }

    // If done, fetch all related data and assemble the full plan
    const results = await db.batch([
        db.prepare('SELECT * FROM market_analysis WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM swot_analysis WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM pestel_analysis WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM porters_five_forces WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM financial_projections WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM roadmap WHERE plan_id = ?').bind(id),
        db.prepare('SELECT * FROM risks WHERE plan_id = ?').bind(id)
    ]);
    
    const market_analysis = results[0].results[0];
    const swot_analysis = results[1].results;
    const pestel_analysis = results[2].results;
    const porters_five_forces = results[3].results;
    const financial_projections = results[4].results;
    const roadmap = results[5].results;
    const risks = results[6].results;

    const swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    const pluralMap = {
        strength: 'strengths',
        weakness: 'weaknesses',
        opportunity: 'opportunities',
        threat: 'threats',
    };

    swot_analysis.forEach(s => {
        const pluralType = pluralMap[s.type];
        if (pluralType) {
            swot[pluralType].push(s.statement);
        }
    });

    const result_json = {
        ...plan,
        tam: market_analysis.tam,
        sam: market_analysis.sam,
        som: market_analysis.som,
        swot: swot,
        pestel: pestel_analysis,
        porters: porters_five_forces,
        financialProjections: financial_projections,
        roadmap: roadmap,
        risks: risks,
    };

    return c.json({
        id: plan.id,
        status: plan.status,
        result_json: result_json
    });

  } catch (err) {
    return c.json({ error: 'Failed to retrieve plan status', details: err.message }, 500)
  }
})

export const onRequest = handle(app)