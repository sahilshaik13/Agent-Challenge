# Multimodal Storytelling Agent — System Architecture

**Version:** 1.0  
**Date:** March 2026  
**Runtime:** Google Cloud Platform · Vertex AI (Gemini 2.0 Flash)

---

## 1. Architecture Principles

| Principle | Description |
|---|---|
| Gemini-native first | All multimodal generation uses Gemini 2.0 Flash's native interleaved output API — not post-hoc stitching of separate model calls. |
| Stream everything | Text tokens, image tokens, and audio chunks all stream through the same SSE pipeline to the client, enabling progressive rendering. |
| Stateless agents | Each generation session is stateless at the agent layer. Session context is stored in Firestore and passed as structured context on each call. |
| GCP-native services | Cloud Run for inference workers, Pub/Sub for async jobs, GCS for media storage, Vertex AI as the Gemini runtime. |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                               │
│  ┌──────────────────────────┐  ┌───────────────────────┐   │
│  │ Web Application (React)  │  │ API SDK / Headless     │   │
│  │ - SSE stream renderer    │  │ - REST + WebSocket     │   │
│  │ - Progressive img loader │  │ - CMS connectors       │   │
│  │ - Export / download UI   │  │ - Third-party integr.  │   │
│  └──────────────────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ HTTPS / SSE
┌─────────────────────────────────────────────────────────────┐
│  GATEWAY & ORCHESTRATION LAYER  (Cloud Run)                 │
│  ┌──────────────┐  ┌─────────────────────┐  ┌───────────┐  │
│  │ API Gateway  │  │ Creative Director   │  │  Stream   │  │
│  │ - Auth       │→ │ Agent               │→ │ Multiplex │  │
│  │ - Rate limit │  │ - Brief parsing     │  │ - Token   │  │
│  │ - Validation │  │ - Template select   │  │   routing │  │
│  │ - SSE mgmt   │  │ - Style consistency │  │ - GCS     │  │
│  └──────────────┘  └─────────────────────┘  │   upload  │  │
│                                              └───────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ gRPC / REST
┌─────────────────────────────────────────────────────────────┐
│  AI GENERATION LAYER  (Vertex AI)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Gemini 2.0 Flash — Interleaved Output  ★ CORE      │   │
│  │  responseModalities: ["TEXT", "IMAGE", "AUDIO"]     │   │
│  │  streamGenerateContent: true                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Imagen 3    │  │ Cloud TTS    │  │ Embeddings API   │  │
│  │  (upscaling) │  │ (narration)  │  │ (style consist.) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  DATA & STORAGE LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Firestore   │  │    GCS       │  │   Cloud Pub/Sub  │  │
│  │ - Sessions   │  │ - Images     │  │ - Async export   │  │
│  │ - Asset lib  │  │ - Audio      │  │ - Post-process   │  │
│  │ - History    │  │ - Bundles    │  │ - Analytics      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  PLATFORM LAYER                                             │
│  Cloud Logging · Cloud Monitoring · Cloud Armor · CMEK     │
│  VPC Service Controls · Firebase Auth · Cloud Armor WAF    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Descriptions

### 3.1 API Gateway (Cloud Run)

- **Auth:** Firebase Auth JWT validation on every request
- **Rate limiting:** Per-user token bucket (requests/min, tokens/day)
- **Request validation:** JSON schema validation of creative brief
- **SSE session management:** Creates persistent SSE connection, assigns session ID, writes session stub to Firestore

### 3.2 Creative Director Agent (Cloud Run)

The orchestration brain. Responsibilities:

- Parse the structured creative brief (topic, format, style, tone, reference assets)
- Select the appropriate use-case template (storybook / marketing / education / social)
- Construct the Gemini system prompt with creative director persona and style context
- Carry style embeddings and reference images into each Gemini call for visual consistency
- Handle retry logic and partial regeneration requests (segment-level editing)

### 3.3 Stream Multiplexer (Cloud Run)

Sits between Gemini's SSE stream and the client SSE connection:

- Inspects each streamed chunk from Gemini for content type (text token vs. image data vs. audio chunk)
- On image data: writes binary to GCS, gets CDN-signed URL, emits `{ type: "image", url: "..." }` event to client
- On text tokens: passes through directly as `{ type: "text", delta: "..." }`
- On audio: buffers into ~3-second chunks, uploads to GCS, emits `{ type: "audio", url: "..." }`
- Maintains heartbeat to prevent SSE timeout on slow image generation

### 3.4 Gemini 2.0 Flash — Interleaved Output

The core generation capability. Key configuration:

```json
{
  "model": "gemini-2.0-flash-exp",
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "temperature": 0.85,
    "maxOutputTokens": 8192
  },
  "systemInstruction": "<creative_director_system_prompt>",
  "stream": true
}
```

Gemini generates text and images in a single inference pass, interleaved in the order the creative director agent determines is narratively appropriate. This is the architectural differentiator — there is no orchestration layer manually alternating between a text model and a separate image model.

### 3.5 Firestore

- `sessions/{sessionId}` — active session state, template, style config, segment index
- `users/{userId}/assets` — asset library (characters, brand styles, reference images)
- `sessions/{sessionId}/segments` — per-segment content and version history (for HITL editing)

### 3.6 Cloud Storage (GCS)

- `gs://msa-media/{sessionId}/images/` — generated images per session
- `gs://msa-media/{sessionId}/audio/` — narration audio chunks
- `gs://msa-exports/{sessionId}/` — assembled export bundles (PDF, HTML, ZIP)
- Lifecycle rule: session media expires after 30 days; exports retained 90 days

### 3.7 Cloud Pub/Sub

- `topic: post-generation-jobs` — triggers async workers for image upscaling (Imagen 3), export bundle assembly, webhook delivery
- `topic: analytics-events` — generation metrics, token usage, latency samples → BigQuery

---

## 4. Data Flow (Request Lifecycle)

| Step | Component | Action |
|---|---|---|
| 1 | Client | Submits creative brief (text + optional reference images) via POST |
| 2 | API Gateway | Authenticates user, validates schema, creates Firestore session, opens SSE stream |
| 3 | Creative Director Agent | Parses brief → selects template → builds structured Gemini prompt with style context |
| 4 | Vertex AI (Gemini) | Streams interleaved text + image tokens back to the agent |
| 5 | Stream Multiplexer | Classifies each chunk; uploads image data to GCS; emits typed SSE events downstream |
| 6 | Client | Renders text inline as it streams; progressively loads images via CDN URLs; plays audio if present |
| 7 | Pub/Sub (async) | Post-generation: Imagen 3 upscaling, audio synthesis, export bundle creation |

---

## 5. Scalability Design

### Horizontal Scaling

- Cloud Run auto-scales Creative Director workers and Stream Multiplexer pods independently
- Max concurrency per Cloud Run instance: 80 sessions (workload is I/O-bound, not CPU-bound)
- Min instances: 2 per service (warm pool to meet first-token latency SLA)

### Cost Controls

| Template | Max output tokens | Max images | Image resolution |
|---|---|---|---|
| Social content | 2,000 | 4 | 512×512 |
| Marketing | 8,000 | 6 | 1024×1024 |
| Education | 12,000 | 8 | 768×768 |
| Storybook | 20,000 | 12 | 1024×1024 |

### Caching

- Style embeddings cached in Cloud Memorystore (Redis) per user, TTL 24h
- Reference image vectors cached to avoid re-embedding on follow-up sessions

---

## 6. Security Design

| Control | Implementation |
|---|---|
| Authentication | Firebase Auth (JWT), Google Identity Platform for enterprise SSO |
| Network isolation | VPC Service Controls around Vertex AI and GCS; Cloud Armor WAF on API Gateway |
| Encryption at rest | CMEK (Cloud KMS) on Firestore and GCS |
| Content safety | Gemini built-in safety filters (harassment, dangerous content, sexual content, hate speech) — all enabled at BLOCK_LOW_AND_ABOVE threshold |
| Audit logging | Cloud Audit Logs for all Vertex AI calls; content safety filter decisions logged to BigQuery |
| Data residency | All services deployed in us-central1 (configurable to EU for GDPR compliance) |

---

## 7. Observability

### Key Metrics (Cloud Monitoring dashboards)

- `generation/first_token_latency_ms` — p50, p95, p99 per template
- `generation/image_render_latency_ms` — per image within session
- `generation/session_total_latency_ms` — full session wall-clock time
- `vertex_ai/token_usage` — input + output tokens per session (cost tracking)
- `safety/filter_hit_rate` — % of sessions triggering any safety filter category
- `stream/client_disconnect_rate` — SSE disconnects before generation complete

### Alerting

- p95 first token latency > 3s → PagerDuty alert
- Safety filter hit rate > 5% in 5-minute window → immediate review
- Cloud Run instance count approaching quota → auto-scale trigger + alert

---

*Document owner: Engineering · Next review: end of Phase 1*
