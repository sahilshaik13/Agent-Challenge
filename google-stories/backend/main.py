import os, json, base64, uuid, asyncio, re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google.cloud import storage, texttospeech, firestore
import httpx
import logging
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ───────────────────────────────────────────────────────────────────────
PROJECT_ID  = os.environ.get("GCP_PROJECT_ID")
BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")
LOCATION    = "us-central1"

# Gemini 2.5 Flash for story text (REST API with key rotation)
GEMINI_TEXT_MODEL = "gemini-2.5-flash"
GEMINI_BASE_URL   = "https://generativelanguage.googleapis.com/v1beta/models"

# Imagen 3 on Vertex AI for illustrations
vertexai.init(project=PROJECT_ID, location=LOCATION)
imagen_model = ImageGenerationModel.from_pretrained("imagen-3.0-fast-generate-001")

# ── API Key Pool ─────────────────────────────────────────────────────────────────
API_KEYS = [
    k for k in [
        os.environ.get("GEMINI_API_KEY_1"),
        os.environ.get("GEMINI_API_KEY_2"),
        os.environ.get("GEMINI_API_KEY_3"),
        os.environ.get("GEMINI_API_KEY_4"),
    ] if k
]

key_status = {key: "healthy" for key in API_KEYS}


def get_healthy_key() -> str | None:
    healthy = [k for k, s in key_status.items() if s == "healthy"]
    if not healthy:
        logger.warning("All keys failed — resetting for retry")
        for k in key_status:
            key_status[k] = "healthy"
        healthy = list(key_status.keys())
    return healthy[0] if healthy else None


def mark_key_failed(key: str):
    key_status[key] = "failed"
    remaining = sum(1 for s in key_status.values() if s == "healthy")
    logger.warning(f"Key ...{key[-6:]} marked failed. {remaining} healthy remaining.")


async def test_key_async(key: str) -> bool:
    url     = f"{GEMINI_BASE_URL}/{GEMINI_TEXT_MODEL}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": "Say OK"}]}],
        "generationConfig": {"maxOutputTokens": 5}
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload)
            return r.status_code == 200
    except Exception as e:
        logger.error(f"Key test error ...{key[-6:]}: {e}")
        return False


# ── Startup key check ────────────────────────────────────────────────────────────
@app.on_event("startup")
async def check_all_keys():
    logger.info(f"\n{'='*50}")
    logger.info(f"Testing {len(API_KEYS)} Gemini API keys...")
    for key in API_KEYS:
        ok = await test_key_async(key)
        key_status[key] = "healthy" if ok else "failed"
        logger.info(f"  [{'OK  ' if ok else 'FAIL'}] Key ending ...{key[-6:]}")
    healthy = sum(1 for s in key_status.values() if s == "healthy")
    logger.info(f"Result: {healthy}/{len(API_KEYS)} keys healthy")
    logger.info(f"Imagen 3 Fast model ready: imagen-3.0-fast-generate-001")
    logger.info(f"{'='*50}\n")


# ── GCP clients ──────────────────────────────────────────────────────────────────
storage_client = storage.Client()
tts_client     = texttospeech.TextToSpeechClient()
db             = firestore.Client()


# ── Pydantic model ───────────────────────────────────────────────────────────────
class StoryBrief(BaseModel):
    child_name:       str
    story_topic:      str
    characters:       list[str] = []
    style:            str = "watercolor"
    age_group:        str = "6-8"
    voice_transcript: str = ""


# ── GCS helpers ──────────────────────────────────────────────────────────────────
def upload_image_to_gcs(image_bytes: bytes, session_id: str, img_index: int) -> str:
    bucket    = storage_client.bucket(BUCKET_NAME)
    blob_name = f"{session_id}/images/img_{img_index:02d}.png"
    blob      = bucket.blob(blob_name)
    blob.upload_from_string(image_bytes, content_type="image/png")
    logger.info(f"Uploaded image {img_index} → {blob_name}")
    return f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_name}"


def generate_audio(text: str, session_id: str, seg_index: int) -> str:
    synthesis_input = texttospeech.SynthesisInput(text=text[:500])
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Journey-F",
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    response  = tts_client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    bucket    = storage_client.bucket(BUCKET_NAME)
    blob_name = f"{session_id}/audio/narr_{seg_index:02d}.mp3"
    blob      = bucket.blob(blob_name)
    blob.upload_from_string(response.audio_content, content_type="audio/mpeg")
    return f"https://storage.googleapis.com/{BUCKET_NAME}/{blob_name}"


async def build_visual_bible(brief: StoryBrief, full_story_text: str) -> str:
    """
    Call Gemini once to extract a locked visual bible from the brief + story text.
    This is prepended to every Imagen prompt to enforce character/style consistency.
    """
    prompt = (
        "You are an art director locking down a visual style guide for a children's storybook illustrator.\n"
        "The illustrator has NO memory between images and must be told everything from scratch each time.\n\n"
        f"STORY BRIEF:\n"
        f"- Child's name: {brief.child_name}\n"
        f"- Topic: {brief.story_topic}\n"
        f"- Characters: {', '.join(brief.characters) if brief.characters else 'inferred from story'}\n"
        f"- Style: {brief.style}\n"
        f"- Age group: {brief.age_group}\n\n"
        f"STORY TEXT:\n{full_story_text[:2000]}\n\n"
        "Write a LOCKED VISUAL BIBLE. Be obsessively specific. Use this exact format:\n\n"
        "STYLE: [art style, e.g. 'soft watercolor, warm earthy tones, gentle ink outlines, Studio Ghibli-inspired']\n"
        "PALETTE: [exactly 4 hex-or-name colors that define this world]\n"
        "LIGHTING: [e.g. 'warm golden afternoon sunlight, soft shadows']\n"
        "WORLD: [one sentence: era, city, environment feel]\n\n"
        "CHARACTER_1: [full name] | [age: X-year-old] | [ethnicity/skin tone] | "
        "[hair: exact color, length, style] | [eyes: color] | "
        "[TOP: exact garment + color + pattern] | [BOTTOM: exact garment + color] | "
        "[SHOES: type + color] | [EXTRA: any accessory, bag, hat, distinguishing mark]\n"
        "CHARACTER_2: [same format — only if a second character exists]\n"
        "CHARACTER_3: [same format — only if a third character exists]\n\n"
        "NEVER_CHANGE: List 5 things that must stay identical across all images "
        "(e.g. 'Priya always has black braids', 'Sahil always wears a green hoodie')\n\n"
        "Keep each line short and usable as a direct image prompt fragment. "
        "Do NOT use vague words like 'colorful' or 'nice' — be specific."
    )

    current_key = get_healthy_key()
    if not current_key:
        return ""

    url     = f"{GEMINI_BASE_URL}/{GEMINI_TEXT_MODEL}:generateContent?key={current_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600},
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, json=payload)
        if r.status_code == 200:
            data  = r.json()
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            bible = parts[0].get("text", "").strip() if parts else ""
            logger.info(f"Visual bible built:\n{bible}")
            return bible
    except Exception as e:
        logger.warning(f"Visual bible generation failed (non-fatal): {e}")
    return ""


async def generate_imagen3(
    scene_description: str,
    style: str,
    session_id: str,
    img_index: int,
    visual_bible: str = "",
) -> str | None:
    """Generate one illustration using Imagen 3 Fast on Vertex AI and upload to GCS."""
    # Build the prompt: bible lock → scene → hard consistency instruction
    if visual_bible:
        imagen_prompt = (
            f"=== LOCKED CHARACTER & STYLE BIBLE — FOLLOW EXACTLY ===\n"
            f"{visual_bible}\n"
            f"=== END BIBLE ===\n\n"
            f"Children's book illustration in {style} style.\n"
            f"SCENE FOR THIS PAGE: {scene_description}\n\n"
            f"CRITICAL RULES:\n"
            f"- Every character MUST match the bible above exactly — same face, hair, skin, clothes\n"
            f"- Do NOT change any character's outfit, hair, or physical features from the bible\n"
            f"- Maintain the exact color palette from the bible\n"
            f"- Warm, gentle, age-appropriate art. Soft colors. Friendly characters.\n"
            f"- No text, letters, words, or numbers anywhere in the image."
        )
    else:
        imagen_prompt = (
            f"Children's book illustration in {style} style. "
            f"Warm, gentle, age-appropriate art. "
            f"SCENE: {scene_description}. "
            f"Soft colors, friendly characters, storybook aesthetic. "
            f"No text or letters in the image."
        )
    try:
        loop   = asyncio.get_event_loop()
        images = await loop.run_in_executor(
            None,
            lambda: imagen_model.generate_images(
                prompt=imagen_prompt,
                number_of_images=1,
                aspect_ratio="4:3",
                safety_filter_level="block_few",
                person_generation="allow_all",
            )
        )
        # Throttle to stay within 20 req/min quota (1 req per 3s)
        await asyncio.sleep(3)

        # Debug: log what came back
        logger.info(f"Scene {img_index} raw response: images={images}, "
                    f"has .images={hasattr(images, 'images')}, "
                    f"count={len(images.images) if images and hasattr(images, 'images') else 0}")

        if not images or not hasattr(images, "images") or not images.images:
            logger.warning(f"Imagen 3 Fast returned no images for scene {img_index} "
                           f"(likely safety filter — raw: {images})")
            return None

        img_obj = images.images[0]
        # Try both attribute names the SDK uses depending on version
        img_bytes = getattr(img_obj, "_image_bytes", None) or getattr(img_obj, "image_bytes", None)
        if not img_bytes:
            logger.error(f"Scene {img_index}: image object has no bytes. Attrs: {dir(img_obj)}")
            return None

        return upload_image_to_gcs(img_bytes, session_id, img_index)

    except Exception as e:
        logger.error(f"Imagen 3 error for scene {img_index}: {e}")
        return None


# ── System prompt ────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a warm, imaginative Creative Director writing personalized illustrated storybooks for children.\n\n"
    "Your job is to write the story text AND provide illustration descriptions for an AI image generator.\n\n"
    "OUTPUT FORMAT — strictly follow this pattern for all 6 pages:\n"
    "[PARAGRAPH] Your story text here (2-4 warm, simple sentences)\n"
    "[ILLUSTRATION] Full self-contained image prompt (see rules below)\n\n"
    "CRITICAL ILLUSTRATION RULES — the image generator has NO memory between images.\n"
    "Every single [ILLUSTRATION] block MUST include ALL of the following, every time, no exceptions:\n\n"
    "1. CHARACTERS: Full physical description of every character in the scene.\n"
    "   - Name, age appearance, exact hair (color + length + style), skin tone, eye color\n"
    "   - Exact outfit with specific colors, e.g. 'wearing a red cotton kurta with gold trim, blue jeans, white sneakers'\n"
    "   - Height relative to other characters\n"
    "   - Do NOT say 'same as before' or 'as described' — write it out IN FULL every time\n\n"
    "2. SCENE: What is happening, where, what emotion, what action\n\n"
    "3. BACKGROUND: Specific environment — location, time of day, lighting, key props\n\n"
    "4. STYLE ANCHOR: End every illustration prompt with exactly: "
    "'Consistent storybook illustration. Same characters throughout. No text or letters.'\n\n"
    "Example of a correct [ILLUSTRATION] block:\n"
    "Priya, an 8-year-old Indian girl with long black braids, warm brown skin, dark eyes, "
    "wearing a bright yellow kurta with red embroidery and white leggings, stands next to her "
    "golden retriever Bruno who has a red collar, in a busy Hyderabad bazaar with colorful stalls "
    "and string lights, afternoon golden light, Priya looks excited and points ahead. "
    "Consistent storybook illustration. Same characters throughout. No text or letters.\n\n"
    "Strict structural rules:\n"
    "- Always alternate: [PARAGRAPH] then [ILLUSTRATION], exactly 6 times each\n"
    "- Never two [PARAGRAPH] blocks in a row\n"
    "- Never two [ILLUSTRATION] blocks in a row\n"
    "- Keep paragraph language simple and warm for the child's age group\n"
    "- The child's name must appear throughout the story\n"
    "- End the story with a clear, warm lesson learned\n"
    "- Total output: exactly 6 [PARAGRAPH] blocks and 6 [ILLUSTRATION] blocks"
)


# ── Main streaming generator ─────────────────────────────────────────────────────
async def stream_story(brief: StoryBrief):
    session_id  = str(uuid.uuid4())[:8]
    img_index   = 0
    seg_index   = 0
    text_buffer = ""

    yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"

    # Save session to Firestore
    try:
        db.collection("sessions").document(session_id).set({
            "child_name":  brief.child_name,
            "story_topic": brief.story_topic,
            "style":       brief.style,
            "status":      "generating",
        })
    except Exception as e:
        logger.warning(f"Firestore write error (non-fatal): {e}")

    prompt = f"""Write a 6-page illustrated storybook with these details:
- Child's name: {brief.child_name}
- Story topic: {brief.story_topic}
- Characters or pets: {', '.join(brief.characters) if brief.characters else 'none specified'}
- Illustration style: {brief.style}
- Age group: {brief.age_group} years old
- Voice brief: {brief.voice_transcript if brief.voice_transcript else 'not provided'}

Use this exact format for each of the 6 pages:
[PARAGRAPH] story text for this page
[ILLUSTRATION] scene description for the illustrator"""

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature":     0.85,
            "maxOutputTokens": 8192,
        }
    }

    # ── Key rotation loop ─────────────────────────────────────────────────────────
    last_error   = ""
    max_attempts = len(API_KEYS)

    for attempt in range(max_attempts):
        current_key = get_healthy_key()
        if not current_key:
            yield f"data: {json.dumps({'type': 'error', 'message': 'All API keys exhausted.'})}\n\n"
            return

        url = f"{GEMINI_BASE_URL}/{GEMINI_TEXT_MODEL}:streamGenerateContent?alt=sse&key={current_key}"
        logger.info(f"Attempt {attempt + 1}: using key ...{current_key[-6:]}")

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream("POST", url, json=payload) as response:

                    if response.status_code == 429:
                        last_error = "Rate limit"
                        mark_key_failed(current_key)
                        continue

                    if response.status_code != 200:
                        error_body = await response.aread()
                        last_error = f"HTTP {response.status_code}: {error_body.decode()}"
                        logger.error(f"Key ...{current_key[-6:]} failed: {last_error}")
                        mark_key_failed(current_key)
                        continue

                    # ── Collect full text from SSE stream ─────────────────────────
                    full_text  = ""
                    stream_buf = ""

                    async for raw_chunk in response.aiter_text():
                        stream_buf += raw_chunk
                        lines       = stream_buf.split("\n")
                        stream_buf  = lines.pop()

                        for line in lines:
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:].strip()
                            if not data_str or data_str == "[DONE]":
                                continue
                            try:
                                chunk = json.loads(data_str)
                            except json.JSONDecodeError:
                                continue

                            candidates = chunk.get("candidates", [])
                            if not candidates:
                                continue

                            parts = candidates[0].get("content", {}).get("parts", [])
                            for part in parts:
                                if "text" in part and part["text"]:
                                    full_text += part["text"]

            # ── Build visual bible for style consistency ──────────────────────────
            visual_bible = await build_visual_bible(brief, full_text)

            # ── Parse [PARAGRAPH] / [ILLUSTRATION] blocks ─────────────────────────
            blocks      = re.split(r'\[(PARAGRAPH|ILLUSTRATION)\]', full_text)
            current_tag = None

            for block in blocks:
                block = block.strip()
                if not block:
                    continue

                if block == "PARAGRAPH":
                    current_tag = "PARAGRAPH"
                    continue
                elif block == "ILLUSTRATION":
                    current_tag = "ILLUSTRATION"
                    continue

                if current_tag == "PARAGRAPH" and block:
                    text_buffer = block
                    # Stream text word by word for a live feel
                    words = block.split(" ")
                    for i, word in enumerate(words):
                        delta = word + (" " if i < len(words) - 1 else "")
                        yield f"data: {json.dumps({'type': 'text', 'delta': delta})}\n\n"
                        await asyncio.sleep(0.03)

                elif current_tag == "ILLUSTRATION" and block:
                    # Tell frontend an image is being generated
                    yield f"data: {json.dumps({'type': 'image_loading', 'index': img_index})}\n\n"

                    # Generate illustration with Imagen 3 + visual bible for consistency
                    img_url = await generate_imagen3(
                        scene_description=block,
                        style=brief.style,
                        session_id=session_id,
                        img_index=img_index,
                        visual_bible=visual_bible,
                    )

                    if img_url:
                        yield f"data: {json.dumps({'type': 'image', 'url': img_url, 'index': img_index})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'image_error', 'index': img_index, 'message': 'Illustration could not be generated'})}\n\n"

                    # Generate narration audio for the preceding paragraph
                    if text_buffer.strip():
                        try:
                            audio_url = generate_audio(
                                text_buffer.strip(), session_id, seg_index
                            )
                            yield f"data: {json.dumps({'type': 'audio', 'url': audio_url, 'segment_index': seg_index})}\n\n"
                            seg_index += 1
                        except Exception as ae:
                            logger.warning(f"Audio error (non-fatal): {ae}")
                        text_buffer = ""

                    img_index += 1
                    await asyncio.sleep(0)

                current_tag = None

            # ── Stream complete ───────────────────────────────────────────────────
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'total_images': img_index})}\n\n"

            try:
                db.collection("sessions").document(session_id).update({"status": "complete"})
            except Exception as e:
                logger.warning(f"Firestore update (non-fatal): {e}")

            return  # Success — exit retry loop

        except httpx.TimeoutException:
            last_error = "Request timed out"
            logger.error(f"Timeout on key ...{current_key[-6:]}")
            mark_key_failed(current_key)
            continue

        except Exception as e:
            last_error = str(e)
            logger.error(f"Error on key ...{current_key[-6:]}: {e}")
            mark_key_failed(current_key)
            continue

    yield f"data: {json.dumps({'type': 'error', 'message': f'All keys failed. Last error: {last_error}'})}\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────────
@app.post("/generate")
async def generate_story(brief: StoryBrief):
    return StreamingResponse(
        stream_story(brief),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
def health():
    healthy = sum(1 for s in key_status.values() if s == "healthy")
    failed  = [k[-6:] for k, s in key_status.items() if s == "failed"]
    return {
        "status":             "ok",
        "project":            PROJECT_ID,
        "bucket":             BUCKET_NAME,
        "text_model":         GEMINI_TEXT_MODEL,
        "image_model":        "imagen-3.0-fast-generate-001 (Vertex AI)",
        "keys_healthy":       healthy,
        "keys_total":         len(API_KEYS),
        "failed_key_endings": failed,
    }


@app.get("/keys/status")
def keys_health():
    return {
        "key_status": {
            f"Key_{i+1} ...{key[-6:]}": ("Healthy 🟢" if status == "healthy" else "Failed 🔴")
            for i, (key, status) in enumerate(key_status.items())
        }
    }