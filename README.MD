# Google Stories 📖
### Gemini Live Agent Challenge — Best Creative Storyteller Track

> **One voice brief. One AI agent. One fully illustrated, narrated storybook — in under 2 minutes.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-orange?style=for-the-badge)](https://sincere-quasar-490216-b4.web.app)
[![Backend](https://img.shields.io/badge/Backend-Cloud%20Run-blue?style=for-the-badge)](https://google-stories-backend-830357554266.us-central1.run.app/health)
[![Model](https://img.shields.io/badge/Model-Gemini%202.5%20Flash-green?style=for-the-badge)](https://cloud.google.com/vertex-ai)
[![Images](https://img.shields.io/badge/Images-Imagen%203-purple?style=for-the-badge)](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)

---

## What is Google Stories?

Google Stories is a **Creative Director AI agent** that transforms a spoken or typed brief into a complete, personalized illustrated storybook for children — with text, Imagen 3 illustrations, and narration audio all streamed simultaneously as one coherent creative output.

A parent speaks:
> *"Make a story about my daughter Priya, her dog Bruno in Hyderabad, learning to ask for help"*

And within 2 minutes receives a **6-page illustrated storybook** — with watercolor illustrations, narrated audio, and story text — all streamed live to the browser as a single interleaved output.

---

## Demo Video

[![Google Stories Demo](https://img.shields.io/badge/Watch%20Demo-YouTube-red?style=for-the-badge)](https://your-demo-link-here)

---

## Architecture

```
Parent speaks voice brief
        │
        ▼
Web Speech API (browser)
        │  transcript
        ▼
┌─────────────────────────────────────────────────────────┐
│              Google Cloud Platform                       │
│                                                         │
│  Cloud Run — FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Creative Director Agent                         │  │
│  │  • Parses brief                                  │  │
│  │  • Builds visual bible (style consistency)       │  │
│  │  • Constructs [PARAGRAPH]/[ILLUSTRATION] prompt  │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                       │
│         ┌───────┴────────┐                             │
│         ▼                ▼                             │
│  Gemini 2.5 Flash    Imagen 3 (Vertex AI)              │
│  (story text)        (illustrations)                    │
│         │                │                             │
│         └───────┬────────┘                             │
│                 │                                       │
│  Cloud TTS ─────┤  (narration audio)                   │
│                 │                                       │
│  Stream Multiplexer                                     │
│  • SSE event routing                                    │
│  • GCS image upload → CDN URL                          │
│  • Audio chunk streaming                               │
│  • API key rotation (4-key failover)                   │
│                 │                                       │
│  Firestore ─────┤  (session persistence)               │
│  GCS ───────────┘  (media storage)                     │
└─────────────────────────────────────────────────────────┘
        │  SSE stream
        ▼
React Frontend (Firebase Hosting)
• Text streams word by word
• Skeleton loaders → Imagen 3 illustrations
• Audio narration auto-plays
• localStorage persistence + story library
```

---

## Tech Stack

### AI & Generation
| Service | Purpose |
|---|---|
| **Gemini 2.5 Flash** | Story text generation with `[PARAGRAPH]`/`[ILLUSTRATION]` structured output |
| **Imagen 3** (`imagen-3.0-fast-generate-001`) | High-quality children's book illustrations via Vertex AI |
| **Cloud Text-to-Speech** | Narration audio (`en-US-Journey-F` voice) |
| **Visual Bible System** | Gemini-generated style guide passed to every Imagen prompt for character consistency |

### Google Cloud Platform
| Service | Purpose |
|---|---|
| **Cloud Run** | Containerized FastAPI backend, auto-scaling |
| **Vertex AI** | Imagen 3 image generation |
| **Cloud Storage (GCS)** | Generated images and audio files |
| **Firestore** | Session state and story history |
| **Cloud Build** | CI/CD container builds |
| **Firebase Hosting** | React frontend deployment |
| **Cloud Logging** | Request and generation logs |
| **Cloud Monitoring** | Latency and health dashboards |

### Backend
- **FastAPI** + **uvicorn** — async Python server
- **httpx** — direct REST calls to Gemini API with streaming SSE
- **4-key rotation system** — automatic failover across API keys on 429/rate limit
- **Pillow** — PIL placeholder generation as last-resort fallback

### Frontend
- **React** + **Vite** — SPA with SSE stream consumer
- **Web Speech API** — browser-native voice input
- **localStorage** — story persistence and history (up to 20 stories)
- **Claymorphism UI** — dark theme with 3D clay cards, skeleton loaders, chip selectors

### MCP Server
- **FastMCP** — Model Context Protocol server exposing 4 tools
- **Streamable HTTP** transport (MCP 2025 spec)
- Enables Claude and other MCP clients to generate stories programmatically

---

## Project Structure

```
google-stories/
├── backend/
│   ├── main.py              # FastAPI server — story generation, streaming, key rotation
│   ├── mcp_server.py        # MCP server — 4 tools exposing the Stories API
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Container definition
│   ├── deploy.ps1           # One-command deploy script (Windows)
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component — UI, SSE consumer, localStorage
│   │   └── main.jsx         # React entry point
│   ├── public/
│   │   └── GoogleStories.png # App logo
│   ├── index.html           # HTML shell with Google Fonts
│   └── .env                 # VITE_BACKEND_URL
└── README.md
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Cloud account with billing enabled
- GCP project with APIs enabled (see Setup)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/google-stories.git
cd google-stories
```

### 2. GCP Project Setup
```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable texttospeech.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable generativelanguage.googleapis.com

# Create service account
gcloud iam service-accounts create google-stories-sa \
  --display-name="Google Stories Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:google-stories-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Download credentials
gcloud iam service-accounts keys create backend/credentials.json \
  --iam-account=google-stories-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Create GCS bucket
gcloud storage buckets create gs://stories-media-YOUR_ID \
  --location=us-central1 --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding gs://stories-media-YOUR_ID \
  --member=allUsers --role=roles/storage.objectViewer
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your values
```

**.env file:**
```env
GOOGLE_APPLICATION_CREDENTIALS=credentials.json
GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=stories-media-your-id
GEMINI_API_KEY_1=your-gemini-api-key
GEMINI_API_KEY_2=your-gemini-api-key-2
GEMINI_API_KEY_3=your-gemini-api-key-3
GEMINI_API_KEY_4=your-gemini-api-key-4
```

```bash
# Run backend
uvicorn main:app --reload --port 8080

# Test
curl http://localhost:8080/health
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Create .env
echo "VITE_BACKEND_URL=http://localhost:8080" > .env

npm run dev
# Open http://localhost:5173
```

### 5. MCP Server Setup (optional)
```bash
cd backend
pip install fastmcp

# Run MCP server
python mcp_server.py

# Test MCP health
curl http://localhost:8090/health
```

---

## Deploy to Google Cloud

### Backend — Cloud Run
```bash
cd backend

# Build and push image
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/google-stories-repo/backend:latest

# Deploy
gcloud run deploy google-stories-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/google-stories-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 4 \
  --timeout 300 \
  --concurrency 80 \
  --min-instances 1 \
  --set-env-vars "GCP_PROJECT_ID=YOUR_PROJECT_ID,GCS_BUCKET_NAME=YOUR_BUCKET,GEMINI_API_KEY_1=KEY1,GEMINI_API_KEY_2=KEY2,GEMINI_API_KEY_3=KEY3,GEMINI_API_KEY_4=KEY4"
```

### Frontend — Firebase Hosting
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## API Reference

### `POST /generate`
Stream a personalized storybook.

**Request body:**
```json
{
  "child_name": "Priya",
  "story_topic": "Priya and her dog Bruno in Hyderabad, learning to ask for help",
  "style": "watercolor",
  "age_group": "6-8",
  "characters": ["Bruno the golden retriever"],
  "voice_transcript": ""
}
```

**SSE events streamed:**
```
data: {"type": "session",       "session_id": "a3f9b2c1"}
data: {"type": "text",          "delta": "Once upon a time..."}
data: {"type": "image_loading", "index": 0}
data: {"type": "image",         "url": "https://storage.googleapis.com/...", "index": 0}
data: {"type": "audio",         "url": "https://storage.googleapis.com/...", "segment_index": 0}
data: {"type": "done",          "session_id": "a3f9b2c1", "total_images": 6}
```

### `GET /health`
Returns service status, model info, and API key health.

### `GET /keys/status`
Returns per-key health status with rotation state.

---

## MCP Tools

Google Stories exposes a Model Context Protocol server at `POST /mcp` with four tools:

| Tool | Description |
|---|---|
| `stories_generate` | Generate a complete personalized storybook |
| `stories_get_session` | Retrieve a session's segments and metadata |
| `stories_regenerate_segment` | Regenerate a specific story segment |
| `stories_export` | Export the story as PDF or HTML |

See `backend/mcp_server.py` for full tool schemas.

---

## Key Features

**Visual Bible System** — Before generating illustrations, the agent calls Gemini to create a locked style guide (character appearance, color palette, lighting, world) that is prepended to every Imagen 3 prompt. This enforces visual consistency across all 6 illustrations.

**4-Level Image Fallback** — If Imagen 3's safety filter blocks a scene, the system automatically retries with: (1) simplified prompt, (2) generic safe scene, (3) minimal art prompt, (4) PIL-generated color placeholder. Stories always have 6 images.

**API Key Rotation** — Four API keys tested on startup. On any 429 or failure, the system instantly rotates to the next healthy key and continues generation without interrupting the stream.

**localStorage Persistence** — Stories are saved to the browser on every segment received. Closing or refreshing the browser restores the exact story state. Up to 20 stories stored in the library.

**Skeleton Loading** — While Imagen 3 generates each illustration (4–8 seconds), animated skeleton loaders maintain the reading flow. When the image arrives, it replaces the skeleton in-place.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID | Yes |
| `GCS_BUCKET_NAME` | Cloud Storage bucket for media | Yes |
| `GEMINI_API_KEY_1` | Primary Gemini API key | Yes |
| `GEMINI_API_KEY_2` | Fallback key 2 | No |
| `GEMINI_API_KEY_3` | Fallback key 3 | No |
| `GEMINI_API_KEY_4` | Fallback key 4 | No |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | Local only |

---

## Non-Functional Performance

| Metric | Target | Achieved |
|---|---|---|
| First text token | < 2s | ~1.2s |
| Per illustration (Imagen 3) | < 10s | ~6–8s |
| Full 6-page story | < 2 min | ~90–110s |
| Concurrent sessions | 80+ | Cloud Run auto-scales |
| Uptime | 99.9% | `--min-instances 1` |

---

## Hackathon Submission

- **Challenge:** Gemini Live Agent Challenge
- **Track:** Best Creative Storyteller
- **Team:** Solo
- **GCP Project:** `sincere-quasar-490216-b4`
- **Live URL:** https://sincere-quasar-490216-b4.web.app
- **Backend URL:** https://google-stories-backend-830357554266.us-central1.run.app

### Judging Criteria Met

| Axis | Weight | How we address it |
|---|---|---|
| Innovation & Multimodal UX | 40% | Voice → text + Imagen 3 illustrations + TTS audio streamed simultaneously |
| Technical Implementation | 30% | Gemini 2.5 Flash + Imagen 3 + Cloud Run + Vertex AI + Firestore + GCS + MCP server |
| Demo & Presentation | 30% | Live deployed URL, real-time generation, GCP console proof in video |

---

## License

MIT License — see LICENSE file for details.

---

*Built for the Gemini Live Agent Challenge · March 2026*