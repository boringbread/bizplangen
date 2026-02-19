-- D1 schema for BizPlanGen - Version 2
-- This schema is designed to be more structured than the previous version.

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS business_plans;
DROP TABLE IF EXISTS market_analysis;
DROP TABLE IF EXISTS swot_analysis;
DROP TABLE IF EXISTS pestel_analysis;
DROP TABLE IF EXISTS porters_five_forces;
DROP TABLE IF EXISTS financial_projections;
DROP TABLE IF EXISTS roadmap;
DROP TABLE IF EXISTS risks;


-- Central table for each generated business plan.
CREATE TABLE business_plans (
    id TEXT PRIMARY KEY,
    -- user_id TEXT, -- FK to users table if you add authentication
    status TEXT NOT NULL, -- CHECK (status IN ('queued', 'running', 'done', 'error')),
    error_message TEXT,
    industry TEXT NOT NULL,
    location TEXT NOT NULL,
    currency TEXT,
    gap TEXT,
    solution TEXT,
    vision TEXT,
    mission TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Market size data (TAM, SAM, SOM).
CREATE TABLE market_analysis (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    tam REAL,
    sam REAL,
    som REAL,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- SWOT analysis (Strengths, Weaknesses, Opportunities, Threats).
CREATE TABLE swot_analysis (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('strength', 'weakness', 'opportunity', 'threat')),
    statement TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- PESTEL analysis (Political, Economic, Social, Technological, Environmental, Legal).
CREATE TABLE pestel_analysis (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    factor TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- Porter's Five Forces analysis.
CREATE TABLE porters_five_forces (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    force_name TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- 5-year financial projections.
CREATE TABLE financial_projections (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    year TEXT NOT NULL,
    revenue REAL,
    cogs REAL,
    opex REAL,
    net_profit REAL,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- Business roadmap.
CREATE TABLE roadmap (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    year TEXT NOT NULL,
    title TEXT,
    description TEXT,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- Risk analysis.
CREATE TABLE risks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    risk_factor TEXT,
    mitigation TEXT,
    FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_analysis_plan_id ON market_analysis(plan_id);
CREATE INDEX IF NOT EXISTS idx_swot_analysis_plan_id ON swot_analysis(plan_id);
CREATE INDEX IF NOT EXISTS idx_pestel_analysis_plan_id ON pestel_analysis(plan_id);
CREATE INDEX IF NOT EXISTS idx_porters_five_forces_plan_id ON porters_five_forces(plan_id);
CREATE INDEX IF NOT EXISTS idx_financial_projections_plan_id ON financial_projections(plan_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_plan_id ON roadmap(plan_id);
CREATE INDEX IF NOT EXISTS idx_risks_plan_id ON risks(plan_id);