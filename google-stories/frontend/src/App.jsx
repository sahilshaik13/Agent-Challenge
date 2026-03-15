import { useState, useRef, useEffect } from "react"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"
const STORAGE_KEY_CURRENT = "gs_current_story"
const STORAGE_KEY_HISTORY = "gs_story_history"
const MAX_HISTORY = 20

/* ─────────────────────────────────────────────
   LOCAL STORAGE HELPERS
───────────────────────────────────────────── */
const saveCurrentStory = (data) => {
  try { localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data)) } catch {}
}
const loadCurrentStory = () => {
  try { const d = localStorage.getItem(STORAGE_KEY_CURRENT); return d ? JSON.parse(d) : null } catch { return null }
}
const clearCurrentStory = () => {
  try { localStorage.removeItem(STORAGE_KEY_CURRENT) } catch {}
}
const loadHistory = () => {
  try { const d = localStorage.getItem(STORAGE_KEY_HISTORY); return d ? JSON.parse(d) : [] } catch { return [] }
}
const saveToHistory = (story) => {
  try {
    const history = loadHistory()
    const exists = history.findIndex(h => h.id === story.id)
    if (exists >= 0) history[exists] = story
    else history.unshift(story)
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {}
}
const deleteFromHistory = (id) => {
  try {
    const history = loadHistory().filter(h => h.id !== id)
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
  } catch {}
}
const clearAllHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY)
    localStorage.removeItem(STORAGE_KEY_CURRENT)
  } catch {}
}

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Baloo+2:wght@700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:      #0d1117;
      --navy2:     #161b24;
      --navy3:     #1e2533;
      --clay-r:    #ff6b6b;
      --clay-o:    #ff9f43;
      --clay-g:    #1dd1a1;
      --clay-b:    #48dbfb;
      --clay-p:    #a29bfe;
      --white:     #ffffff;
      --text-dim:  #8892a4;
      --text-mid:  #c8d0e0;
      --card-bg:   #1e2533;
      --card-edge: #2a3347;
      --radius-xl: 28px;
      --radius-lg: 20px;
      --radius-md: 14px;
      --font-display: 'Baloo 2', cursive;
      --font-body:    'Nunito', sans-serif;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--navy);
      font-family: var(--font-body);
      color: var(--white);
      min-height: 100vh;
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed; top: -200px; left: -200px;
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(72,219,251,0.07) 0%, transparent 70%);
      pointer-events: none; z-index: 0;
    }
    body::after {
      content: '';
      position: fixed; bottom: -200px; right: -200px;
      width: 700px; height: 700px;
      background: radial-gradient(circle, rgba(162,155,254,0.06) 0%, transparent 70%);
      pointer-events: none; z-index: 0;
    }

    .clay-card {
      background: var(--card-bg);
      border-radius: var(--radius-xl);
      border: 1.5px solid var(--card-edge);
      box-shadow: 0 8px 0 0 rgba(0,0,0,0.4), 0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
      position: relative; z-index: 1;
    }
    .clay-card-green { box-shadow: 0 8px 0 0 #0a4a38, 0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06); border-color: #0f6e52; }
    .clay-card-blue  { box-shadow: 0 8px 0 0 #0e4a6e, 0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06); border-color: #1a6fa0; }
    .clay-card-purp  { box-shadow: 0 8px 0 0 #3d3580, 0 16px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06); border-color: #5e56c4; }

    .clay-btn {
      border: none; cursor: pointer;
      font-family: var(--font-body); font-weight: 800;
      border-radius: var(--radius-md);
      transition: transform 0.1s, box-shadow 0.1s;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .clay-btn:active { transform: translateY(3px); }

    .clay-btn-primary {
      background: linear-gradient(135deg, #ff9f43, #ff6b6b);
      color: #fff;
      box-shadow: 0 6px 0 #b84a1a, 0 10px 20px rgba(255,107,107,0.3);
    }
    .clay-btn-primary:active { box-shadow: 0 2px 0 #b84a1a; }
    .clay-btn-primary:disabled {
      background: var(--navy3); color: var(--text-dim);
      box-shadow: 0 6px 0 rgba(0,0,0,0.3); cursor: not-allowed;
    }

    .clay-btn-voice {
      background: var(--navy3); color: var(--clay-o);
      border: 2px dashed var(--clay-o);
      box-shadow: 0 6px 0 rgba(0,0,0,0.35);
    }
    .clay-btn-voice.listening {
      background: rgba(255,107,107,0.1); color: var(--clay-r);
      border-color: var(--clay-r);
      animation: pulse-ring 1.5s ease-in-out infinite;
    }

    .clay-btn-ghost {
      background: transparent; color: var(--clay-o);
      border: 2.5px solid var(--clay-o);
      box-shadow: 0 6px 0 #7a4000;
    }
    .clay-btn-ghost:active { box-shadow: 0 2px 0 #7a4000; }

    .clay-btn-danger {
      background: transparent; color: var(--clay-r);
      border: 2px solid rgba(255,107,107,0.4);
      box-shadow: 0 4px 0 rgba(0,0,0,0.3);
    }

    .clay-btn-sm { padding: 8px 16px; font-size: 13px; border-radius: 10px; }

    .clay-input {
      width: 100%; background: var(--navy);
      border: 2px solid var(--card-edge); border-radius: var(--radius-md);
      color: var(--white); font-family: var(--font-body);
      font-size: 15px; font-weight: 600; padding: 13px 16px;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
    }
    .clay-input:focus {
      border-color: var(--clay-b);
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.3), 0 0 0 3px rgba(72,219,251,0.15);
    }
    .clay-input::placeholder { color: var(--text-dim); font-weight: 400; }

    .clay-label {
      display: block; font-size: 12px; font-weight: 800;
      letter-spacing: 0.8px; text-transform: uppercase;
      color: var(--text-dim); margin-bottom: 7px;
    }

    .skeleton {
      background: linear-gradient(90deg, var(--navy3) 25%, var(--navy2) 50%, var(--navy3) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 12px;
    }

    .story-para {
      font-family: var(--font-body); font-size: 18px;
      font-weight: 600; line-height: 1.9;
      color: var(--text-mid); margin-bottom: 24px;
    }

    .page-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--navy3); border: 1.5px solid var(--card-edge);
      border-radius: 50px; padding: 4px 14px;
      font-size: 12px; font-weight: 800;
      color: var(--text-dim); letter-spacing: 0.5px; margin-bottom: 12px;
    }

    .clay-divider {
      display: flex; align-items: center; gap: 12px;
      color: var(--text-dim); font-size: 11px; font-weight: 800;
      letter-spacing: 1px; text-transform: uppercase; margin: 20px 0;
    }
    .clay-divider::before, .clay-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--card-edge);
    }

    .transcript-box {
      background: rgba(255,159,67,0.08); border: 1.5px solid rgba(255,159,67,0.3);
      border-radius: var(--radius-md); padding: 12px 16px;
      font-size: 14px; font-weight: 600; color: var(--clay-o);
      font-style: italic; margin-bottom: 16px; line-height: 1.6;
    }

    .error-box {
      background: rgba(255,107,107,0.1); border: 1.5px solid rgba(255,107,107,0.4);
      border-radius: var(--radius-md); padding: 12px 16px;
      font-size: 13px; font-weight: 600; color: var(--clay-r); margin-bottom: 16px;
    }

    .done-accent {
      width: 60px; height: 5px;
      background: linear-gradient(90deg, var(--clay-o), var(--clay-r));
      border-radius: 10px; margin: 0 auto 20px;
    }

    .style-chip {
      flex: 1; padding: 12px 8px; border-radius: var(--radius-md);
      border: 2px solid var(--card-edge); background: var(--navy);
      cursor: pointer; text-align: center; font-family: var(--font-body);
      font-weight: 700; font-size: 13px; color: var(--text-dim);
      transition: all 0.15s; display: flex; flex-direction: column;
      align-items: center; gap: 4px;
    }
    .style-chip.active {
      border-color: var(--clay-b); background: rgba(72,219,251,0.08);
      color: var(--clay-b); box-shadow: 0 4px 0 rgba(14,74,110,0.5);
    }

    .age-chip {
      flex: 1; padding: 11px 8px; border-radius: var(--radius-md);
      border: 2px solid var(--card-edge); background: var(--navy);
      cursor: pointer; text-align: center; font-family: var(--font-body);
      font-weight: 700; font-size: 14px; color: var(--text-dim);
      transition: all 0.15s;
    }
    .age-chip.active {
      border-color: var(--clay-p); background: rgba(162,155,254,0.08);
      color: var(--clay-p); box-shadow: 0 4px 0 rgba(61,53,128,0.5);
    }

    .story-img-wrap {
      border-radius: var(--radius-xl); overflow: hidden; margin-bottom: 32px;
      box-shadow: 0 8px 0 rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.3);
      border: 2px solid var(--card-edge);
    }

    .history-card {
      background: var(--card-bg); border: 1.5px solid var(--card-edge);
      border-radius: var(--radius-lg); overflow: hidden; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 6px 0 rgba(0,0,0,0.35); position: relative;
    }
    .history-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 0 rgba(0,0,0,0.35), 0 20px 30px rgba(0,0,0,0.2);
    }
    .history-thumb { width: 100%; height: 140px; object-fit: cover; display: block; }
    .history-thumb-placeholder {
      width: 100%; height: 140px;
      background: linear-gradient(135deg, var(--navy3), var(--navy2));
      display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    .history-delete-btn {
      position: absolute; top: 8px; right: 8px;
      background: rgba(13,17,23,0.85); border: 1px solid rgba(255,107,107,0.4);
      border-radius: 8px; color: var(--clay-r);
      width: 28px; height: 28px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; backdrop-filter: blur(4px);
      opacity: 0; transition: opacity 0.15s;
    }
    .history-card:hover .history-delete-btn { opacity: 1; }

    .nav-tab {
      padding: 8px 20px; border-radius: 50px;
      font-family: var(--font-body); font-weight: 700;
      font-size: 14px; cursor: pointer; border: none; transition: all 0.15s;
    }
    .nav-tab.active {
      background: var(--card-bg); color: var(--white);
      box-shadow: 0 4px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .nav-tab.inactive { background: transparent; color: var(--text-dim); }
    .nav-tab.inactive:hover { color: var(--white); }

    .generating-dots span { animation: bounce-dot 1.2s ease-in-out infinite; display: inline-block; }
    .generating-dots span:nth-child(2) { animation-delay: 0.2s; }
    .generating-dots span:nth-child(3) { animation-delay: 0.4s; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--navy); }
    ::-webkit-scrollbar-thumb { background: var(--navy3); border-radius: 10px; }

    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes pulse-ring {
      0%, 100% { box-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 0 0 6px rgba(255,107,107,0.15); }
      50% { box-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 0 0 12px rgba(255,107,107,0.05); }
    }
    @keyframes bounce-dot { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
    @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }

    .fade-up { animation: fade-up 0.4s ease both; }
    .float   { animation: float 3s ease-in-out infinite; }
  `}</style>
)

/* ─────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────── */
const SkeletonPage = ({ index }) => (
  <div style={{ marginBottom: 32 }} className="fade-up">
    <div className="page-pill">
      <span>🎨</span> Illustrating page {index + 1}...
    </div>
    <div className="skeleton" style={{ height: 18, width: "85%", marginBottom: 8 }} />
    <div className="skeleton" style={{ height: 18, width: "68%", marginBottom: 16 }} />
    <div className="skeleton" style={{ height: 320, width: "100%", borderRadius: 28 }} />
  </div>
)

/* ─────────────────────────────────────────────
   HISTORY PANEL
───────────────────────────────────────────── */
const HistoryPanel = ({ onLoad }) => {
  const [history, setHistory] = useState(loadHistory)

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteFromHistory(id)
    setHistory(loadHistory())
  }

  const handleClearAll = () => {
    if (window.confirm("Clear all story history? This cannot be undone.")) {
      clearAllHistory()
      setHistory([])
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800 }}>
            Story Library
          </div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>
            {history.length} {history.length === 1 ? "story" : "stories"} saved on this device
          </div>
        </div>
        {history.length > 0 && (
          <button className="clay-btn clay-btn-danger clay-btn-sm" onClick={handleClearAll}>
            🗑 Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="clay-card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            No stories yet
          </div>
          <div style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 600 }}>
            Generate your first story and it will appear here
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {history.map(story => (
            <div key={story.id} className="history-card" onClick={() => onLoad(story)}>
              {story.thumbnail ? (
                <img src={story.thumbnail} alt="" className="history-thumb" />
              ) : (
                <div className="history-thumb-placeholder">📖</div>
              )}
              <button className="history-delete-btn" onClick={e => handleDelete(e, story.id)}>✕</button>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>
                  {story.brief?.child_name}'s Story
                </div>
                <div style={{
                  fontSize: 12, color: "var(--text-dim)", fontWeight: 600,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {story.brief?.story_topic}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(story.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--clay-g)", fontWeight: 700 }}>
                    {story.imageCount} 🖼
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  const [view, setView]                   = useState("form")
  const [brief, setBrief]                 = useState({
    child_name: "", story_topic: "", style: "watercolor",
    age_group: "6-8", characters: [], voice_transcript: "",
  })
  const [segments, setSegments]           = useState([])
  const [isGenerating, setIsGenerating]   = useState(false)
  const [isListening, setIsListening]     = useState(false)
  const [done, setDone]                   = useState(false)
  const [error, setError]                 = useState("")
  const [pageCount, setPageCount]         = useState(0)
  const [creativeNote, setCreativeNote]   = useState("")
  const [currentStoryId, setCurrentStoryId] = useState(null)

  const audioQueueRef  = useRef([])
  const isPlayingRef   = useRef(false)
  const recognitionRef = useRef(null)
  const storyEndRef    = useRef(null)

  // ── Restore story on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadCurrentStory()
    if (saved && saved.segments?.length > 0) {
      setBrief(saved.brief || brief)
      setSegments(saved.segments)
      setDone(saved.done || false)
      setPageCount(saved.pageCount || 0)
      setCreativeNote(saved.creativeNote || "")
      setCurrentStoryId(saved.id)
      setView("story")
    }
  }, [])

  // ── Auto-save whenever segments change ────────────────────────────────────
  useEffect(() => {
    if (segments.length === 0) return
    const storyData = {
      id:          currentStoryId || Date.now().toString(),
      brief,
      segments,
      done,
      pageCount,
      creativeNote,
      savedAt:     new Date().toISOString(),
      thumbnail:   segments.find(s => s.type === "image")?.url || null,
      imageCount:  segments.filter(s => s.type === "image").length,
    }
    saveCurrentStory(storyData)
    if (done) saveToHistory(storyData)
  }, [segments, done, creativeNote])

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [segments])

  // ── Audio ──────────────────────────────────────────────────────────────────
  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; return }
    isPlayingRef.current = true
    const url = audioQueueRef.current.shift()
    const audio = new Audio(url)
    audio.onended = playNextAudio
    audio.onerror = playNextAudio
    audio.play().catch(playNextAudio)
  }
  const queueAudio = (url) => {
    audioQueueRef.current.push(url)
    if (!isPlayingRef.current) playNextAudio()
  }

  // ── Voice ──────────────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Voice input requires Chrome."); return }
    const r = new SR()
    r.continuous = true; r.interimResults = false; r.lang = "en-US"
    r.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join(" ")
      setBrief(b => ({ ...b, voice_transcript: t, story_topic: t }))
      const m = t.match(/(?:about|for|starring)\s+([A-Z][a-z]+)/i)
      if (m) setBrief(b => ({ ...b, child_name: m[1] }))
    }
    r.onend = () => setIsListening(false)
    r.onerror = () => setIsListening(false)
    r.start(); recognitionRef.current = r; setIsListening(true)
  }
  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false) }

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!brief.child_name || !brief.story_topic) return
    const newId = Date.now().toString()
    setCurrentStoryId(newId)
    setSegments([]); setIsGenerating(true); setDone(false)
    setError(""); setPageCount(0); setCreativeNote("")
    audioQueueRef.current = []; isPlayingRef.current = false
    clearCurrentStory()
    setView("story")

    try {
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      })
      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ""

      while (true) {
        const { done: sd, value } = await reader.read()
        if (sd) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n"); buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const ev = JSON.parse(line.slice(6))

            if (ev.type === "text") {
              setSegments(s => {
                const last = s[s.length - 1]
                if (last?.type === "text") return [...s.slice(0, -1), { ...last, content: last.content + ev.delta }]
                return [...s, { type: "text", content: ev.delta, id: Date.now() }]
              })
            } else if (ev.type === "creative_note") {
              setCreativeNote(ev.message)
            } else if (ev.type === "image_loading") {
              setSegments(s => [...s, { type: "image_loading", index: ev.index, id: Date.now() + Math.random() }])
            } else if (ev.type === "image") {
              setSegments(s => s.map(seg =>
                seg.type === "image_loading" && seg.index === ev.index
                  ? { type: "image", url: ev.url, index: ev.index, id: seg.id }
                  : seg
              ))
              setPageCount(p => p + 1)
            } else if (ev.type === "audio") {
              queueAudio(ev.url)
            } else if (ev.type === "done") {
              setDone(true); setIsGenerating(false)
            } else if (ev.type === "error") {
              setError(ev.message); setIsGenerating(false)
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message); setIsGenerating(false)
    }
  }

  // ── Load from history ──────────────────────────────────────────────────────
  const loadStoryFromHistory = (story) => {
    setBrief(story.brief)
    setSegments(story.segments)
    setDone(story.done)
    setPageCount(story.pageCount)
    setCreativeNote(story.creativeNote || "")
    setCurrentStoryId(story.id)
    saveCurrentStory(story)
    setView("story")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── New story ──────────────────────────────────────────────────────────────
  const newStory = () => {
    setSegments([]); setDone(false); setError("")
    setPageCount(0); setCurrentStoryId(null)
    setCreativeNote(""); clearCurrentStory()
    setBrief({ child_name: "", story_topic: "", style: "watercolor", age_group: "6-8", characters: [], voice_transcript: "" })
    setView("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Page numbering ─────────────────────────────────────────────────────────
  let pageIndex = 0
  const segmentsWithPageNums = segments.map(seg => {
    if (seg.type === "image" || seg.type === "image_loading") {
      pageIndex++; return { ...seg, pageNum: pageIndex }
    }
    return seg
  })

  const historyCount    = loadHistory().length
  const styleOptions    = [
    { value: "watercolor", label: "Watercolor", icon: "🎨" },
    { value: "cartoon",    label: "Cartoon",    icon: "✏️" },
    { value: "sketch",     label: "Sketch",     icon: "🖊️" },
  ]

  return (
    <>
      <GlobalStyles />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(13,17,23,0.88)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "0 24px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/GoogleStories.png" alt="Google Stories"
            style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>
              Google Stories
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>
              Gemini + Imagen 3
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 4, background: "var(--navy2)",
          borderRadius: 50, padding: 4, border: "1px solid var(--card-edge)"
        }}>
          <button
            className={`nav-tab ${view !== "history" ? "active" : "inactive"}`}
            onClick={() => view === "history" ? setView(segments.length > 0 ? "story" : "form") : null}
          >
            ✨ Create
          </button>
          <button
            className={`nav-tab ${view === "history" ? "active" : "inactive"}`}
            onClick={() => setView("history")}
            style={{ position: "relative" }}
          >
            📚 Library
            {historyCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "var(--clay-o)", color: "#000",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{historyCount > 9 ? "9+" : historyCount}</span>
            )}
          </button>
        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(255,159,67,0.15), rgba(255,107,107,0.15))",
          border: "1.5px solid rgba(255,159,67,0.3)", borderRadius: 50,
          padding: "5px 12px", fontSize: 11, fontWeight: 800,
          color: "var(--clay-o)", letterSpacing: "0.4px",
        }}>
          Gemini Live Agent Challenge
        </div>
      </header>

      {/* ── HISTORY VIEW ───────────────────────────────────────────────────── */}
      {view === "history" && (
        <HistoryPanel onLoad={loadStoryFromHistory} />
      )}

      {/* ── FORM VIEW ──────────────────────────────────────────────────────── */}
      {view === "form" && (
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }} className="fade-up">
            <div className="float" style={{ marginBottom: 20 }}>
              <img src="/GoogleStories.png" alt="" style={{
                width: 96, height: 96, borderRadius: 28, objectFit: "cover",
                boxShadow: "0 12px 0 rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.3)",
              }} />
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800,
              lineHeight: 1.15, marginBottom: 14,
              background: "linear-gradient(135deg, #fff 30%, var(--clay-o) 70%, var(--clay-r))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Every child deserves<br />their own story
            </h1>
            <p style={{ fontSize: 15, color: "var(--text-dim)", lineHeight: 1.7, fontWeight: 600 }}>
              Speak or type a brief — get a fully illustrated,<br />
              narrated storybook in under 2 minutes.
            </p>
          </div>

          <div className="clay-card" style={{ padding: 32 }}>
            <button
              className={`clay-btn clay-btn-voice${isListening ? " listening" : ""}`}
              onClick={isListening ? stopVoice : startVoice}
              style={{ width: "100%", padding: "15px 24px", fontSize: 15, marginBottom: 16 }}
            >
              <span style={{ fontSize: 20 }}>{isListening ? "⏹" : "🎤"}</span>
              {isListening ? "Stop listening..." : "Speak your story brief"}
              {isListening && (
                <span style={{ fontSize: 11, color: "var(--clay-r)", fontWeight: 700 }}>● LIVE</span>
              )}
            </button>

            {brief.voice_transcript && (
              <div className="transcript-box">"{brief.voice_transcript}"</div>
            )}

            <div className="clay-divider">or type below</div>

            <div style={{ marginBottom: 18 }}>
              <label className="clay-label">Child's name</label>
              <input
                className="clay-input"
                value={brief.child_name}
                onChange={e => setBrief(b => ({ ...b, child_name: e.target.value }))}
                placeholder="e.g. Priya"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="clay-label">Story topic & lesson</label>
              <input
                className="clay-input"
                value={brief.story_topic}
                onChange={e => setBrief(b => ({ ...b, story_topic: e.target.value }))}
                placeholder="e.g. Priya and Bruno in Hyderabad, learning to ask for help"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="clay-label">Illustration style</label>
              <div style={{ display: "flex", gap: 10 }}>
                {styleOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`style-chip${brief.style === opt.value ? " active" : ""}`}
                    onClick={() => setBrief(b => ({ ...b, style: opt.value }))}
                  >
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label className="clay-label">Child's age</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["3-5", "6-8", "9-12"].map(age => (
                  <button
                    key={age}
                    className={`age-chip${brief.age_group === age ? " active" : ""}`}
                    onClick={() => setBrief(b => ({ ...b, age_group: age }))}
                  >
                    {age} yrs
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button
              className="clay-btn clay-btn-primary"
              onClick={generate}
              disabled={!brief.child_name || !brief.story_topic}
              style={{ width: "100%", padding: "17px 24px", fontSize: 17 }}
            >
              <span style={{ fontSize: 20 }}>✨</span>
              Generate {brief.child_name ? `${brief.child_name}'s` : "the"} storybook
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
            {[
              { icon: "🎨", label: "Imagen 3",     sub: "illustrations" },
              { icon: "🔊", label: "AI narration", sub: "auto-plays" },
              { icon: "💾", label: "Auto-saved",   sub: "on this device" },
            ].map(f => (
              <div key={f.label} className="clay-card" style={{ padding: "14px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ── GENERATING SPLASH ───────────────────────────────────────────────── */}
      {view === "story" && isGenerating && segments.length === 0 && (
        <div style={{ maxWidth: 400, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
          <div className="float" style={{ marginBottom: 24 }}>
            <img src="/GoogleStories.png" alt="" style={{
              width: 80, height: 80, borderRadius: 24, objectFit: "cover"
            }} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
            Writing {brief.child_name}'s story...
          </div>
          <div style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 600, marginBottom: 24 }}>
            Gemini is crafting the narrative,<br />Imagen 3 is painting each scene
          </div>
          <div className="generating-dots" style={{ fontSize: 28, letterSpacing: 6, color: "var(--clay-o)" }}>
            <span>●</span><span>●</span><span>●</span>
          </div>
        </div>
      )}

      {/* ── STORY VIEW ─────────────────────────────────────────────────────── */}
      {view === "story" && segments.length > 0 && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>

          {/* Story header */}
          <div style={{
            textAlign: "center", marginBottom: 40, paddingBottom: 32,
            borderBottom: "1px solid var(--card-edge)"
          }}>
            <img src="/GoogleStories.png" alt="" style={{
              width: 52, height: 52, borderRadius: 14, objectFit: "cover", marginBottom: 14
            }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
              {brief.child_name}'s Story
            </div>
            <div style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 600 }}>
              {brief.story_topic}
            </div>

            {/* Creative Director note — judges look for this */}
            {creativeNote && (
              <div style={{
                marginTop: 14, padding: "10px 20px",
                background: "rgba(162,155,254,0.1)",
                border: "1.5px solid rgba(162,155,254,0.25)",
                borderRadius: 14, fontSize: 13,
                color: "var(--clay-p)", fontWeight: 600,
                fontStyle: "italic", maxWidth: 520,
                margin: "14px auto 0", lineHeight: 1.6,
              }}>
                🎨 {creativeNote}
              </div>
            )}

            {/* Saved badge */}
            {!isGenerating && done && (
              <div style={{
                marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(29,209,161,0.1)", border: "1.5px solid rgba(29,209,161,0.25)",
                borderRadius: 50, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "var(--clay-g)"
              }}>
                💾 Saved to your library
              </div>
            )}

            {/* Generating badge */}
            {isGenerating && (
              <div style={{
                marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(72,219,251,0.1)", border: "1.5px solid rgba(72,219,251,0.25)",
                borderRadius: 50, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "var(--clay-b)"
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", background: "var(--clay-b)",
                  display: "inline-block", animation: "pulse-ring 1s ease-in-out infinite"
                }} />
                Generating page {pageCount + 1} of 6...
              </div>
            )}
          </div>

          {/* Segments */}
          {segmentsWithPageNums.map((seg, i) => (
            <div key={seg.id || i} className="fade-up">
              {seg.type === "text" && (
                <p className="story-para">{seg.content}</p>
              )}
              {seg.type === "image_loading" && (
                <SkeletonPage index={seg.index} />
              )}
              {seg.type === "image" && (
                <div style={{ marginBottom: 40 }}>
                  <div className="page-pill"><span>🖼️</span> Page {seg.pageNum}</div>
                  <div className="story-img-wrap">
                    <img
                      src={seg.url}
                      alt={`Story illustration page ${seg.pageNum}`}
                      style={{ width: "100%", display: "block" }}
                      onError={e => { e.target.parentElement.style.display = "none" }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isGenerating && segments.length > 0 && (
            <div className="generating-dots" style={{
              textAlign: "center", padding: "16px 0",
              fontSize: 20, letterSpacing: 6, color: "var(--text-dim)"
            }}>
              <span>●</span><span>●</span><span>●</span>
            </div>
          )}

          {/* Done card */}
          {done && (
            <div className="clay-card clay-card-green fade-up" style={{ padding: 40, textAlign: "center", marginTop: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <div className="done-accent" />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                {brief.child_name}'s story is complete!
              </div>
              <div style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 600, marginBottom: 8 }}>
                Narration playing automatically · {pageCount} illustrations
              </div>
              <div style={{ fontSize: 13, color: "var(--clay-g)", fontWeight: 700, marginBottom: 28 }}>
                💾 Saved — close the browser and it'll still be here
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="clay-btn clay-btn-ghost"
                  onClick={newStory}
                  style={{ padding: "13px 24px", fontSize: 15 }}
                >
                  ✨ New story
                </button>
                <button
                  className="clay-btn clay-btn-sm"
                  style={{
                    background: "var(--navy3)", color: "var(--clay-b)",
                    border: "2px solid rgba(72,219,251,0.3)",
                    padding: "13px 24px", fontSize: 15
                  }}
                  onClick={() => setView("history")}
                >
                  📚 View library
                </button>
              </div>
            </div>
          )}

          <div ref={storyEndRef} />
        </div>
      )}
    </>
  )
}