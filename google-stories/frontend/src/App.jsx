import { useState, useRef, useEffect } from "react"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"

const styles = {
  page: {
    minHeight: "100vh",
    background: "#faf6f1",
    fontFamily: "'DM Sans', sans-serif",
    color: "#1a1208",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #ede4d8",
    padding: "0 40px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLogo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    background: "linear-gradient(135deg, #f4a261, #e76f51)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "700",
    fontFamily: "'Lora', serif",
    color: "#1a1208",
    letterSpacing: "-0.3px",
  },
  logoSub: {
    fontSize: "12px",
    color: "#9b8470",
    fontWeight: "400",
  },
  badge: {
    background: "#fef3e8",
    color: "#c2651a",
    fontSize: "11px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid #fad9b5",
    letterSpacing: "0.3px",
  },
  main: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "48px 24px",
  },
  heroText: {
    textAlign: "center",
    marginBottom: "40px",
  },
  heroTitle: {
    fontFamily: "'Lora', serif",
    fontSize: "38px",
    fontWeight: "700",
    lineHeight: "1.25",
    color: "#1a1208",
    marginBottom: "12px",
    letterSpacing: "-0.5px",
  },
  heroSub: {
    fontSize: "16px",
    color: "#7a6858",
    lineHeight: "1.6",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "36px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
    marginBottom: "24px",
  },
  voiceBtn: (listening) => ({
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: listening ? "2px solid #e74c3c" : "2px dashed #f4a261",
    background: listening ? "#fff5f5" : "#fffaf5",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: listening ? "#c0392b" : "#c2651a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s",
    marginBottom: "20px",
  }),
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    color: "#c4b5a8",
    fontSize: "12px",
    fontWeight: "500",
    letterSpacing: "0.5px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#ede4d8",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#5a4535",
    marginBottom: "6px",
    letterSpacing: "0.2px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1.5px solid #e8ddd0",
    fontSize: "15px",
    background: "#fdf9f6",
    color: "#1a1208",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1.5px solid #e8ddd0",
    fontSize: "15px",
    background: "#fdf9f6",
    color: "#1a1208",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
  generateBtn: (disabled) => ({
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled
      ? "#e8ddd0"
      : "linear-gradient(135deg, #f4a261 0%, #e76f51 100%)",
    color: disabled ? "#b0a090" : "#fff",
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "0.2px",
    transition: "all 0.2s",
    marginTop: "8px",
    fontFamily: "'DM Sans', sans-serif",
  }),
  transcriptBox: {
    background: "#fdf3e7",
    border: "1px solid #fad9b5",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#7a5c3a",
    fontStyle: "italic",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
  storyPage: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  storyHeader: {
    textAlign: "center",
    marginBottom: "40px",
    paddingBottom: "32px",
    borderBottom: "1px solid #ede4d8",
  },
  storyTitle: {
    fontFamily: "'Lora', serif",
    fontSize: "32px",
    fontWeight: "700",
    color: "#1a1208",
    marginBottom: "8px",
  },
  storySubtitle: {
    fontSize: "14px",
    color: "#9b8470",
  },
  paragraph: {
    fontFamily: "'Lora', serif",
    fontSize: "19px",
    lineHeight: "1.85",
    color: "#2d1f12",
    margin: "0 0 28px 0",
    letterSpacing: "0.1px",
  },
  imageWrapper: {
    borderRadius: "20px",
    overflow: "hidden",
    margin: "8px 0 32px 0",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
  },
  imagePlaceholder: {
    background: "#f5ede0",
    height: "280px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  storyImage: {
    width: "100%",
    display: "block",
  },
  generatingDot: {
    textAlign: "center",
    padding: "20px",
    color: "#c4b5a8",
    fontSize: "14px",
    letterSpacing: "2px",
  },
  doneCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
    marginTop: "32px",
  },
  newStoryBtn: {
    padding: "13px 32px",
    borderRadius: "50px",
    border: "2px solid #f4a261",
    background: "transparent",
    color: "#c2651a",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "16px",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s",
  },
}

export default function App() {
  const [brief, setBrief] = useState({
    child_name: "",
    story_topic: "",
    style: "watercolor",
    age_group: "6-8",
    characters: [],
    voice_transcript: "",
  })
  const [segments, setSegments] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const recognitionRef = useRef(null)
  const storyEndRef = useRef(null)

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [segments])

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      return
    }
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

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert("Voice input requires Chrome. Please use Chrome browser.")
      return
    }
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
      setBrief((b) => ({ ...b, voice_transcript: transcript, story_topic: transcript }))
      const nameMatch = transcript.match(/(?:about|for|starring)\s+([A-Z][a-z]+)/i)
      if (nameMatch) setBrief((b) => ({ ...b, child_name: nameMatch[1] }))
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const generate = async () => {
    if (!brief.child_name || !brief.story_topic) return
    setSegments([])
    setIsGenerating(true)
    setDone(false)
    setError("")
    audioQueueRef.current = []
    isPlayingRef.current = false

    try {
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === "text") {
              setSegments((s) => {
                const last = s[s.length - 1]
                if (last?.type === "text") {
                  return [
                    ...s.slice(0, -1),
                    { ...last, content: last.content + event.delta },
                  ]
                }
                return [...s, { type: "text", content: event.delta, id: Date.now() }]
              })
            } else if (event.type === "image_loading") {
              setSegments((s) => [
                ...s,
                { type: "image_loading", index: event.index, id: Date.now() + Math.random() },
              ])
            } else if (event.type === "image") {
              setSegments((s) =>
                s.map((seg) =>
                  seg.type === "image_loading" && seg.index === event.index
                    ? { type: "image", url: event.url, index: event.index, id: seg.id }
                    : seg
                )
              )
            } else if (event.type === "audio") {
              queueAudio(event.url)
            } else if (event.type === "done") {
              setDone(true)
              setIsGenerating(false)
            } else if (event.type === "error") {
              setError(event.message)
              setIsGenerating(false)
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  const reset = () => {
    setSegments([])
    setDone(false)
    setError("")
    setBrief({
      child_name: "",
      story_topic: "",
      style: "watercolor",
      age_group: "6-8",
      characters: [],
      voice_transcript: "",
    })
  }

  const showForm = !isGenerating && segments.length === 0

  return (
    <div style={styles.page}>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLogo}>
          <div style={styles.logoIcon}>📖</div>
          <div>
            <div style={styles.logoText}>Google Stories</div>
            <div style={styles.logoSub}>Powered by Gemini</div>
          </div>
        </div>
        <div style={styles.badge}>Gemini Live Agent Challenge</div>
      </header>

      {/* Form */}
      {showForm && (
        <main style={styles.main}>
          <div style={styles.heroText}>
            <h1 style={styles.heroTitle}>
              Every child deserves<br />
              <em>their own story</em>
            </h1>
            <p style={styles.heroSub}>
              Speak or type a brief — get a fully illustrated,<br />
              narrated storybook in under 2 minutes.
            </p>
          </div>

          <div style={styles.card}>

            {/* Voice button */}
            <button
              style={styles.voiceBtn(isListening)}
              onClick={isListening ? stopVoice : startVoice}
            >
              {isListening ? (
                <><span style={{ fontSize: "16px" }}>⏹</span> Stop listening</>
              ) : (
                <><span style={{ fontSize: "16px" }}>🎤</span> Speak your story brief</>
              )}
            </button>

            {brief.voice_transcript && (
              <div style={styles.transcriptBox}>
                "{brief.voice_transcript}"
              </div>
            )}

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              OR FILL IN BELOW
              <div style={styles.dividerLine} />
            </div>

            {/* Child name */}
            <div style={{ marginBottom: "16px" }}>
              <label style={styles.label}>Child's name</label>
              <input
                style={styles.input}
                value={brief.child_name}
                onChange={(e) => setBrief((b) => ({ ...b, child_name: e.target.value }))}
                placeholder="e.g. Priya"
              />
            </div>

            {/* Story topic */}
            <div style={{ marginBottom: "16px" }}>
              <label style={styles.label}>Story topic and lesson</label>
              <input
                style={styles.input}
                value={brief.story_topic}
                onChange={(e) => setBrief((b) => ({ ...b, story_topic: e.target.value }))}
                placeholder="e.g. Priya and her dog Bruno in Hyderabad, learning to ask for help"
              />
            </div>

            {/* Style + Age */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={styles.label}>Illustration style</label>
                <select
                  style={styles.select}
                  value={brief.style}
                  onChange={(e) => setBrief((b) => ({ ...b, style: e.target.value }))}
                >
                  <option value="watercolor">Watercolor</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="sketch">Pencil sketch</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Child's age</label>
                <select
                  style={styles.select}
                  value={brief.age_group}
                  onChange={(e) => setBrief((b) => ({ ...b, age_group: e.target.value }))}
                >
                  <option value="3-5">3 – 5 years</option>
                  <option value="6-8">6 – 8 years</option>
                  <option value="9-12">9 – 12 years</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ background: "#fff5f5", border: "1px solid #fcc", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#c0392b", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <button
              style={styles.generateBtn(!brief.child_name || !brief.story_topic)}
              onClick={generate}
              disabled={!brief.child_name || !brief.story_topic}
            >
              ✨ Generate storybook
            </button>
          </div>
        </main>
      )}

      {/* Generating splash */}
      {isGenerating && segments.length === 0 && (
        <div style={{ ...styles.main, textAlign: "center", paddingTop: "80px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>✨</div>
          <div style={{ fontFamily: "'Lora', serif", fontSize: "24px", color: "#1a1208", marginBottom: "8px" }}>
            Writing {brief.child_name}'s story...
          </div>
          <div style={{ fontSize: "14px", color: "#9b8470" }}>
            Gemini is crafting illustrations and narration
          </div>
        </div>
      )}

      {/* Story stream */}
      {segments.length > 0 && (
        <div style={styles.storyPage}>
          <div style={styles.storyHeader}>
            <div style={styles.storyTitle}>
              {brief.child_name}'s Story
            </div>
            <div style={styles.storySubtitle}>
              {brief.story_topic}
            </div>
          </div>

          {segments.map((seg, i) => (
            <div key={seg.id || i}>

              {seg.type === "text" && (
                <p style={styles.paragraph}>{seg.content}</p>
              )}

              {seg.type === "image_loading" && (
                <div style={{ ...styles.imageWrapper, ...styles.imagePlaceholder }}>
                  <div style={{ textAlign: "center", color: "#c0a882" }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎨</div>
                    <div style={{ fontSize: "13px" }}>Illustrating this scene...</div>
                  </div>
                </div>
              )}

              {/* ✅ THE FIX: render image when URL arrives */}
              {seg.type === "image" && (
                <div style={styles.imageWrapper}>
                  <img
                    src={seg.url}
                    alt={`Story illustration ${seg.index + 1}`}
                    style={styles.storyImage}
                    onError={(e) => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
              )}

            </div>
          ))}

          {isGenerating && (
            <div style={styles.generatingDot}>· · ·</div>
          )}

          {done && (
            <div style={styles.doneCard}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: "22px", fontWeight: "700", color: "#1a1208", marginBottom: "8px" }}>
                {brief.child_name}'s story is ready!
              </div>
              <div style={{ fontSize: "14px", color: "#9b8470", marginBottom: "20px" }}>
                The narration is playing automatically
              </div>
              <button style={styles.newStoryBtn} onClick={reset}>
                Create another story
              </button>
            </div>
          )}

          <div ref={storyEndRef} />
        </div>
      )}
    </div>
  )
}