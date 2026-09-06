# AI Monetisation Scenario Lab

A bilingual internal consulting tool for comparing subscription, usage-based, and hybrid pricing models across customer segments.

## Live Demo

- [Open the public application](https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site)
- [Check the public API health endpoint](https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1/health)
- API base URL: `https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1`

The project was built as a portfolio case study for a junior software engineering role in pricing, monetisation, internal platforms, and automation. It deliberately treats financial calculations as deterministic software—not AI output—and uses an LLM only to interpret already-calculated results.

> 中文简介：这是一个支持英语和简体中文的定价方案分析工具。用户可以上传客户数据、比较订阅制、按使用量和混合定价方案，并生成顾问式分析摘要。所有财务指标均由确定性代码计算，AI 只负责解读结果。

## 1. Project Overview

The application guides a consultant through five steps:

1. Upload and validate a customer CSV.
2. Review and sort the customer data.
3. configure multiple pricing scenarios.
4. Compare revenue, gross profit, margin, ARPU, uplift, segments, and value capture.
5. Generate an English or Simplified Chinese consultant summary.

A 24-customer sample dataset is included so the full workflow can be demonstrated immediately.

## 2. Business Problem

Pricing teams often compare models in disconnected spreadsheets. It is easy for formula changes, segment assumptions, and narrative conclusions to drift apart. AI introduces an additional risk if it is asked to calculate commercial metrics that should be reproducible.

The Scenario Lab creates a single workflow where:

- the same validated customer data feeds every scenario;
- formulas are visible, deterministic, and testable;
- segment effects and value-capture signals are shown alongside top-line KPIs; and
- written interpretation is downstream of the calculations.

## 3. Why This Tool Exists

The tool is intended to resemble a small internal platform that a pricing and growth consultancy could use during early hypothesis development. It does not claim to replace research or a complete pricing study. It helps a consultant structure assumptions, find areas to investigate, and explain trade-offs consistently.

## 4. Features

- CSV import with clear validation for headers, empty files, malformed rows, missing fields, invalid numbers, and negative values.
- Downloadable 24-customer demonstration dataset.
- Sortable customer table.
- Subscription, usage-based, and hybrid scenario builders.
- Current-pricing baseline and multi-scenario comparison.
- Monthly revenue, variable cost, gross profit, gross margin, ARPU, revenue uplift, and profit uplift.
- Recharts comparison chart and detailed comparison table.
- Segment-level revenue, profit, ARPU, willingness-to-pay, and value-capture analysis.
- Configurable under-monetisation and over-pricing indicator thresholds.
- English and Simplified Chinese UI without a page refresh.
- AI-assisted summary with a deterministic fallback when the API key is absent or the request fails.
- SQLite-compatible local persistence and Cloudflare D1 deployment persistence.
- Typed API validation, unit tests, and Playwright end-to-end specifications.
- A small WebMCP action that lets an agent load the visible sample dataset safely.

## 5. Architecture

The code is organised by responsibility:

```text
app/
  api/analyses/route.ts   # Recalculates and saves datasets/scenarios
  api/summary/route.ts    # Sends calculated results to AI or fallback
  api/v1/                 # Versioned external REST API
  layout.tsx              # Metadata and application providers
  page.tsx                # Page entry point
components/
  scenario-lab.tsx        # Workflow state and API coordination
  data-workspace.tsx      # CSV upload and customer review
  scenario-builder.tsx    # Pricing assumptions
  results-dashboard.tsx   # KPIs, charts, segments, value capture
  summary-panel.tsx       # Consultant summary UI
db/
  schema.ts               # Relational tables and indexes
drizzle/
  0000_*.sql              # Versioned schema migration
lib/
  api-v1/                 # Public validation, HTTP guards, and services
  pricing.ts              # Pure deterministic business logic
  csv.ts                  # CSV parsing and validation
  i18n.tsx                # Central English/Chinese dictionaries
  ai-summary.ts           # OpenAI request and failure handling
  summary.ts              # Deterministic bilingual fallback
tests/                    # Vitest unit tests and fixtures
e2e/                      # Playwright browser specifications
```

The browser never supplies trusted financial totals to the database. The API accepts validated customers and scenario assumptions, runs `analyseScenarios` again on the server, and persists those server-calculated results.

## 6. Technology Stack

- React 19 and TypeScript 5
- Next.js App Router-compatible conventions through Vinext
- Tailwind CSS 4 and reusable shadcn UI primitives
- Recharts for analytical charts
- Drizzle ORM with SQLite semantics locally and Cloudflare D1 when deployed
- Zod for API request validation
- Papa Parse for CSV parsing
- Vitest for unit tests
- Playwright for end-to-end browser specifications
- Cloudflare Workers-compatible server output through Sites

### Why Drizzle rather than Prisma?

The initial brief preferred Prisma with SQLite. The Sites starter deploys a Cloudflare Worker with D1, where Prisma normally requires an additional driver adapter or hosted data proxy. Drizzle uses the platform's SQLite-compatible D1 binding directly, avoids native query-engine complexity, and keeps the schema and SQL easy to explain. It provides the same important portfolio concepts: typed tables, foreign keys, indexes, generated migrations, and a clear data-access boundary.

## 7. Data Model

```text
Dataset 1 ─── * Customer
   │
   └──── 1 ─── * AnalysisRun 1 ─── * PricingScenario
```

- `Dataset`: records the imported dataset name, source filename, and creation time.
- `Customer`: belongs to one dataset and stores the six validated business fields.
- `AnalysisRun`: belongs to one dataset and records language, thresholds, baseline totals, summary, summary source, and creation time.
- `PricingScenario`: belongs to one analysis run and stores model inputs plus the server-calculated result metrics.

Indexes support the real query patterns: finding customers and analyses by dataset and grouping customers by dataset plus segment.

## 8. Pricing Models

For customer `i`:

### Subscription

```text
customer_revenueᵢ = fixed_monthly_price
```

### Usage-based

```text
customer_revenueᵢ = monthly_usageᵢ × price_per_unit
```

### Hybrid

```text
customer_revenueᵢ = base_monthly_fee + monthly_usageᵢ × price_per_unit
```

All inputs must be finite and non-negative. The LLM is never called by these functions.

## 9. Financial Formulas

```text
total_revenue       = Σ customer_revenueᵢ
total_variable_cost = Σ variable_costᵢ
gross_profit        = total_revenue − total_variable_cost
gross_margin        = gross_profit / total_revenue
ARPU                = total_revenue / customer_count
revenue_uplift      = (new_revenue − current_revenue) / current_revenue
profit_uplift       = (new_profit − current_profit) / current_profit
```

When a denominator is zero, the application returns `null` and displays an em dash instead of `Infinity`, `NaN`, or a misleading percentage.

## 10. Value Capture Analysis

```text
value_capture_ratio = price_paid / willingness_to_pay
```

Default analytical indicators:

- below `0.70`: potentially under-monetised;
- `0.70` through `1.00`: reasonable value capture; and
- above `1.00`: potential over-pricing risk.

The thresholds are editable. A zero willingness-to-pay value produces an unavailable ratio rather than a division error. The interface explicitly describes these classifications as investigation signals, not business truths.

## 11. AI Integration

The workflow is intentionally one-way:

```text
validated inputs → deterministic calculations → structured result → LLM interpretation
```

`POST /api/summary` recalculates the structured analysis, then sends only that result to the OpenAI Responses API. The prompt forbids recalculation and asks for measured consultant language covering the strongest scenario, revenue, gross profit, segments, value capture, trade-offs, risks, and next steps.

If `OPENAI_API_KEY` is missing, the API fails, or the model returns no text, `deterministicSummary` produces a bilingual template summary from the same calculated object. The application therefore remains fully usable offline from an AI provider.

## 12. Internationalisation

`lib/i18n.tsx` contains one English dictionary and one Simplified Chinese dictionary with matching TypeScript keys. `LanguageProvider` exposes:

- the current `language`;
- `setLanguage` for the visible switcher; and
- `t(key, replacements)` for translated text.

Components are written once and request translation keys. Customer names, segments, scenarios, and numeric business data are not automatically translated. The language preference is stored locally as a UI preference only. Calculations never receive the language value, and a browser verification confirmed the raw revenue value remains unchanged across the switch.

## 13. Testing Strategy

### Unit tests

Vitest covers:

- all three pricing models;
- baseline revenue, cost, profit, margin, and ARPU;
- revenue and profit uplift;
- value-capture ratios and configurable classifications;
- segment aggregation;
- zero usage and zero denominators;
- empty datasets;
- negative and extreme finite values;
- missing CSV columns and fields;
- empty and malformed CSV files; and
- missing AI credentials and API failure.

The current suite contains 20 passing deterministic tests.

### API verification

The analysis endpoint was exercised with the two-customer fixture. The response exactly matched the manual baseline and hybrid calculations, and the record was retrieved from the local D1/SQLite database.

### End-to-end verification

`e2e/scenario-lab.spec.ts` specifies two Chromium journeys:

1. upload the sample CSV → add a scenario → run the comparison → switch to Chinese → confirm the financial value is unchanged → generate a fallback summary;
2. upload malformed CSV data in Chinese → display translated validation feedback.

The workspace's macOS process sandbox prevents downloaded Playwright Chromium from registering its process service, so the packaged Playwright runner cannot launch here. The same full journey was executed through the Codex in-app browser: CSV upload, scenario creation, persistence, comparison, bilingual invariance, and Chinese fallback summary all passed with no console errors. On a normal local machine, run the Playwright command below.

## 14. Manual Verification

The unit-test fixture contains:

| Customer | Usage | Current price | Willingness to pay | Variable cost |
| --- | ---: | ---: | ---: | ---: |
| Alpha Co | 100 | $30 | $45 | $8 |
| Beta Co | 500 | $30 | $90 | $20 |

Current baseline:

```text
revenue       = 30 + 30 = 60
variable cost = 8 + 20 = 28
gross profit  = 60 − 28 = 32
gross margin  = 32 / 60 = 53.33%
ARPU          = 60 / 2 = 30
```

For a hybrid scenario with a `$20` base fee and `$0.10` per usage unit:

```text
Alpha revenue = 20 + 100 × 0.10 = 30
Beta revenue  = 20 + 500 × 0.10 = 70
total revenue = 30 + 70 = 100
gross profit  = 100 − 28 = 72
gross margin  = 72 / 100 = 72%
ARPU          = 100 / 2 = 50
revenue uplift = (100 − 60) / 60 = 66.67%
profit uplift  = (72 − 32) / 32 = 125%
```

Value capture in the same scenario:

```text
Alpha = 30 / 45 = 0.667 → potentially under-monetised
Beta  = 70 / 90 = 0.778 → reasonable value capture
```

These hand calculations are asserted independently in `tests/pricing.test.ts`.

## 15. How I Used AI Responsibly During Development

AI coding tools accelerated scaffolding, component creation, test generation, and documentation. Their output was not accepted blindly.

The project was verified through:

- direct code review and separation of business rules from presentation code;
- TypeScript type checking;
- linting of application-owned code;
- deterministic Vitest unit tests;
- manually calculated fixture results;
- API requests against a real local SQLite-compatible database;
- Playwright end-to-end specifications; and
- browser interaction and visual testing with console inspection.

All financial calculations remain deterministic and are isolated in `lib/pricing.ts`. The LLM is used only for interpretation and prose after the metrics exist.

## 16. Setup Instructions

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run dev
```

Open `http://localhost:3000` and choose **Load sample dataset** for the fastest demonstration.

## 17. Environment Variables

```bash
OPENAI_API_KEY=       # Optional. Leave blank to use deterministic summaries.
OPENAI_MODEL=gpt-4.1-mini
API_ALLOWED_ORIGINS=* # Comma-separated browser origins, or * for a public API.
```

Do not commit `.env.local`. The checked-in `.env.example` contains no credentials.

## 18. Running Tests

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm test` runs once; `npm run test:watch` reruns affected unit tests during development.

## 19. Known Limitations

- This portfolio version is a single-workspace tool without user authentication or dataset ownership rules.
- All displayed money is USD; multi-currency conversion is out of scope.
- CSV files are parsed in memory and capped at 5,000 customers by the API validator.
- Willingness to pay is treated as an input assumption, not independently estimated.
- Scenario parameters are global rather than segment-specific.
- The AI summary is text-only and does not cite external market evidence.
- Value-capture thresholds are heuristic indicators and require consulting judgement.

## 20. External REST API (v1)

The versioned API is served under `/api/v1`. Every JSON response contains
`apiVersion`, a generated `requestId`, and either `data` or `error`.

| Endpoint | Limit per client | Purpose |
| --- | ---: | --- |
| `GET /api/v1/health` | 120/minute | Basic service status without configuration or secrets |
| `POST /api/v1/analyse` | 60/minute | Deterministically calculate one pricing scenario |
| `POST /api/v1/summary` | 10/minute | Interpret recomputed or saved analysis metrics |

POST bodies are limited to 1,000,000 bytes. Validation failures return HTTP
`422` with field-level Zod issues. Invalid JSON returns `400`, oversized bodies
return `413`, missing analysis runs return `404`, and rate limits return `429`
with `Retry-After` and `X-RateLimit-*` headers.

The first release uses a small fixed-window, per-Worker-memory limiter. This is
appropriate for a portfolio deployment, but it is best-effort across multiple
Worker instances. A production service with billing exposure should replace it
with Cloudflare Rate Limiting or a Durable Object before increasing traffic.

`API_ALLOWED_ORIGINS` controls browser CORS access. Use `*` for a deliberately
public API or a comma-separated list such as
`https://app.example.com,https://admin.example.com`. CORS is a browser control,
not authentication.

### Analyse request

```json
{
  "customers": [
    {
      "customerName": "Alpha Co",
      "segment": "Small",
      "monthlyUsage": 100,
      "currentPrice": 30,
      "willingnessToPay": 45,
      "variableCost": 8
    }
  ],
  "scenario": {
    "id": "hybrid-api",
    "name": "Hybrid API",
    "model": "hybrid",
    "baseMonthlyFee": 20,
    "pricePerUnit": 0.1
  },
  "thresholds": { "under": 0.7, "over": 1 }
}
```

The response returns the current-pricing baseline, thresholds, total revenue,
variable cost, gross profit, gross margin, ARPU, uplift metrics, customer-level
value capture, and segment aggregates. The route calls the same
`analyseScenarios` function used by the dashboard; it contains no financial
formulas of its own.

### Summary request

Use raw validated inputs when the analysis has not been saved:

```json
{
  "language": "en",
  "customers": [
    {
      "customerName": "Alpha Co",
      "segment": "Small",
      "monthlyUsage": 100,
      "currentPrice": 30,
      "willingnessToPay": 45,
      "variableCost": 8
    }
  ],
  "scenarios": [
    {
      "id": "subscription-api",
      "name": "Subscription API",
      "model": "subscription",
      "fixedMonthlyPrice": 40
    }
  ],
  "thresholds": { "under": 0.7, "over": 1 }
}
```

For a saved dashboard analysis, send only its UUID:

```json
{
  "analysisRunId": "9b6f91de-f86d-49eb-8dba-196e20ed669c",
  "language": "zh"
}
```

The server reloads the saved assumptions and recomputes the `AnalysisBundle`.
Only that calculated structure is passed to `generateConsultantSummary`; raw
request JSON and `OPENAI_API_KEY` never leave the server. The response source is
`"openai"` when the OpenAI call succeeds and `"fallback"` otherwise.

### curl examples

```bash
API_BASE="https://ai-monetisation-scenario-lab.joy20060201.chatgpt.site/api/v1"

curl "$API_BASE/health"

curl -X POST "$API_BASE/analyse" \
  -H "Content-Type: application/json" \
  --data '{
    "customers":[
      {"customerName":"Alpha Co","segment":"Small","monthlyUsage":100,"currentPrice":30,"willingnessToPay":45,"variableCost":8},
      {"customerName":"Beta Co","segment":"Mid","monthlyUsage":500,"currentPrice":30,"willingnessToPay":90,"variableCost":20}
    ],
    "scenario":{"id":"hybrid-api","name":"Hybrid API","model":"hybrid","baseMonthlyFee":20,"pricePerUnit":0.1},
    "thresholds":{"under":0.7,"over":1}
  }'

curl -X POST "$API_BASE/summary" \
  -H "Content-Type: application/json" \
  --data '{"analysisRunId":"9b6f91de-f86d-49eb-8dba-196e20ed669c","language":"en"}'
```

Public TypeScript response contracts are defined in `types/api-v1.ts`.

## 21. Future Improvements

- Add authenticated workspaces, project permissions, and audit history.
- Save and reopen full scenario configurations from an analysis library.
- Support segment-specific pricing rules, discounts, and volume tiers.
- Add sensitivity ranges, confidence intervals, and Monte Carlo analysis.
- Add currency selection and tax treatment.
- Export a consultant-ready PDF or presentation.
- Add customer-level churn-risk assumptions and demand elasticity.
- Add approved external research sources to the summary workflow with citations.

## Interview Walkthrough

A concise technical walkthrough is:

1. Start with `lib/pricing.ts` to show the pure formulas and zero-denominator handling.
2. Open `tests/pricing.test.ts` and reproduce the two-customer hybrid calculation above.
3. Show `lib/csv.ts` to explain how untrusted text becomes validated domain objects.
4. Show `components/scenario-lab.tsx` to explain React state and API coordination.
5. Show `app/api/analyses/route.ts` to demonstrate server-side recalculation and persistence.
6. Show `lib/i18n.tsx` to explain one component tree with two dictionaries.
7. Finish with `app/api/summary/route.ts` to show that AI sits downstream of deterministic analysis.
