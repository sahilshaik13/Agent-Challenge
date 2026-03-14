# Multimodal Storytelling Agent — Implementation Plan

**Version:** 1.0  
**Date:** March 2026  
**Duration:** 20 weeks · 3 phases  
**Team size:** 8 (2 AI/ML, 2 Backend, 1 Frontend, 1 DevOps/SRE, 1 Designer, 1 PM)

---

## Summary

| Phase | Weeks | Focus | Milestone |
|---|---|---|---|
| Phase 1 — Foundation | 1–6 | Gemini PoC, core infrastructure, storybook template | Internal demo |
| Phase 2 — Use Cases & Hardening | 7–14 | All 4 templates, audio, load testing, closed beta | Beta launch (50 users) |
| Phase 3 — GA Polish & Scale | 15–20 | Asset library, exports, billing, public launch | GA v1.0 |

---

## Phase 1 — Foundation (Weeks 1–6)

**Goal:** Establish the core Gemini integration, baseline infrastructure, and a working end-to-end interleaved generation proof-of-concept.

---

### Week 1–2 · GCP Project Setup & Gemini Access

**Owner:** DevOps/SRE + Backend Engineer  
**Deliverables:**
- Vertex AI project provisioned with Gemini 2.0 Flash experimental access
- VPC, IAM roles, and service accounts configured (principle of least privilege)
- Cloud Run environments created: `dev`, `staging`, `prod`
- Firestore database and GCS buckets provisioned with CMEK encryption
- CI/CD pipeline: Cloud Build triggers → Cloud Deploy pipeline to staging and prod
- Terraform IaC for all infrastructure (committed to monorepo)

**Definition of done:** `terraform apply` from scratch produces a fully working infrastructure; Cloud Build pipeline deploys a hello-world service to all three environments.

---

### Week 2–3 · Gemini Interleaved Output PoC

**Owner:** AI/ML Engineers  
**Deliverables:**
- Minimal Cloud Run service that calls `streamGenerateContent` with `responseModalities: ["TEXT","IMAGE"]`
- SSE pipeline validated end-to-end: Gemini stream → Cloud Run → browser
- Image token parsing logic confirmed: binary image data extracted, uploaded to GCS, CDN URL returned
- Token classification logic defined and unit tested
- Latency baseline documented: first token p50/p95 for a 500-word story with 3 images

**Definition of done:** A browser can open an SSE connection, send a text prompt, and receive streaming text paragraphs with inline images rendered progressively.

---

### Week 3–4 · Creative Director Agent — Core

**Owner:** AI/ML Engineers + Backend Engineer  
**Deliverables:**
- Creative brief schema defined (JSON): `{ topic, format, style, tone, targetAudience, referenceAssets[] }`
- Creative director system prompt v1 written and tested (persona, pacing logic, image placement heuristics)
- Storybook template implemented (UC-1): prose + illustrations, page break logic
- Firestore session state wiring: session created on brief submission, updated with segment index as generation proceeds
- Prompt injection prevention: brief sanitization before Gemini context construction

**Definition of done:** A storybook brief produces a coherent 8-page illustrated story with text and images interleaved in narrative order.

---

### Week 5–6 · Stream Multiplexer + Basic UI

**Owner:** Backend Engineer + Frontend Engineer  
**Deliverables:**
- Stream Multiplexer service: token-type routing, GCS upload, typed SSE event emission
- Heartbeat mechanism (every 15s) to prevent SSE timeout during image generation
- React SPA: creative brief input form, SSE stream consumer, progressive text renderer, image placeholder that resolves on URL arrival
- Internal demo build deployed to staging

**Definition of done:** Full demo walkthrough: brief → streaming story with images appearing inline as they generate. Presented to and signed off by full team.

---

### Phase 1 Exit Criteria

- End-to-end storybook generation working with interleaved text + images streaming live to browser
- First token latency < 2s (p50)
- 10-image story completes in < 120s (stretch: < 90s)
- All infrastructure reproducible via Terraform
- Team demo signed off by PM and Engineering lead

---

## Phase 2 — Use Cases & Production Hardening (Weeks 7–14)

**Goal:** Build all four use case templates, add audio and video storyboard generation, harden for production load, and launch closed beta with 50 users.

---

### Week 7–8 · Marketing + Social Templates

**Owner:** AI/ML Engineers + Backend Engineer  
**Deliverables:**
- UC-2 (marketing asset generator) template: landing page copy + hero image + video storyboard script + 3 social captions
- UC-4 (social content creator) template: platform-specific output formatters for Instagram, LinkedIn, X
- Brand voice configuration: users can supply tone keywords and a reference text sample
- Multi-image generation within one session (up to 6 images for marketing template)
- Output format validation: ensure each template produces all required modality segments

---

### Week 8–9 · Educational Explainer Template

**Owner:** AI/ML Engineers  
**Deliverables:**
- UC-3 (educational explainer) template: narration-diagram weaving with configurable diagram style (technical vs illustrative)
- Cloud Text-to-Speech integration: narration audio generated from script segments, chunked to ~3s clips, streamed via SSE
- Audio chunk SSE event type: `{ type: "audio", url: "...", duration_ms: 3000, segment_index: 4 }`
- Client audio player: queues and plays audio chunks as they arrive, synced to text rendering

---

### Week 10–11 · Video Storyboard Generation

**Owner:** AI/ML Engineers + Backend Engineer  
**Deliverables:**
- Video storyboard output type: Gemini generates frame descriptions + scene timing metadata
- Imagen 3 renders individual storyboard frames at 1920×1080 (async via Pub/Sub worker)
- Voiceover script interleaved with frame sequence in output
- Storyboard PDF export: assembled frames + dialogue + timing annotations (async export worker)
- Pub/Sub topic `post-generation-jobs` consumer implemented for storyboard assembly

---

### Week 11–12 · Human-in-the-Loop Editing

**Owner:** Backend Engineer + Frontend Engineer  
**Deliverables:**
- Segment model in Firestore: each generated segment stored with index, type, content, version number
- Segment regeneration API: `POST /sessions/{id}/segments/{index}/regenerate` with optional style override
- Partial re-stream: regeneration streams only from the specified segment index onwards, not full replay
- Frontend: click any text or image segment to surface "Regenerate" option; diff view shows old vs new
- Version history: up to 5 versions per segment retained

---

### Week 12–13 · Load Testing + Reliability

**Owner:** DevOps/SRE + Backend Engineers  
**Deliverables:**
- 500-concurrent-session load test using Locust on GKE; all NFRs must pass
- Cloud Run min/max instances and concurrency settings tuned per service
- Circuit breaker implemented on Vertex AI calls (exponential backoff, max 3 retries, fallback response)
- Pub/Sub dead-letter queue with alerting for failed async jobs
- Chaos engineering: simulate Vertex AI 503s, GCS write latency spikes, Cloud Run cold starts
- Runbook drafted for: Vertex AI quota exhaustion, SSE session leak, GCS CDN miss spike

**Load test pass criteria:** p95 first token < 2s, p95 full storybook < 90s, error rate < 0.5%, zero data loss.

---

### Week 13–14 · Closed Beta Launch

**Owner:** PM + Full team  
**Deliverables:**
- 50 beta users onboarded across all 4 target personas (12 marketers, 12 educators, 13 publishers, 13 social teams)
- In-product CSAT survey (5-star + open text) shown at session end
- Admin dashboard live: generation latency percentiles, token cost per session, safety filter hit rate, WAU
- Top-10 beta feedback issues triaged and fixed before end of week 14
- Beta user Slack/Discord channel for direct feedback

---

### Phase 2 Exit Criteria

- All 4 use case templates generating correct multimodal output
- Audio narration streaming and playing in-browser
- 500-concurrent-session load test passing all NFRs
- Beta CSAT ≥ 3.8 / 5
- p95 storybook generation (10 images) < 90s
- Zero P0 bugs open

---

## Phase 3 — GA Polish & Scale (Weeks 15–20)

**Goal:** Asset library, export capabilities, billing integration, platform hardening, and public launch.

---

### Week 15–16 · Asset Library & Style Consistency

**Owner:** AI/ML Engineers + Backend Engineer  
**Deliverables:**
- Persistent asset library: characters, brand colors, style references stored in Firestore metadata + GCS media
- Style embedding continuity: previous-session reference images passed as Gemini context to maintain visual consistency across sessions
- Character sheet feature: user defines a character (name, description, reference image) → agent reuses consistently in all subsequent generations
- Library UI: browse, name, tag, and delete saved assets

---

### Week 16–17 · Export & Integrations

**Owner:** Backend Engineer + Frontend Engineer  
**Deliverables:**
- PDF export: paged story layout / marketing deck (assembled by async Pub/Sub worker using Puppeteer on Cloud Run)
- HTML export: self-contained interactive story with embedded images and audio player
- Media bundle: ZIP of all assets + `manifest.json` with segment metadata
- Contentful connector: webhook that pushes generated content to a Contentful space (text as rich text, images as assets)
- Webflow connector: same pattern for Webflow CMS
- Zapier integration: "New MSA generation" trigger with full output payload

---

### Week 17–18 · Billing, Plans & API Access

**Owner:** Backend Engineer + PM  
**Deliverables:**
- Stripe integration + Cloud Billing metered usage reporting
- Three tiers: Free (3 generations/month), Pro ($49/month, unlimited), Enterprise (custom SLA + volume pricing)
- API key management: users can generate/revoke API keys for headless access
- Usage dashboard: per-user view of generations used, tokens consumed, storage used
- Overage handling: soft limit warnings at 80% of quota, hard cutoff with graceful error at 100%

---

### Week 18–20 · GA Launch Prep & Go-Live

**Owner:** Full team  
**Deliverables:**
- Security penetration test (third-party, scope: API Gateway + Gemini prompt injection surface)
- GDPR/CCPA compliance audit: data deletion flow, consent management, data processing agreement template
- Content safety red-teaming: structured adversarial prompts across all 4 templates; Gemini safety filter coverage confirmed
- Documentation: API reference, use-case quickstart guides, style configuration cookbook
- Runbooks for all P0 failure scenarios; on-call rotation set up
- Public launch: Product Hunt submission, press kit, launch blog post
- 2-week burn-in period before declaring GA (monitor error rate, latency, safety metrics daily)

---

### Phase 3 Exit Criteria

- All non-functional requirements met in production environment
- Security audit passed with no critical or high findings unresolved
- 99.9% uptime achieved over 2-week burn-in
- GDPR/CCPA audit signed off
- Public launch executed

---

## Team & Roles

| Role | Headcount | Primary Responsibilities | Phases |
|---|---|---|---|
| AI/ML Engineer | 2 | Gemini prompt engineering, interleaved output integration, streaming pipeline, audio/video | All |
| Backend Engineer | 2 | Cloud Run services, Pub/Sub, Firestore, GCS, API Gateway, billing | All |
| Frontend Engineer | 1 | React SSE renderer, progressive media loading, segment editing UI, export UI | P1–P3 |
| DevOps / SRE | 1 | CI/CD, Terraform IaC, load testing, monitoring dashboards, on-call runbooks | All |
| Product Designer | 1 | Creative brief UX, segment editing patterns, export flows, design system | P2–P3 |
| Product Manager | 1 | Roadmap, beta user management, CSAT tracking, stakeholder communication | All |

---

## Key Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Gemini interleaved API instability (experimental) | High | Medium | Maintain fallback to sequential text→image calls; monitor Vertex AI changelog weekly; pin API version |
| Image generation latency at scale (4–8s per image) | High | High | Parallel image rendering where narrative sequence allows; progressive placeholders maintain UX; async post-upscaling |
| Style consistency drift mid-story | Medium | High | Carry style seed tokens and reference image embeddings in every Gemini call; character sheet feature in P3 |
| Vertex AI quota exhaustion at scale | High | Medium | Request quota increase during P1; implement request queuing at 80% quota utilization |
| Token cost overrun (interleaved generation is token-intensive) | Medium | Medium | Aggressive per-template token budgets; usage monitoring with auto-alerts at 120% of projected cost |
| Prompt injection via creative brief | High | Low | Brief sanitization + structured prompt construction (never raw brief concatenation); red-teaming in P3 |

---

## Milestones Summary

| Date (relative) | Milestone |
|---|---|
| End of Week 6 | Phase 1 complete — internal storybook demo live |
| End of Week 10 | All 4 use case templates live on staging |
| End of Week 13 | Load test passed — production-ready |
| End of Week 14 | Closed beta launched (50 users) |
| End of Week 17 | Export and integrations live |
| End of Week 18 | Billing and API access live |
| End of Week 20 | GA v1.0 public launch |

---

*Document owner: Product Management & Engineering · Questions: raise in #msa-project Slack channel*
