# The Bad Data Test

A premium quiz-funnel website for diagnosing hidden revenue leaks caused by incomplete identity, weak attribution, fragmented systems, and underutilized CRM data.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Config-driven quiz, scoring, and CTA logic
- API route for lead capture with webhook and CRM-ready adapters

## What is included

- Premium single-page funnel with sharp, diagnostic positioning
- Multi-step quiz with progress bar, keyboard navigation, local save state, and animated transitions
- Progressive lead gate after early commitment
- Risk scoring and separate qualification logic
- Dynamic results with inferred findings and opportunity estimate
- Share flow, sticky mobile CTA, FAQ, trust sections, and booking placeholder
- Analytics event hooks for GA4, Meta, LinkedIn, and Segment
- Integration-ready lead submission pipeline
- Structured config for non-developer edits

## Project architecture

- `src/app/page.tsx`: landing page entry
- `src/components/bad-data-test-app.tsx`: funnel shell and UX orchestration
- `src/config/site.ts`: landing page copy, CTAs, FAQs, trust content
- `src/config/quiz.ts`: questions, answers, profiling fields, thresholds
- `src/lib/scoring.ts`: risk, findings, routing, and recommendation logic
- `src/lib/opportunity.ts`: conservative upside estimator
- `src/lib/analytics.ts`: event map and tracking adapters
- `src/app/api/lead/route.ts`: submission endpoint
- `src/lib/integrations.ts`: webhook, HubSpot, GoHighLevel, and local storage adapter

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Environment variables

Copy `.env.example` to `.env.local` and fill in the integrations you want:

- `NEXT_PUBLIC_SITE_URL`: canonical base URL
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: GA4 measurement ID
- `NEXT_PUBLIC_META_PIXEL_ID`: Meta Pixel ID
- `NEXT_PUBLIC_LINKEDIN_PARTNER_ID`: LinkedIn Insight Tag partner ID
- `NEXT_PUBLIC_SEGMENT_WRITE_KEY`: Segment write key
- `WEBHOOK_URL`: generic webhook destination for leads
- `HUBSPOT_*`: HubSpot forms integration
- `GHL_WEBHOOK_URL`: GoHighLevel webhook endpoint
- `NOTIFICATION_EMAIL`: reserved for future email notifications
- `ENABLE_LOCAL_STORAGE`: when `true`, submissions are appended to `/tmp/bad-data-test-submissions.ndjson` during local development

## Where to edit quiz logic and copy

- Questions and answer choices: `src/config/quiz.ts`
- Score weights and thresholds: `src/config/quiz.ts` and `src/lib/scoring.ts`
- Qualification thresholds: `src/config/quiz.ts`
- CTA copy and page copy: `src/config/site.ts`
- Result messaging: `src/lib/scoring.ts`

## Analytics event map

- `landing_viewed`
- `quiz_started`
- `question_answered`
- `quiz_abandoned`
- `lead_gate_viewed`
- `lead_gate_completed`
- `result_viewed`
- `cta_clicked`
- `booking_started`
- `booking_completed`
- `share_clicked`
- `opportunity_estimated`

## Notes

- The quiz and routing are intentionally config-driven so copy and scoring can evolve without rewriting UI logic.
- Local submission storage is intended for development only. For production, connect a webhook or CRM destination.
- The opportunity estimate uses conservative ranges and benchmark fallbacks. It is designed to feel consultative rather than falsely precise.
