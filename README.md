# AI Monetisation Scenario Lab

[![CI](https://github.com/Joy-114/ai-monetisation-scenario-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/Joy-114/ai-monetisation-scenario-lab/actions/workflows/ci.yml)

A bilingual pricing and monetisation analysis platform for comparing subscription, usage-based, and hybrid pricing models across customer segments.

## Live Demo

- [Open the public application](https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site)
- [Check the public API health endpoint](https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1/health)
- API base URL: `https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1`

This project was built as a portfolio case study for junior software engineering roles involving internal platforms, automation, APIs, AI-assisted workflows, pricing, and monetisation.

> 中文简介：这是一个支持英语和简体中文的定价方案分析工具。用户可以上传客户数据、比较订阅制、按使用量和混合定价方案，并生成顾问式分析摘要。所有财务指标均由确定性代码计算，AI 只负责解读结果。

## What the application does

The workflow has five stages:

1. Upload and validate customer CSV data.
2. Review and sort the imported dataset.
3. Configure multiple pricing scenarios.
4. Compare revenue, gross profit, margin, ARPU, uplift, segment performance, and value capture.
5. Generate an English or Simplified Chinese consultant summary.

A 24-customer demonstration dataset is included so the full workflow can be tested immediately.

## Key engineering decisions

### Deterministic financial calculations

All commercial metrics are calculated in ordinary TypeScript before any LLM is called.

```text
validated inputs
      ↓
deterministic pricing engine
      ↓
structured analysis result
      ↓
optional LLM interpretation
```

The pricing engine supports:

- subscription pricing;
- usage-based pricing;
- hybrid pricing;
- revenue and gross-profit uplift;
- gross margin and ARPU;
- customer-level value-capture ratios;
- segment aggregation;
- configurable under-monetisation and over-pricing indicators; and
- safe handling of zero denominators.

The LLM never performs financial calculations.

### Server-side trust boundary

The browser does not submit trusted financial totals for persistence. The server validates customer and scenario inputs, recomputes the analysis with the same pricing engine, and only then stores or returns the result.

`OPENAI_API_KEY` is read only in the server environment and is never exposed to the React client or returned by the API.

### AI fallback

If the OpenAI API key is absent, the request fails, or no valid model output is returned, the application generates a deterministic bilingual fallback summary from the same calculated analysis object.

This keeps the product usable even when an external AI provider is unavailable.

## Features

- CSV import with validation for headers, malformed rows, missing fields, invalid numbers, and negative values.
- Downloadable sample dataset.
- Sortable customer table.
- Subscription, usage-based, and hybrid scenario builders.
- Baseline and multi-scenario comparison.
- Revenue, variable cost, gross profit, gross margin, ARPU, revenue uplift, and profit uplift.
- Segment-level revenue, profit, ARPU, willingness-to-pay, and value-capture analysis.
- Configurable value-capture thresholds.
- English and Simplified Chinese UI without page reloads.
- OpenAI-assisted consultant summaries with deterministic fallback.
- SQLite-compatible local persistence and Cloudflare D1 deployment persistence.
- Versioned REST API with validation, rate limiting, CORS handling, request IDs, and structured JSON errors.
- Vitest unit tests and Playwright end-to-end specifications.
- GitHub Actions CI for type checking, linting, unit tests, and production builds.

## Architecture

```text
app/
  api/analyses/route.ts   # Recalculate and persist analyses
  api/summary/route.ts    # AI or deterministic summary
  api/v1/                 # Versioned public REST API
  layout.tsx
  page.tsx

components/
  scenario-lab.tsx        # Workflow state and API coordination
  data-workspace.tsx      # CSV upload and customer review
  scenario-builder.tsx    # Pricing assumptions
  results-dashboard.tsx   # KPIs, charts and segment analysis
  summary-panel.tsx       # Consultant summary UI

db/
  schema.ts               # Relational schema and indexes

drizzle/
  0000_*.sql              # Versioned database migration

lib/
  api-v1/                 # Public validation, HTTP guards and services
  pricing.ts              # Pure deterministic business logic
  csv.ts                  # CSV parsing and validation
  i18n.tsx                # English / Chinese dictionaries
  ai-summary.ts           # OpenAI request and failure handling
  summary.ts              # Deterministic bilingual fallback

tests/                    # Vitest tests and fixtures
e2e/                      # Playwright specifications
```

## Technology stack

- React 19
- TypeScript 5
- Next.js App Router-compatible conventions through Vinext
- Tailwind CSS 4
- shadcn UI primitives
- Recharts
- Drizzle ORM
- SQLite / Cloudflare D1
- Zod
- Papa Parse
- Vitest
- Playwright
- Cloudflare Workers-compatible deployment
- OpenAI Responses API

## Pricing formulas

For customer `i`:

### Subscription

```text
customer_revenueᵢ = fixed_monthly_price
```

### Usage based

```text
customer_revenueᵢ = monthly_usageᵢ × price_per_unit
```

### Hybrid

```text
customer_revenueᵢ = base_monthly_fee + monthly_usageᵢ × price_per_unit
```

Core metrics:

```text
total_revenue       = Σ customer_revenueᵢ
total_variable_cost = Σ variable_costᵢ
gross_profit        = total_revenue − total_variable_cost
gross_margin        = gross_profit / total_revenue
ARPU                = total_revenue / customer_count
revenue_uplift      = (new_revenue − current_revenue) / current_revenue
profit_uplift       = (new_profit − current_profit) / current_profit
```

When a denominator is zero, the application returns `null` rather than producing `Infinity`, `NaN`, or a misleading percentage.

## Value-capture analysis

```text
value_capture_ratio = price_paid / willingness_to_pay
```

Default investigation thresholds:

- below `0.70`: potentially under-monetised;
- `0.70` to `1.00`: reasonable value capture;
- above `1.00`: potential over-pricing risk.

These are intentionally presented as analytical signals, not business truths.

## External REST API

The versioned API is served under `/api/v1`.

| Endpoint | Limit per client | Purpose |
| --- | ---: | --- |
| `GET /api/v1/health` | 120/minute | Basic service status |
| `POST /api/v1/analyse` | 60/minute | Deterministically calculate one pricing scenario |
| `POST /api/v1/summary` | 10/minute | Interpret recalculated or saved analysis metrics |

The public API includes:

- Zod validation;
- field-level validation errors;
- JSON request-size limits;
- fixed-window rate limiting;
- CORS handling;
- request IDs;
- consistent versioned response contracts; and
- deterministic server-side recalculation.

Example health check:

```bash
curl https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1/health
```

Example analysis request:

```bash
curl -X POST \
  https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1/analyse \
  -H "Content-Type: application/json" \
  --data '{
    "customers":[
      {
        "customerName":"Alpha Co",
        "segment":"Small",
        "monthlyUsage":100,
        "currentPrice":30,
        "willingnessToPay":45,
        "variableCost":8
      },
      {
        "customerName":"Beta Co",
        "segment":"Mid",
        "monthlyUsage":500,
        "currentPrice":30,
        "willingnessToPay":90,
        "variableCost":20
      }
    ],
    "scenario":{
      "id":"hybrid-api",
      "name":"Hybrid API",
      "model":"hybrid",
      "baseMonthlyFee":20,
      "pricePerUnit":0.1
    },
    "thresholds":{"under":0.7,"over":1}
  }'
```

Public TypeScript response contracts are defined in `types/api-v1.ts`.

## Testing and CI

The Vitest suite covers the pricing engine, baseline calculations, uplift metrics, value-capture classification, segment aggregation, CSV validation, summary fallback behaviour, and public API validation / HTTP guards.

Playwright specifications cover representative browser journeys including CSV upload, scenario creation, bilingual UI behaviour, and validation feedback.

GitHub Actions runs the following on every push to `main` and every pull request targeting `main`:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

The workflow is defined in `.github/workflows/ci.yml`.

## Setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run dev
```

Open `http://localhost:3000` and choose **Load sample dataset** for the fastest demonstration.

## Environment variables

```bash
OPENAI_API_KEY=       # Optional; blank uses deterministic summaries
OPENAI_MODEL=gpt-4.1-mini
API_ALLOWED_ORIGINS=* # Comma-separated browser origins, or * for a public API
```

Do not commit `.env.local`. The checked-in `.env.example` contains no credentials.

## Local verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

## Known limitations

- Single-workspace portfolio application without user authentication or dataset ownership rules.
- Displayed monetary values use USD only.
- CSV files are parsed in memory and are capped by API validation.
- Willingness to pay is treated as an input assumption rather than independently estimated.
- Scenario parameters are global rather than segment-specific.
- AI summaries are text-only and do not cite external market evidence.
- The in-memory API rate limiter is suitable for a portfolio deployment, not high-volume production billing exposure.

## How AI was used during development

AI coding tools were used to accelerate scaffolding, implementation, testing, and documentation. Their output was validated through deterministic tests, manual fixture calculations, type checking, linting, API verification, and browser testing.

The central design rule is that AI does not own the business logic: financial calculations remain deterministic and testable in `lib/pricing.ts`, while the LLM only interprets an already-calculated structured result.

## Interview walkthrough

A concise technical walkthrough of the project:

1. `lib/pricing.ts` — pure pricing formulas and edge-case handling.
2. `tests/pricing.test.ts` — deterministic assertions against manually verifiable fixtures.
3. `lib/csv.ts` — conversion of untrusted CSV text into validated domain objects.
4. `components/scenario-lab.tsx` — React workflow state and API coordination.
5. `app/api/analyses/route.ts` — server-side recalculation and persistence.
6. `app/api/v1/` — versioned external API, validation, CORS, rate limiting, and response contracts.
7. `lib/ai-summary.ts` — server-side OpenAI integration and deterministic fallback.

## Future improvements

- Authenticated workspaces and audit history.
- Saved and reopenable scenario configurations.
- Segment-specific pricing rules, discounts, and volume tiers.
- Sensitivity ranges and Monte Carlo analysis.
- Currency selection and tax treatment.
- Consultant-ready PDF or presentation export.
- Demand elasticity and churn-risk assumptions.
- Approved external research sources with citations.
