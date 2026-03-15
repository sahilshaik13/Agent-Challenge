"""
Google Stories — MCP Server
Exposes the Stories API as Model Context Protocol tools.
Transport: Streamable HTTP (MCP 2025 spec) on port 8090
Usage: python mcp_server.py
"""

import os, json, asyncio, httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── Try to import FastMCP ────────────────────────────────────────────────────
try:
    from fastmcp import FastMCP
except ImportError:
    raise ImportError(
        "FastMCP not installed. Run: pip install fastmcp"
    )

# ── Config ───────────────────────────────────────────────────────────────────
BACKEND_URL = os.environ.get(
    "STORIES_BACKEND_URL",
    "https://google-stories-backend-830357554266.us-central1.run.app"
)
MCP_PORT    = int(os.environ.get("MCP_PORT", 8090))

# ── MCP Server ────────────────────────────────────────────────────────────────
mcp = FastMCP("google-stories")


# ════════════════════════════════════════════════════════════════════════════
#  TOOL 1 — stories_generate
# ════════════════════════════════════════════════════════════════════════════
@mcp.tool()
async def stories_generate(
    child_name: str,
    story_topic: str,
    style: str = "watercolor",
    age_group: str = "6-8",
    characters: Optional[list[str]] = None,
    voice_transcript: str = "",
) -> dict:
    """
    Generate a complete personalized illustrated storybook.

    Creates a 6-page storybook with:
    - Story text written by Gemini 2.5 Flash
    - Watercolor/cartoon/sketch illustrations by Imagen 3
    - Narration audio by Cloud Text-to-Speech
    - All content streamed and saved to Google Cloud Storage

    Args:
        child_name:       Name of the child the story is for (e.g. "Priya")
        story_topic:      Story topic and lesson (e.g. "Priya and her dog Bruno in Hyderabad, learning to ask for help")
        style:            Illustration style — "watercolor" | "cartoon" | "sketch"
        age_group:        Child's age group — "3-5" | "6-8" | "9-12"
        characters:       Optional list of additional characters (e.g. ["Bruno the golden retriever"])
        voice_transcript: Optional raw voice brief transcript

    Returns:
        dict with session_id, segments (text + image URLs + audio URLs),
        total_images, and status
    """
    payload = {
        "child_name":       child_name,
        "story_topic":      story_topic,
        "style":            style,
        "age_group":        age_group,
        "characters":       characters or [],
        "voice_transcript": voice_transcript,
    }

    collected_segments = []
    session_id         = None
    total_images       = 0
    error_message      = None

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                f"{BACKEND_URL}/generate",
                json=payload,
                headers={"Accept": "text/event-stream"},
            ) as response:

                if response.status_code != 200:
                    body = await response.aread()
                    return {
                        "success": False,
                        "error": f"Backend returned {response.status_code}: {body.decode()}",
                    }

                buffer = ""
                async for raw_chunk in response.aiter_text():
                    buffer += raw_chunk
                    lines   = buffer.split("\n")
                    buffer  = lines.pop()

                    for line in lines:
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if not data_str or data_str == "[DONE]":
                            continue
                        try:
                            event = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        ev_type = event.get("type")

                        if ev_type == "session":
                            session_id = event.get("session_id")

                        elif ev_type == "text":
                            # Accumulate text into paragraphs
                            if collected_segments and collected_segments[-1]["type"] == "text":
                                collected_segments[-1]["content"] += event.get("delta", "")
                            else:
                                collected_segments.append({
                                    "type":    "text",
                                    "content": event.get("delta", ""),
                                })

                        elif ev_type == "image":
                            collected_segments.append({
                                "type":  "image",
                                "url":   event.get("url"),
                                "index": event.get("index"),
                            })
                            total_images += 1

                        elif ev_type == "audio":
                            collected_segments.append({
                                "type":          "audio",
                                "url":           event.get("url"),
                                "segment_index": event.get("segment_index"),
                            })

                        elif ev_type == "done":
                            total_images = event.get("total_images", total_images)

                        elif ev_type == "error":
                            error_message = event.get("message")

    except httpx.TimeoutException:
        return {"success": False, "error": "Request timed out after 5 minutes"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    if error_message:
        return {"success": False, "error": error_message, "session_id": session_id}

    # Build clean output
    text_segments  = [s for s in collected_segments if s["type"] == "text"]
    image_segments = [s for s in collected_segments if s["type"] == "image"]
    audio_segments = [s for s in collected_segments if s["type"] == "audio"]

    pages = []
    for i, img in enumerate(image_segments):
        pages.append({
            "page_number": i + 1,
            "text":        text_segments[i]["content"] if i < len(text_segments) else "",
            "image_url":   img["url"],
            "audio_url":   audio_segments[i]["url"] if i < len(audio_segments) else None,
        })

    return {
        "success":      True,
        "session_id":   session_id,
        "child_name":   child_name,
        "story_topic":  story_topic,
        "style":        style,
        "total_pages":  len(pages),
        "total_images": total_images,
        "pages":        pages,
        "all_segments": collected_segments,
    }


# ════════════════════════════════════════════════════════════════════════════
#  TOOL 2 — stories_get_session
# ════════════════════════════════════════════════════════════════════════════
@mcp.tool()
async def stories_get_session(session_id: str) -> dict:
    """
    Retrieve a previously generated story session from Firestore.

    Returns the session metadata including child name, story topic,
    style, status, and generation timestamp.

    Args:
        session_id: The session ID returned by stories_generate

    Returns:
        dict with session metadata and status
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BACKEND_URL}/sessions/{session_id}")

            if response.status_code == 404:
                return {"success": False, "error": f"Session {session_id} not found"}
            if response.status_code != 200:
                return {"success": False, "error": f"Backend error {response.status_code}"}

            data = response.json()
            return {"success": True, "session": data}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ════════════════════════════════════════════════════════════════════════════
#  TOOL 3 — stories_regenerate_segment
# ════════════════════════════════════════════════════════════════════════════
@mcp.tool()
async def stories_regenerate_segment(
    session_id: str,
    segment_index: int,
    style_override: Optional[str] = None,
) -> dict:
    """
    Regenerate a specific illustration in an existing story.

    Useful when a generated image triggered the safety filter or
    doesn't match the desired style. Re-runs Imagen 3 for just
    that page without regenerating the entire story.

    Args:
        session_id:     The session ID of the story to edit
        segment_index:  Zero-based index of the image to regenerate (0–5)
        style_override: Optional new style — "watercolor" | "cartoon" | "sketch"

    Returns:
        dict with new image URL and segment index
    """
    payload = {"style_override": style_override} if style_override else {}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/sessions/{session_id}/segments/{segment_index}/regenerate",
                json=payload,
            )

            if response.status_code == 404:
                return {"success": False, "error": f"Session {session_id} not found"}
            if response.status_code != 200:
                return {"success": False, "error": f"Backend error {response.status_code}: {response.text}"}

            data = response.json()
            return {
                "success":       True,
                "session_id":    session_id,
                "segment_index": segment_index,
                "new_image_url": data.get("url"),
            }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ════════════════════════════════════════════════════════════════════════════
#  TOOL 4 — stories_export
# ════════════════════════════════════════════════════════════════════════════
@mcp.tool()
async def stories_export(
    session_id: str,
    format: str = "pdf",
) -> dict:
    """
    Export a completed story as a downloadable file.

    Assembles all pages (text + images) into a formatted document
    and returns a signed download URL from Google Cloud Storage.

    Args:
        session_id: The session ID of the completed story
        format:     Export format — "pdf" | "html" | "zip"
                    pdf  = formatted storybook PDF
                    html = self-contained HTML with embedded images
                    zip  = all assets + manifest.json

    Returns:
        dict with job_id, status, and download_url (when ready)
    """
    if format not in ("pdf", "html", "zip"):
        return {"success": False, "error": "format must be 'pdf', 'html', or 'zip'"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/sessions/{session_id}/export",
                json={"format": format},
            )

            if response.status_code == 404:
                return {"success": False, "error": f"Session {session_id} not found"}
            if response.status_code != 200:
                return {"success": False, "error": f"Backend error {response.status_code}: {response.text}"}

            data = response.json()
            return {
                "success":      True,
                "session_id":   session_id,
                "format":       format,
                "job_id":       data.get("job_id"),
                "status":       data.get("status", "queued"),
                "download_url": data.get("download_url"),
                "message":      f"Export queued. Use job_id to poll for completion." if not data.get("download_url") else "Export ready.",
            }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ════════════════════════════════════════════════════════════════════════════
#  TOOL 5 — stories_health
# ════════════════════════════════════════════════════════════════════════════
@mcp.tool()
async def stories_health() -> dict:
    """
    Check the health of the Google Stories backend.

    Returns API key status, model info, GCP project,
    and Cloud Storage bucket configuration.

    Returns:
        dict with health status and configuration details
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            health_response = await client.get(f"{BACKEND_URL}/health")
            keys_response   = await client.get(f"{BACKEND_URL}/keys/status")

            health = health_response.json() if health_response.status_code == 200 else {}
            keys   = keys_response.json()   if keys_response.status_code   == 200 else {}

            return {
                "success":       True,
                "backend_url":   BACKEND_URL,
                "status":        health.get("status", "unknown"),
                "project":       health.get("project"),
                "bucket":        health.get("bucket"),
                "text_model":    health.get("text_model"),
                "image_model":   health.get("image_model"),
                "keys_healthy":  health.get("keys_healthy", 0),
                "keys_total":    health.get("keys_total", 0),
                "key_details":   keys.get("key_status", {}),
            }

    except Exception as e:
        return {"success": False, "backend_url": BACKEND_URL, "error": str(e)}


# ════════════════════════════════════════════════════════════════════════════
#  RESOURCES — expose story brief schema as MCP resource
# ════════════════════════════════════════════════════════════════════════════
@mcp.resource("stories://schema/brief")
def get_brief_schema() -> str:
    """Returns the JSON schema for a story brief."""
    schema = {
        "type": "object",
        "description": "Creative brief for generating a personalized storybook",
        "properties": {
            "child_name": {
                "type": "string",
                "description": "The child's first name — appears throughout the story",
                "example": "Priya"
            },
            "story_topic": {
                "type": "string",
                "description": "Story premise, characters, setting, and lesson",
                "example": "Priya and her dog Bruno in Hyderabad, learning to ask for help"
            },
            "style": {
                "type": "string",
                "enum": ["watercolor", "cartoon", "sketch"],
                "default": "watercolor",
                "description": "Illustration art style"
            },
            "age_group": {
                "type": "string",
                "enum": ["3-5", "6-8", "9-12"],
                "default": "6-8",
                "description": "Child's age group — affects vocabulary and story complexity"
            },
            "characters": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Additional characters beyond the main child",
                "example": ["Bruno the golden retriever", "Grandma Meera"]
            },
            "voice_transcript": {
                "type": "string",
                "description": "Raw voice input transcript if using voice brief",
                "default": ""
            }
        },
        "required": ["child_name", "story_topic"]
    }
    return json.dumps(schema, indent=2)


@mcp.resource("stories://examples/briefs")
def get_example_briefs() -> str:
    """Returns example story briefs to inspire usage."""
    examples = [
        {
            "child_name":  "Priya",
            "story_topic": "Priya and her dog Bruno in Hyderabad, learning to ask for help",
            "style":       "watercolor",
            "age_group":   "6-8",
        },
        {
            "child_name":  "Arjun",
            "story_topic": "Arjun discovers a magical library in Chennai where books come alive, learning that reading opens every door",
            "style":       "cartoon",
            "age_group":   "9-12",
        },
        {
            "child_name":  "Zara",
            "story_topic": "Zara the little astronaut explores the moon with her robot friend Bolt, learning to be brave",
            "style":       "watercolor",
            "age_group":   "3-5",
        },
        {
            "child_name":  "Rohan",
            "story_topic": "Rohan and his parrot Mango get lost in the streets of Mumbai but find their way home by being kind to strangers",
            "style":       "sketch",
            "age_group":   "6-8",
        },
    ]
    return json.dumps(examples, indent=2)


# ════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8090))
    print(f"""
╔══════════════════════════════════════════════╗
║       Google Stories MCP Server              ║
║       Version 1.0.0                          ║
╠══════════════════════════════════════════════╣
║  Transport:  Streamable HTTP                 ║
║  Port:       {port}                              ║
║  Endpoint:   POST /mcp                       ║
║  Backend:    {BACKEND_URL[:44]}  ║
╠══════════════════════════════════════════════╣
║  Tools available:                            ║
║    • stories_generate                        ║
║    • stories_get_session                     ║
║    • stories_regenerate_segment              ║
║    • stories_export                          ║
║    • stories_health                          ║
║  Resources:                                  ║
║    • stories://schema/brief                  ║
║    • stories://examples/briefs               ║
╚══════════════════════════════════════════════╝
    """)

    uvicorn.run(
        mcp.http_app(),
        host="0.0.0.0",
        port=port,
    )