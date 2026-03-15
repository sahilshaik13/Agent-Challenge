# Google Stories 📖

### Gemini Live Agent Challenge — Best Creative Storyteller Track

> **One voice brief. One AI agent. One fully illustrated, narrated storybook — in under 2 minutes.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-orange?style=for-the-badge)](https://sincere-quasar-490216-b4.web.app)
[![Backend](https://img.shields.io/badge/Backend-Cloud%20Run-blue?style=for-the-badge)](https://google-stories-backend-830357554266.us-central1.run.app/health)
[![MCP Server](https://img.shields.io/badge/MCP%20Server-Cloud%20Run-green?style=for-the-badge)](https://google-stories-mcp-830357554266.us-central1.run.app/mcp)
[![Gemini](https://img.shields.io/badge/Text-Gemini%202.5%20Flash-purple?style=for-the-badge)](https://cloud.google.com/vertex-ai)
[![Imagen](https://img.shields.io/badge/Images-Imagen%203-red?style=for-the-badge)](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)

---

## What is Google Stories?

Google Stories is a **Creative Director AI agent** that transforms a spoken or typed brief into a complete personalized illustrated storybook for children — with Gemini 2.5 Flash story text, Imagen 3 illustrations, and Cloud TTS narration audio all streamed simultaneously as one interleaved output.

A parent speaks:
> *"Make a story about my daughter Priya, her dog Bruno in Hyderabad, learning to ask for help"*

And within 2 minutes receives a **6-page illustrated storybook** — watercolor illustrations, narrated audio, and story text all arriving live in the browser as a single coherent creative stream.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend | https://sincere-quasar-490216-b4.web.app |
| Backend API | https://google-stories-backend-830357554266.us-central1.run.app |
| MCP Server | https://google-stories-mcp-830357554266.us-central1.run.app/mcp |
| Health Check | https://google-stories-backend-830357554266.us-central1.run.app/health |
| Key Status | https://google-stories-backend-830357554266.us-central1.run.app/keys/status |

---

## Demo Video

[![Google Stories Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?style=for-the-badge)](https://your-demo-link-here)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   React SPA      │  │ Web Speech API   │  │  SSE Stream   │ │
│  │ Firebase Hosting │  │ Voice brief input│  │ text·img·audio│ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / SSE
┌────────────────────────────▼────────────────────────────────────┐
│  GATEWAY LAYER  (Cloud Run)                                      │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │ API Gateway  │→ │  Creative Director   │→ │ Stream Mux    │ │
│  │ auth·rate·SSE│  │ brief·visual bible   │  │ route·upload  │ │
│  └──────────────┘  └──────────────────────┘  └───────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ Vertex AI / REST API
┌────────────────────────────▼────────────────────────────────────┐
│  GENERATION LAYER                                                │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Gemini 2.5 Flash│  │   Imagen 3   │  │   Cloud TTS      │  │
│  │  Story text      │  │  Vertex AI   │  │  Narration audio │  │
│  │  [PARAGRAPH]     │  │ Illustrations│  │  en-US-Journey-F │  │
│  │  [ILLUSTRATION]  │  │  4:3 ratio   │  │  MP3 chunks      │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  STORAGE LAYER                                                   │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Firestore   │  │  Cloud Storage   │  │  Cloud Pub/Sub   │  │
│  │ sessions     │  │  images · audio  │  │  async exports   │  │
│  │ history      │  │  export bundles  │  │  job queue       │  │
│  └──────────────┘  └──────────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  MCP LAYER  (Cloud Run — globally accessible)                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  MCP Server  │→ │ stories_generate │  │ stories_export   │  │
│  │  FastMCP     │  │ stories_session  │  │ stories_regen    │  │
│  │  Streamable  │  │ stories_health   │  │  + 2 more tools  │  │
│  │  HTTP 2025   │  └──────────────────┘  └──────────────────┘  │
│  └──────────────┘                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  PLATFORM LAYER                                                  │
│  Cloud Logging · Cloud Monitoring · Cloud Armor · Cloud Build   │
│  Artifact Registry · Firebase Auth · VPC · IAM                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### AI & Generation

| Service | Purpose | Details |
|---|---|---|
| **Gemini 2.5 Flash** | Story text generation | Structured `[PARAGRAPH]`/`[ILLUSTRATION]` output, streaming SSE via REST API |
| **Imagen 3** (`imagen-3.0-fast-generate-001`) | Illustrations | Vertex AI SDK, 4:3 aspect ratio, 4-level safety fallback |
| **Cloud Text-to-Speech** | Narration audio | `en-US-Journey-F` WaveNet voice, MP3 chunks per paragraph |
| **Visual Bible System** | Style consistency | Second Gemini call generates locked character + style guide injected into every Imagen 3 prompt |

### Google Cloud Platform

| Service | Purpose |
|---|---|
| **Cloud Run** | FastAPI backend + MCP server, auto-scaling, min 1 instance warm |
| **Vertex AI** | Imagen 3 image generation |
| **Cloud Storage (GCS)** | Generated images, audio files, export bundles |
| **Firestore** | Session state, story metadata, version history |
| **Cloud Build** | CI/CD container builds |
| **Artifact Registry** | Docker image storage |
| **Firebase Hosting** | React frontend CDN deployment |
| **Cloud Logging** | Request and generation audit logs |
| **Cloud Monitoring** | Latency dashboards and health alerts |
| **Cloud Armor** | WAF and DDoS protection |

### Backend

- **FastAPI** + **uvicorn** — async Python server
- **httpx** — direct REST calls to Gemini API with real SSE streaming
- **4-key rotation system** — all keys health-checked on startup, auto-failover on 429
- **4-level image fallback** — full prompt → simplified → generic safe → minimal → PIL placeholder
- **Pillow** — last-resort placeholder generation so stories always have 6 images

### Frontend

- **React** + **Vite** — SPA with SSE stream consumer
- **Web Speech API** — browser-native voice brief input (Chrome)
- **localStorage** — story persistence and library (up to 20 stories, survives browser close)
- **Claymorphism UI** — dark navy theme, 3D clay cards, skeleton loaders, chip selectors
- **Google Fonts** — Baloo 2 (display) + Nunito (body)

### MCP Server

- **FastMCP** — Model Context Protocol server
- **Streamable HTTP** (MCP 2025 spec)
- **5 tools** exposed globally at public Cloud Run URL
- Compatible with Claude Desktop, Claude.ai, and any MCP client

---

## MCP Integration

The Google Stories MCP server is publicly available at:

```
https://google-stories-mcp-830357554266.us-central1.run.app/mcp
```

### Connect to Claude Desktop

Add to `C:\Users\YOUR_NAME\AppData\Roaming\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-stories": {
      "type": "streamable-http",
      "url": "https://google-stories-mcp-830357554266.us-central1.run.app/mcp"
    }
  }
}
```

Restart Claude Desktop, then ask:
> *"Generate a story about Priya and her dog Bruno in Hyderabad, learning to ask for help"*

### MCP Tool Reference

| Tool | Description |
|---|---|
| `stories_generate` | Generate a complete 6-page personalized storybook — returns session_id, pages with text + image_url + audio_url |
| `stories_get_session` | Retrieve a past session from Firestore by session_id |
| `stories_regenerate_segment` | Re-run Imagen 3 for one illustration without regenerating the whole story |
| `stories_export` | Export as PDF, HTML, or ZIP — returns GCS signed download URL |
| `stories_health` | Check backend status, API key health, and model configuration |

---

## Project Structure

```
google-stories/
├── backend/
│   ├── main.py                 # FastAPI server — generation, streaming, key rotation
│   ├── mcp_server.py           # MCP server — 5 tools, Streamable HTTP transport
│   ├── requirements.txt        # Python deps (backend)
│   ├── requirements.mcp.txt    # Python deps (MCP server — no Windows packages)
│   ├── Dockerfile              # Backend container
│   ├── Dockerfile.mcp          # MCP server container
│   ├── cloudbuild.mcp.yaml     # Cloud Build config for MCP image
│   ├── deploy.ps1              # One-command backend redeploy (Windows)
│   └── .env.example            # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main component — UI, SSE consumer, localStorage, story library
│   │   └── main.jsx            # React entry point
│   ├── public/
│   │   └── GoogleStories.png   # App logo
│   ├── index.html              # HTML shell with Google Fonts
│   └── .env                    # VITE_BACKEND_URL
└── README.md
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud CLI (`gcloud`)
- GCP project with billing enabled

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/google-stories.git
cd google-stories
```

### 2. GCP Project Setup

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable run.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable texttospeech.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable generativelanguage.googleapis.com

gcloud iam service-accounts create google-stories-sa \
  --display-name="Google Stories Service Account"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:google-stories-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

gcloud iam service-accounts keys create backend/credentials.json \
  --iam-account=google-stories-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com

gcloud storage buckets create gs://stories-media-YOUR_ID \
  --location=us-central1 --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding gs://stories-media-YOUR_ID \
  --member=allUsers --role=roles/storage.objectViewer
```

Create Firestore database at https://console.cloud.google.com/firestore — choose **Native mode**, region `us-central1`.

### 3. Backend Setup

```bash
cd backend

python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values

uvicorn main:app --reload --port 8080
# Test: curl http://localhost:8080/health
```

**.env:**
```env
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=stories-media-your-id
GEMINI_API_KEY_1=your-key-1
GEMINI_API_KEY_2=your-key-2
GEMINI_API_KEY_3=your-key-3
GEMINI_API_KEY_4=your-key-4
```

### 4. Frontend Setup

```bash
cd frontend
npm install
echo "VITE_BACKEND_URL=http://localhost:8080" > .env
npm run dev
# Open http://localhost:5173 in Chrome
```

### 5. MCP Server (local)

```bash
cd backend
pip install fastmcp
python mcp_server.py
# Running at http://localhost:8090/mcp
```

---

## Deploy to Google Cloud

### Backend — Cloud Run

```bash
cd backend

gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/google-stories-repo/backend:latest

gcloud run deploy google-stories-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/google-stories-repo/backend:latest \
  --platform managed --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi --cpu 4 \
  --timeout 300 --concurrency 80 --min-instances 1 \
  --set-env-vars "GCP_PROJECT_ID=YOUR_ID,GCS_BUCKET_NAME=YOUR_BUCKET,GEMINI_API_KEY_1=KEY1,GEMINI_API_KEY_2=KEY2,GEMINI_API_KEY_3=KEY3,GEMINI_API_KEY_4=KEY4"
```

### MCP Server — Cloud Run

```bash
gcloud builds submit --config=cloudbuild.mcp.yaml

gcloud run deploy google-stories-mcp \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/google-stories-repo/mcp:latest \
  --platform managed --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 \
  --timeout 300 --concurrency 80 --min-instances 1 \
  --set-env-vars "STORIES_BACKEND_URL=https://YOUR_BACKEND_URL"
```

### Frontend — Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## Backend API Reference

### `POST /generate`

Stream a personalized storybook as Server-Sent Events.

**Request body:**
```json
{
  "child_name":       "Priya",
  "story_topic":      "Priya and her dog Bruno in Hyderabad, learning to ask for help",
  "style":            "watercolor",
  "age_group":        "6-8",
  "characters":       ["Bruno the golden retriever"],
  "voice_transcript": ""
}
```

**SSE events emitted:**
```
data: {"type": "session",        "session_id": "a3f9b2c1"}
data: {"type": "text",           "delta": "Once upon a time in Hyderabad..."}
data: {"type": "creative_note",  "message": "Creative Director locked watercolor style..."}
data: {"type": "image_loading",  "index": 0}
data: {"type": "image",          "url": "https://storage.googleapis.com/...", "index": 0}
data: {"type": "audio",          "url": "https://storage.googleapis.com/...", "segment_index": 0}
data: {"type": "done",           "session_id": "a3f9b2c1", "total_images": 6}
```

### `GET /health`
Returns service status, model names, and API key health summary.

### `GET /keys/status`
Returns per-key health with emoji indicators (`Healthy 🟢` / `Failed 🔴`).

---

## Key Features

### Visual Bible System
Before generating any illustration, the agent makes a dedicated Gemini call to extract a locked style guide from the brief — exact character physical descriptions (hair, skin, clothes, eyes), color palette, lighting, and world setting. This guide is prepended to every Imagen 3 prompt so characters look consistent across all 6 pages.

### 4-Level Image Fallback
If Imagen 3's safety filter blocks a scene, the system retries automatically:
1. Full scene description + visual bible
2. First sentence of scene only (simplified)
3. Generic safe scene — garden, market, library, kites
4. Minimal art prompt — sunrise, stars, candles
5. Last resort: PIL-generated color placeholder

Stories always deliver 6 images. Generation never fails silently.

### API Key Rotation
All four API keys are health-checked on server startup. During generation, any 429 rate limit or HTTP error instantly marks the key failed and rotates to the next healthy key without interrupting the SSE stream. On full exhaustion, all keys reset and retry automatically.

### Creative Director Callout
After building the Visual Bible, the agent emits a `creative_note` event explaining its decisions — which style it locked, why it placed each illustration where it did. This surfaces in the UI as a purple callout visible to users and judges.

### localStorage Story Persistence
Stories are written to `localStorage` on every incoming segment. Closing or refreshing the browser restores the exact story state. Completed stories are saved to a library (max 20). Users can browse, reload, or delete individual stories. No login required.

### Skeleton Loading
While Imagen 3 renders each illustration (6–8 seconds), animated shimmer skeleton loaders maintain reading flow. When the CDN URL arrives, the skeleton is replaced in-place using React state mapping — no layout shift.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GCP_PROJECT_ID` | GCP project ID | Yes |
| `GCS_BUCKET_NAME` | Cloud Storage bucket name | Yes |
| `GEMINI_API_KEY_1` | Primary Gemini API key | Yes |
| `GEMINI_API_KEY_2` | Fallback key 2 | No |
| `GEMINI_API_KEY_3` | Fallback key 3 | No |
| `GEMINI_API_KEY_4` | Fallback key 4 | No |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | Local only |
| `STORIES_BACKEND_URL` | Backend URL for MCP server | MCP only |
| `MCP_PORT` | MCP server port (default 8090) | MCP only |

---

## Performance Targets

| Metric | Target | Notes |
|---|---|---|
| First text token | < 2s | Gemini 2.5 Flash streaming |
| Per illustration | 6–8s | Imagen 3 Fast model |
| Full 6-page story | < 2 min | All illustrations + audio |
| Concurrent sessions | 80+ | Cloud Run auto-scales |
| Uptime | 99.9% | `--min-instances 1` |
| Image delivery | 100% | 4-level fallback guarantees 6 images |

---

## Hackathon Submission

| Field | Value |
|---|---|
| Challenge | Gemini Live Agent Challenge |
| Track | Best Creative Storyteller |
| GCP Project | `sincere-quasar-490216-b4` |
| Frontend | https://sincere-quasar-490216-b4.web.app |
| Backend | https://google-stories-backend-830357554266.us-central1.run.app |
| MCP Server | https://google-stories-mcp-830357554266.us-central1.run.app/mcp |

### Judging Criteria

| Axis | Weight | How Google Stories addresses it |
|---|---|---|
| Innovation & Multimodal UX | 40% | Voice brief → Gemini text + Imagen 3 illustrations + Cloud TTS audio, all streamed simultaneously. Creative Director makes deliberate decisions and explains them. Style consistency via Visual Bible. |
| Technical Implementation | 30% | Gemini 2.5 Flash + Imagen 3 + Cloud Run + Vertex AI + Firestore + GCS + Cloud TTS + MCP server. Full GCP-native stack. 4-key rotation. 4-level image fallback. |
| Demo & Presentation | 30% | Live deployed URL, real-time generation on screen, GCP Cloud Run console shown in demo video. |

---

## Built With

`Gemini-2.5-Flash` `Imagen-3` `Vertex-AI` `Google-Cloud-Run` `Firebase-Hosting` `Cloud-Text-to-Speech` `Firestore` `Cloud-Storage` `Cloud-Build` `Artifact-Registry` `Cloud-Logging` `Cloud-Monitoring` `FastAPI` `Python` `React` `Vite` `FastMCP` `httpx` `Pillow` `Web-Speech-API` `Server-Sent-Events-SSE` `Model-Context-Protocol-MCP`

---

## License

MIT — see LICENSE for details.

---

*Built for the Gemini Live Agent Challenge · March 2026*
*Gemini 2.5 Flash · Imagen 3 · Cloud Run · Vertex AI · Firebase · FastMCP*