import { useState, useRef, useEffect } from 'react'
import StoryBook from './StoryBook'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
const STORAGE_KEY_CURRENT = 'gs_current_story'
const STORAGE_KEY_HISTORY = 'gs_story_history'
const MAX_HISTORY = 20
/* ─── STORAGE HELPERS ─── */
const saveCurrentStory = (d) => { try { localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(d)) } catch { } }
const loadCurrentStory = () => { try { const d = localStorage.getItem(STORAGE_KEY_CURRENT); return d ? JSON.parse(d) : null } catch { return null } }
const clearCurrentStory = () => { try { localStorage.removeItem(STORAGE_KEY_CURRENT) } catch { } }
const loadHistory = () => { try { const d = localStorage.getItem(STORAGE_KEY_HISTORY); return d ? JSON.parse(d) : [] } catch { return [] } }
const saveToHistory = (s) => {
  try {
    const h = loadHistory(); const i = h.findIndex(x => x.id === s.id)
    if (i >= 0) h[i] = s; else h.unshift(s)
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(h.slice(0, MAX_HISTORY)))
  } catch { }
}
const deleteFromHistory = (id) => { try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(loadHistory().filter(h => h.id !== id))) } catch { } }
const clearAllHistory = () => { try { localStorage.removeItem(STORAGE_KEY_HISTORY); localStorage.removeItem(STORAGE_KEY_CURRENT) } catch { } }

/* ─── PIXEL SPRITE ─── */
const Px = ({ grid, size = 5 }) => (
  <svg viewBox={`0 0 ${grid[0].length * size} ${grid.length * size}`}
    width={grid[0].length * size} height={grid.length * size}
    style={{ imageRendering: 'pixelated', display: 'block' }}>
    {grid.map((row, y) => row.map((c, x) =>
      c ? <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={c} /> : null
    ))}
  </svg>
)
const P = null
const STAR = [[P, P, P, '#FCD34D', P, P, P, P], [P, '#FCD34D', P, '#FCD34D', P, '#FCD34D', P, P], [P, P, '#FDE68A', '#FCD34D', '#FDE68A', P, P, P], ['#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', P], [P, P, '#FDE68A', '#FCD34D', '#FDE68A', P, P, P], [P, '#FCD34D', P, '#FCD34D', P, '#FCD34D', P, P], [P, P, P, '#FCD34D', P, P, P, P], [P, P, P, P, P, P, P, P]]
const CAT = [[P, '#FB923C', '#FB923C', P, P, '#FB923C', '#FB923C', P], ['#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C'], ['#FB923C', P, '#065F46', P, '#065F46', P, '#FB923C', P], ['#FB923C', '#FB923C', '#FDE68A', '#FB923C', '#FDE68A', '#FB923C', '#FB923C', P], [P, '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', P, P], ['#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', P], ['#FB923C', '#FB923C', P, P, P, '#FB923C', '#FB923C', P], ['#FDBA74', '#FDBA74', P, P, P, '#FDBA74', '#FDBA74', P]]
const DRAG = [[P, P, '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P], [P, '#C4B5FD', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', '#C4B5FD', P], [P, '#A78BFA', '#A78BFA', '#FCD34D', '#A78BFA', '#A78BFA', '#A78BFA', P], ['#DDD6FE', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P], [P, '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P, P], [P, P, '#A78BFA', '#A78BFA', '#A78BFA', P, P, P], [P, P, P, '#A78BFA', '#A78BFA', P, P, P], [P, P, P, P, '#C4B5FD', P, P, P]]

/* ─── GLOBAL STYLES ─── */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Jersey+10&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    :root {
      --bg:        #F9F7FF;
      --bg2:       #F3F0FF;
      --lavender:  #EDE9FE;
      --lav-b:     #C4B5FD;
      --mint:      #D1FAE5;
      --mint-b:    #6EE7B7;
      --rose:      #FFE4E6;
      --rose-b:    #FECDD3;
      --sky:       #DBEAFE;
      --sky-b:     #BFDBFE;
      --peach:     #FEF3C7;
      --peach-b:   #FDE68A;
      --purple:    #6D28D9;
      --purple-d:  #4C1D95;
      --purple-dk: #3B0764;
      --emerald:   #047857;
      --coral:     #DC2626;
      --white:     #FFFFFF;
      --text:      #374151;
      --text-mid:  #6B7280;
      --text-soft: #9CA3AF;
      --border:    rgba(109,40,217,.13);
      --font-d: 'Jersey 10', monospace;
      --font-b: 'DM Sans', sans-serif;
      --r-xl: 28px; --r-lg: 20px; --r-md: 14px;
    }
    html { scroll-behavior:smooth; }
    body { background:var(--bg); font-family:var(--font-b); color:var(--text); min-height:100vh; overflow-x:hidden; }
    #root { width:100%; min-height:100vh; }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-track { background:var(--bg); }
    ::-webkit-scrollbar-thumb { background:var(--lav-b); border-radius:8px; }

    @keyframes floatY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes floatX  { 0%,100%{transform:translateX(0) rotate(-8deg)} 50%{transform:translateX(8px) rotate(2deg)} }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
    @keyframes pulseR  { 0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.12)} 50%{box-shadow:0 0 0 10px rgba(220,38,38,.04)} }
    @keyframes bounce  { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
    .float1 { animation:floatY 3.4s ease-in-out infinite; }
    .float2 { animation:floatX 4.1s ease-in-out infinite; }
    .float3 { animation:floatY 2.8s ease-in-out infinite .8s; }
    .float4 { animation:floatX 5s ease-in-out infinite .3s; }
    .fade-up { animation:fadeUp .45s ease both; }
    .dot-b span { animation:bounce 1.2s ease-in-out infinite; display:inline-block; }
    .dot-b span:nth-child(2) { animation-delay:.18s; }
    .dot-b span:nth-child(3) { animation-delay:.36s; }

    .bento { display:grid; gap:14px; }
    .bcard {
      background:var(--white); border:1.5px solid var(--border);
      border-radius:var(--r-xl); padding:22px 24px; position:relative; overflow:hidden;
      box-shadow:0 2px 0 rgba(109,40,217,.07), 0 8px 24px rgba(109,40,217,.05);
      transition:transform .15s, box-shadow .15s;
    }
    .bcard:hover { transform:translateY(-2px); box-shadow:0 4px 0 rgba(109,40,217,.1), 0 14px 32px rgba(109,40,217,.08); }
    .bcard-lav  { background:var(--lavender); border-color:var(--lav-b); }
    .bcard-mint { background:var(--mint);     border-color:var(--mint-b); }
    .bcard-rose { background:var(--rose);     border-color:var(--rose-b); }
    .bcard-sky  { background:var(--sky);      border-color:var(--sky-b); }
    .bcard-peach{ background:var(--peach);    border-color:var(--peach-b); }

    .inp {
      width:100%; background:var(--white);
      border:1.5px solid var(--border); border-radius:var(--r-md);
      color:var(--text); font-family:var(--font-b);
      font-size:15px; font-weight:500; padding:12px 15px;
      outline:none; transition:border-color .2s, box-shadow .2s;
    }
    .inp:focus { border-color:var(--lav-b); box-shadow:0 0 0 3px rgba(196,181,253,.25); }
    .inp::placeholder { color:var(--text-soft); font-weight:400; }
    .lbl { display:block; font-family:var(--font-d); font-size:14px; letter-spacing:1px; color:var(--text-mid); margin-bottom:7px; }

    .chip {
      flex:1; padding:11px 8px; border-radius:var(--r-md);
      border:1.5px solid var(--border); background:var(--white);
      cursor:pointer; text-align:center; font-family:var(--font-b);
      font-weight:600; font-size:13px; color:var(--text-mid);
      transition:all .15s; display:flex; flex-direction:column; align-items:center; gap:3px;
    }
    .chip.on { border-color:var(--purple); background:var(--lavender); color:var(--purple); box-shadow:0 3px 0 var(--lav-b); }

    .btn-gen {
      width:100%; border:none; cursor:pointer;
      font-family:var(--font-d); font-size:22px; letter-spacing:'1.5px';
      background:linear-gradient(135deg,#7C3AED,#4C1D95);
      color:var(--lavender); border-radius:var(--r-xl);
      padding:17px 24px;
      box-shadow:0 7px 0 var(--purple-dk), 0 14px 30px rgba(109,40,217,.3);
      transition:transform .1s, box-shadow .1s; display:flex; align-items:center; justify-content:center; gap:10px;
    }
    .btn-gen:hover:not(:disabled) { filter:brightness(1.06); }
    .btn-gen:active:not(:disabled) { transform:translateY(5px); box-shadow:0 2px 0 var(--purple-dk); }
    .btn-gen:disabled { background:#E5E7EB; color:#9CA3AF; box-shadow:0 5px 0 #D1D5DB; cursor:not-allowed; }

    .btn-voice {
      width:100%; border:2px dashed var(--lav-b); background:var(--lavender);
      color:var(--purple); cursor:pointer; border-radius:var(--r-lg);
      font-family:var(--font-b); font-weight:600; font-size:15px;
      padding:14px 20px; display:flex; align-items:center; justify-content:center; gap:8px;
      transition:all .15s;
    }
    .btn-voice.on { border-color:#DC2626; background:#FFF1F2; color:#DC2626; animation:pulseR 1.5s ease-in-out infinite; }

    .tab {
      padding:8px 20px; border-radius:50px; font-family:var(--font-b);
      font-weight:600; font-size:14px; cursor:pointer; border:none; transition:all .15s;
    }
    .tab-on  { background:var(--white); color:var(--purple); box-shadow:0 2px 8px rgba(109,40,217,.14); }
    .tab-off { background:transparent; color:var(--text-soft); }
    .tab-off:hover { color:var(--text); }

    .hist-card {
      background:var(--white); border:1.5px solid var(--border);
      border-radius:var(--r-lg); overflow:hidden; cursor:pointer;
      transition:transform .15s, box-shadow .15s;
      box-shadow:0 4px 0 rgba(109,40,217,.07);
    }
    .hist-card:hover { transform:translateY(-3px); box-shadow:0 8px 0 rgba(109,40,217,.09), 0 18px 28px rgba(109,40,217,.07); }
    .del-btn {
      position:absolute; top:8px; right:8px;
      background:rgba(255,255,255,.9); border:1px solid var(--rose-b);
      border-radius:8px; color:var(--coral);
      width:26px; height:26px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:12px; opacity:0; transition:opacity .15s;
    }
    .hist-card:hover .del-btn { opacity:1; }
    .transcript {
      background:var(--lavender); border:1.5px solid var(--lav-b);
      border-radius:var(--r-md); padding:11px 14px;
      font-size:14px; font-weight:500; color:var(--purple); font-style:italic; margin-bottom:14px; line-height:1.6;
    }
    .err { background:var(--rose); border:1.5px solid var(--rose-b); border-radius:var(--r-md); padding:11px 14px; font-size:13px; font-weight:500; color:var(--coral); margin-bottom:14px; }
    .pill {
      display:inline-flex; align-items:center; gap:6px;
      background:var(--lavender); border:1.5px solid var(--lav-b);
      border-radius:50px; padding:4px 14px; font-family:var(--font-d);
      font-size:13px; color:var(--purple); letter-spacing:.8px;
    }
    .divider { display:flex; align-items:center; gap:10px; color:var(--text-soft); font-size:12px; font-family:var(--font-d); letter-spacing:1px; margin:16px 0; }
    .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--border); }
  `}</style>
)

/* ─── HISTORY PANEL ─── */
const HistoryPanel = ({ onLoad }) => {
  const [history, setHistory] = useState(loadHistory)
  const handleDelete = (e, id) => { e.stopPropagation(); deleteFromHistory(id); setHistory(loadHistory()) }
  const handleClear = () => { if (window.confirm('Clear all stories?')) { clearAllHistory(); setHistory([]) } }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, color: 'var(--purple)', letterSpacing: '1.5px' }}>
            Story Library
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text-soft)', fontWeight: 500, marginTop: 3 }}>
            {history.length} {history.length === 1 ? 'story' : 'stories'} on this device
          </div>
        </div>
        {history.length > 0 && (
          <button onClick={handleClear}
            style={{
              fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, padding: '8px 16px',
              background: 'var(--rose)', color: 'var(--coral)', border: '1.5px solid var(--rose-b)',
              borderRadius: 10, cursor: 'pointer'
            }}>
            🗑 Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bcard" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}><Px grid={[[P, '#A78BFA', '#A78BFA', P], [P, '#7C3AED', '#7C3AED', P], [P, '#6D28D9', '#6D28D9', P], [P, '#4C1D95', '#4C1D95', P]]} size={12} /></div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 22, color: 'var(--purple)', letterSpacing: '1px', marginBottom: 8 }}>No stories yet</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text-soft)' }}>Generate your first story and it will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(196px,1fr))', gap: 14 }}>
          {history.map(story => (
            <div key={story.id} className="hist-card" style={{ position: 'relative' }} onClick={() => onLoad(story)}>
              {story.thumbnail
                ? <img src={story.thumbnail} alt="" style={{ width: '100%', height: 138, objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: 138, background: 'var(--lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Px grid={DRAG} size={7} /></div>
              }
              <button className="del-btn" onClick={e => handleDelete(e, story.id)}>✕</button>
              <div style={{ padding: '11px 13px' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: 'var(--purple)', letterSpacing: '.5px', marginBottom: 2 }}>
                  {story.brief?.child_name}'s Story
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {story.brief?.story_topic}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{new Date(story.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>{story.imageCount} 🖼</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN APP ─── */
export default function App() {
  const [view, setView] = useState('form')
  const [brief, setBrief] = useState({ child_name: '', story_topic: '', style: 'watercolor', age_group: '6-8', characters: [], voice_transcript: '' })
  const [segments, setSegments] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [creativeNote, setCreativeNote] = useState('')
  const [storyId, setStoryId] = useState(null)
  const [currentAudioPage, setCurrentAudioPage] = useState(0)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const currentAudioRef = useRef(null)

  const audioQ = useRef([])
  const playing = useRef(false)
  const recogn = useRef(null)

  /* restore on mount */
  useEffect(() => {
    const s = loadCurrentStory()
    if (s?.segments?.length > 0) {
      setBrief(s.brief || brief); setSegments(s.segments); setDone(s.done || false)
      setPageCount(s.pageCount || 0); setCreativeNote(s.creativeNote || ''); setStoryId(s.id); setView('story')
    }
  }, [])

  /* auto-save */
  useEffect(() => {
    if (segments.length === 0) return
    const d = {
      id: storyId || Date.now().toString(), brief, segments, done, pageCount, creativeNote,
      savedAt: new Date().toISOString(), thumbnail: segments.find(s => s.type === 'image')?.url || null,
      imageCount: segments.filter(s => s.type === 'image').length
    }
    saveCurrentStory(d)
    if (done) saveToHistory(d)
  }, [segments, done, creativeNote])

  /* audio queue */
  const playNext = () => {
    if (!audioQ.current.length) {
      playing.current = false
      setIsAudioPlaying(false)
      return
    }
    playing.current = true
    const { url, pageIdx } = audioQ.current.shift()
    setCurrentAudioPage(pageIdx)
    const a = new Audio(url)
    currentAudioRef.current = a
    a.onended = playNext
    a.onerror = playNext
    a.play()
      .then(() => setIsAudioPlaying(true))
      .catch(playNext)
  }

  const queueAudio = (url, pageIdx = 0) => {
    audioQ.current.push({ url, pageIdx })
    // do NOT auto-play — user presses play
  }

  const toggleAudio = () => {
    const a = currentAudioRef.current
    if (!a && audioQ.current.length > 0) {
      // nothing playing yet, start the queue
      playNext()
      return
    }
    if (!a) return
    if (a.paused) {
      a.play().then(() => setIsAudioPlaying(true)).catch(() => { })
    } else {
      a.pause()
      setIsAudioPlaying(false)
    }
  }

  const replayAudio = () => {
    const a = currentAudioRef.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    a.play().then(() => setIsAudioPlaying(true)).catch(() => { })
  }

  const stopAllAudio = () => {
    const a = currentAudioRef.current
    if (a) { a.pause(); a.currentTime = 0 }
    audioQ.current = []
    playing.current = false
    setIsAudioPlaying(false)
    currentAudioRef.current = null
  }

  /* voice */
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome.'); return }
    const r = new SR(); r.continuous = true; r.interimResults = false; r.lang = 'en-US'
    r.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join(' ')
      setBrief(b => ({ ...b, voice_transcript: t, story_topic: t }))
      const m = t.match(/(?:about|for|starring)\s+([A-Z][a-z]+)/i)
      if (m) setBrief(b => ({ ...b, child_name: m[1] }))
    }
    r.onend = () => setIsListening(false); r.onerror = () => setIsListening(false)
    r.start(); recogn.current = r; setIsListening(true)
  }
  const stopVoice = () => { recogn.current?.stop(); setIsListening(false) }

  /* generate */
  const generate = async () => {
    if (!brief.child_name || !brief.story_topic) return
    const newId = Date.now().toString()
    setStoryId(newId); setSegments([]); setIsGenerating(true); setDone(false)
    setError(''); setPageCount(0); setCreativeNote('')
    audioQ.current = []; playing.current = false; clearCurrentStory(); setView('story')
    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief)
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done: sd, value } = await reader.read()
        if (sd) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'text') {
              setSegments(s => { const l = s[s.length - 1]; if (l?.type === 'text') return [...s.slice(0, -1), { ...l, content: l.content + ev.delta }]; return [...s, { type: 'text', content: ev.delta, id: Date.now() }] })
            } else if (ev.type === 'creative_note') {
              setCreativeNote(ev.message)
            } else if (ev.type === 'image_loading') {
              setSegments(s => [...s, { type: 'image_loading', index: ev.index, id: Date.now() + Math.random() }])
            } else if (ev.type === 'image') {
              setSegments(s => s.map(seg => seg.type === 'image_loading' && seg.index === ev.index ? { type: 'image', url: ev.url, index: ev.index, id: seg.id } : seg)); setPageCount(p => p + 1)
            } else if (ev.type === 'audio') {
              queueAudio(ev.url, pageCount)
            } else if (ev.type === 'done') {
              setDone(true); setIsGenerating(false)
            } else if (ev.type === 'error') { setError(ev.message); setIsGenerating(false) }
          } catch { }
        }
      }
    } catch (err) { setError(err.message); setIsGenerating(false) }
  }

  /* load from history */
  const loadStory = (s) => {
    setBrief(s.brief); setSegments(s.segments); setDone(s.done)
    setPageCount(s.pageCount); setCreativeNote(s.creativeNote || ''); setStoryId(s.id)
    saveCurrentStory(s); setView('story'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* new story */
  const newStory = () => {
    stopAllAudio()                    // ← add this line
    setSegments([]); setDone(false); setError(''); setPageCount(0); setStoryId(null)
    setCreativeNote(''); clearCurrentStory()
    setBrief({ child_name: '', story_topic: '', style: 'watercolor', age_group: '6-8', characters: [], voice_transcript: '' })
    setView('form'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const histCount = loadHistory().length
  const styles = [{ v: 'watercolor', l: 'Watercolor', i: '🎨' }, { v: 'cartoon', l: 'Cartoon', i: '✏️' }, { v: 'sketch', l: 'Sketch', i: '🖊️' }]

  return (
    <>
      <GS />

      {/* ── FLOATING PIXEL SPRITES ── */}
      <div style={{ position: 'fixed', top: 90, left: 24, opacity: .55, pointerEvents: 'none', zIndex: 0 }} className="float1">
        <Px grid={CAT} size={6} />
      </div>
      <div style={{ position: 'fixed', top: 180, right: 20, opacity: .45, pointerEvents: 'none', zIndex: 0 }} className="float2">
        <Px grid={DRAG} size={6} />
      </div>
      <div style={{ position: 'fixed', bottom: 180, left: 18, opacity: .4, pointerEvents: 'none', zIndex: 0 }} className="float3">
        <Px grid={STAR} size={5} />
      </div>
      <div style={{ position: 'fixed', bottom: 100, right: 22, opacity: .4, pointerEvents: 'none', zIndex: 0 }} className="float4">
        <Px grid={STAR} size={4} />
      </div>

      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(249,247,255,.88)', backdropFilter: 'blur(18px)',
        borderBottom: '1.5px solid rgba(196,181,253,.3)',
        padding: '0 24px', height: 66,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: 'var(--lavender)',
            border: '1.5px solid var(--lav-b)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Px grid={DRAG} size={4} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: 'var(--purple)', letterSpacing: '1.5px', lineHeight: 1.1 }}>
              Google Stories
            </div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--text-soft)', fontWeight: 500 }}>
              Gemini + Imagen 3
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', borderRadius: 50, padding: 4, border: '1.5px solid var(--border)' }}>
          <button
            className={`tab ${view !== 'history' ? 'tab-on' : 'tab-off'}`}
            onClick={() => {
              if (view === 'history') {
                setView(segments.length > 0 ? 'story' : 'form')
              } else if (view === 'story') {
                newStory()
              }
            }}
          >
            ✨ Create
          </button>
          <button className={`tab ${view === 'history' ? 'tab-on' : 'tab-off'}`}
            onClick={() => setView('history')} style={{ position: 'relative' }}>
            📚 Library
            {histCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--purple)', color: '#EDE9FE', borderRadius: '50%',
                width: 17, height: 17, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {histCount > 9 ? '9+' : histCount}
              </span>
            )}
          </button>
        </div>

        <div className="pill" style={{ fontSize: 11 }}>
          Gemini Live Agent Challenge
        </div>
      </header>

      {/* ── HISTORY ── */}
      {view === 'history' && <HistoryPanel onLoad={loadStory} />}

      {/* ── FORM ── */}
      {view === 'form' && (
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '44px 20px 60px', position: 'relative', zIndex: 1 }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 40 }} className="fade-up">
            <div className="float1" style={{ display: 'inline-block', marginBottom: 16 }}>
              <Px grid={DRAG} size={11} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-d)', fontSize: 46, color: 'var(--purple)',
              letterSpacing: '2px', lineHeight: 1.2, marginBottom: 14
            }}>
              Every child deserves<br />their own story
            </h1>
            <p style={{
              fontFamily: 'var(--font-b)', fontSize: 15, color: 'var(--text-mid)',
              lineHeight: 1.75, fontWeight: 500
            }}>
              Speak or type a brief — get a fully illustrated,<br />
              narrated storybook in under 2 minutes.
            </p>
          </div>

          {/* ── BENTO GRID ── */}
          <div className="bento" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto' }}>

            {/* Voice input — full width */}
            <div className="bcard bcard-lav" style={{ gridColumn: '1/-1' }}>
              <div className="pill" style={{ marginBottom: 14, fontSize: 12 }}>
                🎤 Voice Brief
              </div>
              <button className={`btn-voice${isListening ? ' on' : ''}`}
                onClick={isListening ? stopVoice : startVoice}>
                <span style={{ fontSize: 20 }}>{isListening ? '⏹' : '🎤'}</span>
                {isListening ? 'Listening... tap to stop' : 'Speak your story brief'}
                {isListening && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6 }}>● LIVE</span>}
              </button>
              {brief.voice_transcript && (
                <div className="transcript" style={{ marginTop: 12, marginBottom: 0 }}>
                  "{brief.voice_transcript}"
                </div>
              )}
            </div>

            {/* Child name */}
            <div className="bcard bcard-mint">
              <label className="lbl">Child's Name</label>
              <input className="inp" value={brief.child_name}
                onChange={e => setBrief(b => ({ ...b, child_name: e.target.value }))}
                placeholder="e.g. Priya" />
            </div>

            {/* Age group */}
            <div className="bcard bcard-peach">
              <label className="lbl">Age Group</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['3-5', '6-8', '9-12'].map(a => (
                  <button key={a} className={`chip${brief.age_group === a ? ' on' : ''}`}
                    onClick={() => setBrief(b => ({ ...b, age_group: a }))}>
                    {a} yrs
                  </button>
                ))}
              </div>
            </div>

            {/* Story topic — full width */}
            <div className="bcard" style={{ gridColumn: '1/-1' }}>
              <label className="lbl">Story Topic & Lesson</label>
              <input className="inp" value={brief.story_topic}
                onChange={e => setBrief(b => ({ ...b, story_topic: e.target.value }))}
                placeholder="e.g. Priya and Bruno in Hyderabad, learning to ask for help" />
            </div>

            {/* Illustration style — full width */}
            <div className="bcard bcard-sky" style={{ gridColumn: '1/-1' }}>
              <label className="lbl">Illustration Style</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {styles.map(s => (
                  <button key={s.v} className={`chip${brief.style === s.v ? ' on' : ''}`}
                    style={{ background: brief.style === s.v ? 'white' : undefined }}
                    onClick={() => setBrief(b => ({ ...b, style: s.v }))}>
                    <span style={{ fontSize: 22 }}>{s.i}</span>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature pills */}
            <div className="bcard bcard-rose" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: '#9F1239', letterSpacing: '1px' }}>Imagen 3</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: '#BE123C', fontWeight: 500 }}>Illustrations</div>
            </div>
            <div className="bcard bcard-mint" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔊</div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: '#065F46', letterSpacing: '1px' }}>Narration</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: '#047857', fontWeight: 500 }}>Auto-plays</div>
            </div>

            {/* Error */}
            {error && <div className="err" style={{ gridColumn: '1/-1' }}>{error}</div>}

            {/* Generate button — full width */}
            <div style={{ gridColumn: '1/-1' }}>
              <button className="btn-gen" onClick={generate}
                disabled={!brief.child_name || !brief.story_topic}>
                <Px grid={[[P, '#FCD34D', '#FCD34D', P], ['#FCD34D', '#FDE68A', '#FDE68A', '#FCD34D'], ['#FCD34D', '#FDE68A', '#FDE68A', '#FCD34D'], [P, '#FCD34D', '#FCD34D', P]]} size={5} />
                Generate {brief.child_name ? `${brief.child_name}'s` : 'the'} Storybook
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── STORY VIEW ── */}
      {view === 'story' && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {error && (
            <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 20px' }}>
              <div className="err">⚠️ {error}</div>
              <button onClick={newStory}
                style={{
                  fontFamily: 'var(--font-d)', fontSize: 16, letterSpacing: '1px',
                  background: 'var(--lavender)', color: 'var(--purple)',
                  border: '1.5px solid var(--lav-b)', borderRadius: 12,
                  padding: '10px 24px', cursor: 'pointer', width: '100%'
                }}>
                ← Back to Form
              </button>
            </div>
          )}
          <StoryBook
            segments={segments}
            done={done}
            brief={brief}
            creativeNote={creativeNote}
            isGenerating={isGenerating}
            onNewStory={newStory}
            onViewHistory={() => setView('history')}
            storyKey={storyId}
            currentAudioPage={currentAudioPage}
            isAudioPlaying={isAudioPlaying}
            hasAudio={audioQ.current.length > 0 || currentAudioRef.current !== null}
            onToggleAudio={toggleAudio}
            onReplayAudio={replayAudio}
          />
        </div>
      )}
    </>
  )
}