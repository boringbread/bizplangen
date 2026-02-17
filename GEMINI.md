# BizPlanGen Application Context

This document provides a comprehensive overview of the BizPlanGen application, its architecture, tech stack, and development flow.

## 1. Project Overview

BizPlanGen is an AI-powered business plan generator. Users can input an industry and location, and the application will generate a detailed business plan using an AI model. The generated plan is displayed in a multi-tab dashboard, covering areas like market analysis, strategy, financials, and more.

## 2. Tech Stack

*   **Frontend:**
    *   **Framework:** React with Vite
    *   **Language:** TypeScript
    *   **Styling:** Tailwind CSS (with `@tailwindcss/typography`)
    *   **UI Components:**
        *   Icons: `lucide-react`
        *   Charts: `recharts`

*   **Backend:**
    *   **Framework:** Hono on Cloudflare Pages Functions
    *   **AI:** Cloudflare AI with the `@cf/meta/llama-3.1-8b-instruct` model
    *   **Entry Point:** `functions/api/[[route]].js`

*   **Database:**
    *   **Service:** Cloudflare D1
    *   **Schema:** Defined in `schema.sql`

*   **Development & Deployment:**
    *   **Containerization:** Docker and Docker Compose
    *   **Local Cloudflare Emulation:** Wrangler

## 3. Project Structure

*   `src/`: Contains the frontend React application.
    *   `App.tsx`: The main React component that orchestrates the UI.
    *   `main.tsx`: The entry point for the React app.
    *   `index.css`: Global styles.
*   `functions/api/[[route]].js`: The backend Hono application that handles API requests.
*   `schema.sql`: The database schema for the Cloudflare D1 database.
*   `package.json`: Project dependencies and scripts.
*   `docker-compose.yml`: Defines the local development environment with `frontend` and `backend` services.
*   `Dockerfile`: The Docker configuration for building the application images.
*   `wrangler.jsonc`: Configuration for the Cloudflare environment, including D1 database bindings.
*   `tailwind.config.js`, `postcss.config.js`: Configuration for Tailwind CSS.

## 4. Application Flow

The application flow is designed around an asynchronous, polling-based mechanism for AI generation.

1.  **User Input:** The user enters an `industry` and `location` in the `InputForm` component and clicks "Generate Business Plan".

2.  **API Request:** The `handleGenerate` function in `App.tsx` sends a `POST` request to the `/api/generate` backend endpoint with the `industry` and `location`.

3.  **Backend Job Creation:**
    *   The backend receives the request in `functions/api/[[route]].js`.
    *   It creates a new record in the `business_plans` table in the D1 database with a `status` of `'queued'`.
    *   It immediately returns a `jobId` to the frontend with a `202 Accepted` status.
    *   It then kicks off the AI generation process in the background using `c.executionCtx.waitUntil`.

4.  **AI Generation (Background):**
    *   The `runAiGeneration` function is executed.
    *   It updates the plan's status to `'running'`.
    *   It constructs a detailed prompt asking the AI model to return a JSON object containing the full business plan.
    *   It calls the Cloudflare AI model.
    *   Once the AI returns the JSON data, the function parses it and saves the structured data into the various D1 tables (`market_analysis`, `swot_analysis`, etc.).
    *   Finally, it updates the plan's status to `'done'`. If an error occurs, the status is set to `'error'`.

5.  **Frontend Polling:**
    *   Upon receiving the `jobId`, the frontend starts polling the `GET /api/plan/:id` endpoint every 3 seconds.
    *   The backend returns the current status of the job.
    *   The frontend displays a loading indicator while the status is `queued` or `running`.

6.  **Displaying the Result:**
    *   When the poll response shows a `status` of `'done'`, the polling stops.
    *   The backend, upon detecting a 'done' status, fetches all the data from the different tables, assembles it into a single JSON object (`result_json`), and returns it.
    *   The frontend takes this `result_json` and renders the full business plan in the multi-tab dashboard view.
    *   If the status is `'error'`, the error message is displayed.

## 5. Database Schema

The schema is defined in `schema.sql`.

```sql
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
```

## 6. Local Development

To run the application locally:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Apply Database Schema:** Reset and apply the local D1 database schema.
    ```bash
    npx wrangler d1 execute bizplangen_db --file=schema.sql --local
    ```

3.  **Run the Application:** Start the frontend and backend services using Docker Compose.
    ```bash
    sudo docker compose up --build
    ```

The application will be available at `http://localhost:5173`.
