import { useState, useEffect, useRef } from 'react'

const P = null
const CAT = [
    [P, '#FB923C', '#FB923C', P, P, '#FB923C', '#FB923C', P],
    ['#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C'],
    ['#FB923C', P, '#065F46', P, '#065F46', P, '#FB923C', P],
    ['#FB923C', '#FB923C', '#FDE68A', '#FB923C', '#FDE68A', '#FB923C', '#FB923C', P],
    [P, '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', P, P],
    ['#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', '#FB923C', P],
    ['#FB923C', '#FB923C', P, P, P, '#FB923C', '#FB923C', P],
    ['#FDBA74', '#FDBA74', P, P, P, '#FDBA74', '#FDBA74', P],
]
const DRAGON = [
    [P, P, '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P],
    [P, '#C4B5FD', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', '#C4B5FD', P],
    [P, '#A78BFA', '#A78BFA', '#FCD34D', '#A78BFA', '#A78BFA', '#A78BFA', P],
    ['#DDD6FE', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P],
    [P, '#A78BFA', '#A78BFA', '#A78BFA', '#A78BFA', P, P, P],
    [P, P, '#A78BFA', '#A78BFA', '#A78BFA', P, P, P],
    [P, P, P, '#A78BFA', '#A78BFA', P, P, P],
    [P, P, P, P, '#C4B5FD', P, P, P],
]
const STAR = [
    [P, P, P, '#FCD34D', P, P, P, P],
    [P, '#FCD34D', P, '#FCD34D', P, '#FCD34D', P, P],
    [P, P, '#FDE68A', '#FCD34D', '#FDE68A', P, P, P],
    ['#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', '#FCD34D', P],
    [P, P, '#FDE68A', '#FCD34D', '#FDE68A', P, P, P],
    [P, '#FCD34D', P, '#FCD34D', P, '#FCD34D', P, P],
    [P, P, P, '#FCD34D', P, P, P, P],
    [P, P, P, P, P, P, P, P],
]

const Px = ({ grid, size = 5 }) => (
    <svg
        viewBox={`0 0 ${grid[0].length * size} ${grid.length * size}`}
        width={grid[0].length * size}
        height={grid.length * size}
        style={{ imageRendering: 'pixelated', display: 'block' }}
    >
        {grid.map((row, y) =>
            row.map((c, x) =>
                c ? <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={c} /> : null
            )
        )}
    </svg>
)

/* ─────────────────────────────────────────────
   Group SSE segments into page spreads.
   A spread is complete when it has a resolved image URL.
   A spread is pending when it has image_loading.
   A spread is text-only when no image at all (final page).
───────────────────────────────────────────── */
function toSpreads(segments) {
    const out = []
    let texts = []
    for (const s of segments) {
        if (s.type === 'text') {
            texts.push(s.content)
        } else if (s.type === 'image' || s.type === 'image_loading') {
            out.push({
                text: texts.join(''),
                image: s.type === 'image' ? s.url : null,
                loading: s.type === 'image_loading',
                id: s.id,
            })
            texts = []
        }
    }
    // trailing text (last page, no image yet)
    if (texts.length) {
        out.push({ text: texts.join(''), image: null, loading: false, id: 'final' })
    }
    return out
}

const STYLES = `
  @keyframes bookUp {
    from { opacity:0; transform:translateY(44px) scale(.95); }
    to   { opacity:1; transform:none; }
  }
  @keyframes flipClose {
    0%   { transform:perspective(2200px) rotateY(0deg); opacity:1; }
    55%  { opacity:1; }
    100% { transform:perspective(2200px) rotateY(-170deg); opacity:0; }
  }
  @keyframes pagesIn {
    0%,55% { opacity:0; }
    100%   { opacity:1; }
  }
  @keyframes shimmer {
    0%   { background-position:200% 0; }
    100% { background-position:-200% 0; }
  }
  @keyframes floatY {
    0%,100% { transform:translateY(0);    }
    50%     { transform:translateY(-9px); }
  }
  @keyframes genDot {
    0%,80%,100% { transform:translateY(0);   }
    40%         { transform:translateY(-6px); }
  }
  /* smooth slide-fade page turns */
  @keyframes exitLeft {
    from { opacity:1; transform:translateX(0);     }
    to   { opacity:0; transform:translateX(-30px); }
  }
  @keyframes enterRight {
    from { opacity:0; transform:translateX(30px); }
    to   { opacity:1; transform:translateX(0);    }
  }
  @keyframes exitRight {
    from { opacity:1; transform:translateX(0);    }
    to   { opacity:0; transform:translateX(30px); }
  }
  @keyframes enterLeft {
    from { opacity:0; transform:translateX(-30px); }
    to   { opacity:1; transform:translateX(0);     }
  }
  /* image reveal — fades in when src loads */
  @keyframes imgReveal {
    from { opacity:0; transform:scale(.97); }
    to   { opacity:1; transform:scale(1);   }
  }

  .anim-bookUp   { animation: bookUp .5s ease both; }
  .cover-flip    { transform-origin:left center; animation:flipClose 1.45s cubic-bezier(.4,0,.2,1) forwards; will-change:transform; }
  .pages-in      { animation: pagesIn 1.45s ease forwards; }
  .pg-exitLeft   { animation: exitLeft   220ms ease forwards; }
  .pg-exitRight  { animation: exitRight  220ms ease forwards; }
  .pg-enterRight { animation: enterRight 260ms ease both; }
  .pg-enterLeft  { animation: enterLeft  260ms ease both; }
  .img-reveal    { animation: imgReveal  400ms ease both; }
  .skel          {
    background: linear-gradient(90deg,#EDE9FE 25%,#F5F3FF 50%,#EDE9FE 75%);
    background-size: 200% 100%;
    animation: shimmer 1.8s infinite;
    border-radius: 12px;
  }
  .book-lines {
    background-image: repeating-linear-gradient(
      to bottom,
      transparent, transparent 27px,
      rgba(167,139,250,.13) 27px, rgba(167,139,250,.13) 28px
    );
  }
  .float-it { animation: floatY 3.2s ease-in-out infinite; }
  .gen-dot  { animation: genDot 1.2s ease-in-out infinite; display:inline-block; }
  .gen-dot:nth-child(2) { animation-delay:.18s; }
  .gen-dot:nth-child(3) { animation-delay:.36s; }
`

/* ─────────────────────────────────────────────
   PageSpread — isolated so only it re-mounts
   on displayIdx change. key prop does the work.
───────────────────────────────────────────── */
function PageSpread({ spread, idx, enterClass, creativeNote, isGenerating, isLastSpread }) {
    return (
        <div
            className={enterClass}
            style={{ display: 'flex', width: '100%', minHeight: 460 }}
        >
            {/* LEFT — illustration */}
            <div style={{
                flex: '0 0 44%',
                background: '#F5F3FF',
                borderRight: '2px solid rgba(196,181,253,.28)',
                padding: '32px 22px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
            }}>
                <div style={{
                    fontFamily: "'Jersey 10',monospace",
                    fontSize: 12, color: '#A78BFA',
                    letterSpacing: '2px', textTransform: 'uppercase',
                }}>
                    Page {idx + 1}
                </div>

                {/* Image: resolved → show with reveal anim */}
                {spread?.image ? (
                    <img
                        src={spread.image}
                        alt={`Illustration ${idx + 1}`}
                        className="img-reveal"
                        style={{
                            width: '100%', borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(109,40,217,.14)',
                            display: 'block',
                        }}
                        onError={e => { e.target.style.display = 'none' }}
                    />
                ) : spread?.loading ? (
                    /* Image generating — skeleton with status label */
                    <div style={{ width: '100%' }}>
                        <div className="skel" style={{ height: 190 }} />
                        <div style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 12,
                            color: '#A78BFA', textAlign: 'center',
                            marginTop: 10, letterSpacing: '1px',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 6,
                        }}>
                            Painting
                            <span className="gen-dot">·</span>
                            <span className="gen-dot">·</span>
                            <span className="gen-dot">·</span>
                        </div>
                    </div>
                ) : isGenerating && isLastSpread ? (
                    /* Text-only trailing spread — still writing */
                    <div style={{
                        width: '100%', height: 190, borderRadius: 12,
                        background: '#EDE9FE', border: '1.5px dashed #C4B5FD',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 10,
                    }}>
                        <Px grid={STAR} size={8} />
                        <div style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 12,
                            color: '#A78BFA', letterSpacing: '1px',
                        }}>
                            Writing
                            <span className="gen-dot"> ·</span>
                            <span className="gen-dot">·</span>
                            <span className="gen-dot">·</span>
                        </div>
                    </div>
                ) : (
                    /* Static placeholder for text-only final page */
                    <div style={{
                        width: '100%', height: 190, borderRadius: 12,
                        background: '#EDE9FE', border: '1.5px dashed #C4B5FD',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Px grid={STAR} size={10} />
                    </div>
                )}

                <div style={{ opacity: .4 }}>
                    <Px grid={CAT} size={4} />
                </div>
            </div>

            {/* SPINE */}
            <div style={{
                width: 16, flexShrink: 0,
                background: 'linear-gradient(to right,rgba(196,181,253,.45),rgba(237,233,254,.08))',
            }} />

            {/* RIGHT — text */}
            <div
                className="book-lines"
                style={{
                    flex: 1, background: '#FFFDF7',
                    padding: '40px 32px 36px',
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 17, lineHeight: 1.95,
                    color: '#374151', fontWeight: 500,
                    minHeight: 440, position: 'relative',
                }}
            >
                {spread?.text ? (
                    <p style={{ margin: 0 }}>{spread.text}</p>
                ) : (
                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                        The adventure continues...
                    </span>
                )}

                {creativeNote && idx === 0 && (
                    <div style={{
                        position: 'absolute', bottom: 20, left: 24, right: 24,
                        padding: '9px 14px', background: '#FFF1F2',
                        border: '1.5px dashed #FECDD3', borderRadius: 10,
                        fontSize: 12, color: '#9F1239',
                        fontStyle: 'italic', lineHeight: 1.6,
                    }}>
                        🎨 {creativeNote}
                    </div>
                )}

                <div style={{
                    position: 'absolute', bottom: 14, right: 20,
                    fontFamily: "'Jersey 10',monospace",
                    fontSize: 13, color: '#C4B5FD', letterSpacing: '1px',
                }}>
                    {idx + 1}
                </div>
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function StoryBook({
    segments, done, brief, creativeNote,
    isGenerating, onNewStory, onViewHistory,
    storyKey,
    currentAudioPage,   /* passed from App: index of page whose audio is playing */
}) {
    const [bookOpen, setBookOpen] = useState(false)
    const [isOpening, setIsOpening] = useState(false)
    const [displayIdx, setDisplayIdx] = useState(0)   // what the user sees
    const [targetIdx, setTargetIdx] = useState(0)   // where we want to go
    const [enterClass, setEnterClass] = useState('pg-enterRight')
    const [flipping, setFlipping] = useState(false)
    const autoAdvanceRef = useRef(true)   // false once user manually flips

    /* reset on new story */
    useEffect(() => {
        setBookOpen(false)
        setIsOpening(false)
        setDisplayIdx(0)
        setTargetIdx(0)
        setEnterClass('pg-enterRight')
        setFlipping(false)
        autoAdvanceRef.current = true
    }, [storyKey])

    /* open book immediately when generation starts */
    useEffect(() => {
        if (isGenerating && !bookOpen) {
            setBookOpen(true)
        }
    }, [isGenerating])

    /* open book with animation when done (if not already open) */
    useEffect(() => {
        if (done && !bookOpen && !isOpening) {
            const t = setTimeout(() => {
                setIsOpening(true)
                setTimeout(() => setBookOpen(true), 1500)
            }, 600)
            return () => clearTimeout(t)
        }
    }, [done])

    const spreads = toSpreads(segments)

    /*
      Auto-advance during generation:
      When a new complete spread appears (has resolved image),
      and user hasn't manually navigated,
      and audio for the current page has finished (or no audio tracking),
      move to the next complete spread.
  
      "Complete" = has a real image URL (not loading, not null).
      We wait for image because image = the page is fully ready to read.
    */
    useEffect(() => {
        if (!isGenerating || !autoAdvanceRef.current) return
        if (flipping) return

        // find the last spread with a resolved image
        let lastComplete = -1
        for (let i = 0; i < spreads.length; i++) {
            if (spreads[i].image) lastComplete = i
        }
        if (lastComplete < 0) return

        // if audio page tracking is available, don't advance past what's been read
        const audioGate = currentAudioPage != null
            ? Math.min(lastComplete, currentAudioPage)
            : lastComplete

        if (audioGate > displayIdx) {
            // advance one page at a time
            const next = displayIdx + 1
            if (next <= audioGate) {
                doFlip(next, 'next')
            }
        }
    }, [spreads.length, spreads.map(s => s.image).join(','), currentAudioPage])

    /* internal flip executor */
    const doFlip = (next, dir) => {
        if (flipping) return
        setFlipping(true)
        setTargetIdx(next)
        const exitCls = dir === 'next' ? 'pg-exitLeft' : 'pg-exitRight'
        const enterCls = dir === 'next' ? 'pg-enterRight' : 'pg-enterLeft'
        // play exit on current
        setEnterClass(exitCls)
        setTimeout(() => {
            setDisplayIdx(next)
            setEnterClass(enterCls)
            setTimeout(() => {
                setFlipping(false)
                setEnterClass('')
            }, 270)
        }, 225)
    }

    const flip = (dir) => {
        const next = dir === 'next' ? displayIdx + 1 : displayIdx - 1
        if (next < 0 || next >= spreads.length || flipping) return
        autoAdvanceRef.current = false   // user took control
        doFlip(next, dir)
    }

    const jumpTo = (i) => {
        if (i === displayIdx || flipping) return
        autoAdvanceRef.current = false
        doFlip(i, i > displayIdx ? 'next' : 'prev')
    }

    const spread = spreads[displayIdx]
    const isLastSpread = displayIdx === spreads.length - 1

    /* ═══════════════════════════════════════
       PRE-OPEN: only shown if done=false AND
       generation hasn't started yet.
       (Normally skipped — book opens as soon
        as generation begins.)
    ═══════════════════════════════════════ */
    if (!isGenerating && !done && !bookOpen) return (
        <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
            <style>{STYLES}</style>
            <div style={{ marginBottom: 20 }}><Px grid={DRAGON} size={8} /></div>
            <div style={{
                fontFamily: "'Jersey 10',monospace", fontSize: 26,
                color: '#6D28D9', letterSpacing: '1.5px', marginBottom: 10,
            }}>
                Hmm, something went wrong
            </div>
            <div style={{
                fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF',
                fontSize: 15, fontWeight: 500, marginBottom: 28, lineHeight: 1.7,
            }}>
                Could not reach the backend.<br />
                Check your{' '}
                <code style={{ background: '#EDE9FE', padding: '2px 7px', borderRadius: 6, color: '#6D28D9', fontSize: 13 }}>
                    VITE_BACKEND_URL
                </code>
            </div>
            <button
                onClick={onNewStory}
                style={{
                    fontFamily: "'Jersey 10',monospace", fontSize: 18, letterSpacing: '1px',
                    background: 'linear-gradient(135deg,#6D28D9,#4C1D95)',
                    color: '#EDE9FE', border: 'none', borderRadius: 14,
                    padding: '12px 36px', cursor: 'pointer', boxShadow: '0 5px 0 #3B0764',
                }}
            >
                ← Back to Form
            </button>
        </div>
    )

    /* ═══════════════════════════════════════
       COVER: only shown when done=true and
       book hasn't opened yet (library load)
    ═══════════════════════════════════════ */
    if (done && !bookOpen) return (
        <div className="anim-bookUp" style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '44px 20px',
        }}>
            <style>{STYLES}</style>
            <div style={{
                fontFamily: "'Jersey 10',monospace", fontSize: 34,
                color: '#6D28D9', letterSpacing: '2px', marginBottom: 4,
            }}>
                ✨ Story Complete!
            </div>
            <div style={{
                fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF',
                fontSize: 15, fontWeight: 500, marginBottom: 48,
            }}>
                {spreads.length} pages · tap to open
            </div>

            <div
                style={{
                    position: 'relative', width: 240, height: 340,
                    cursor: isOpening ? 'default' : 'pointer', marginBottom: 44,
                }}
                onClick={() => {
                    if (!isOpening) {
                        setIsOpening(true)
                        setTimeout(() => setBookOpen(true), 1500)
                    }
                }}
            >
                <div style={{ position: 'absolute', left: 8, top: 4, width: '100%', height: '100%', background: '#F0EBE3', borderRadius: '4px 14px 14px 4px', boxShadow: '3px 5px 18px rgba(0,0,0,.1)' }} />
                <div style={{ position: 'absolute', left: 4, top: 2, width: '100%', height: '100%', background: '#FBF7F2', borderRadius: '4px 14px 14px 4px' }} />
                {isOpening && (
                    <div className="pages-in" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,#EDE9FE,#FFFDF7)', borderRadius: '4px 14px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Px grid={STAR} size={11} />
                    </div>
                )}
                <div
                    className={isOpening ? 'cover-flip' : ''}
                    style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(145deg,#6D28D9,#4C1D95 60%,#3B0764)',
                        borderRadius: '4px 14px 14px 4px',
                        boxShadow: isOpening ? 'none' : '-4px 0 0 #3B0764, 6px 7px 28px rgba(109,40,217,.35)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 12, padding: 26,
                    }}
                >
                    <div style={{ position: 'absolute', top: 10, left: 10, opacity: .35 }}><Px grid={STAR} size={3} /></div>
                    <div style={{ position: 'absolute', bottom: 10, right: 10, opacity: .25 }}><Px grid={STAR} size={3} /></div>
                    <Px grid={DRAGON} size={7} />
                    <div style={{ fontFamily: "'Jersey 10',monospace", fontSize: 20, color: '#EDE9FE', textAlign: 'center', letterSpacing: '1.5px', lineHeight: 1.45 }}>
                        {brief.child_name || 'My'}'s<br />Storybook
                    </div>
                    <div style={{ width: 44, height: 1.5, background: 'rgba(196,181,253,.4)', borderRadius: 2 }} />
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#A78BFA', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase' }}>
                        {brief.style} · ages {brief.age_group}
                    </div>
                    <div style={{ position: 'absolute', left: 14, top: 18, bottom: 18, width: 1.5, background: 'rgba(167,139,250,.2)', borderRadius: 4 }} />
                </div>
            </div>

            {!isOpening ? (
                <button
                    onClick={() => { setIsOpening(true); setTimeout(() => setBookOpen(true), 1500) }}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 20, letterSpacing: '1.5px',
                        background: 'linear-gradient(135deg,#6D28D9,#4C1D95)',
                        color: '#EDE9FE', border: 'none', borderRadius: 16,
                        padding: '13px 44px', cursor: 'pointer',
                        boxShadow: '0 6px 0 #3B0764, 0 14px 30px rgba(109,40,217,.28)',
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'translateY(5px)'; e.currentTarget.style.boxShadow = '0 1px 0 #3B0764' }}
                    onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 0 #3B0764, 0 14px 30px rgba(109,40,217,.28)' }}
                >
                    📖 Open Your Story
                </button>
            ) : (
                <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF', fontSize: 15, fontStyle: 'italic' }}>
                    Opening the book...
                </div>
            )}
        </div>
    )

    /* ═══════════════════════════════════════
       OPEN BOOK — used during generation AND
       after generation completes.
    ═══════════════════════════════════════ */
    return (
        <div style={{ padding: '24px 12px 52px' }} className="anim-bookUp">
            <style>{STYLES}</style>

            {/* Title bar */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Jersey 10',monospace", fontSize: 26, color: '#6D28D9', letterSpacing: '1.5px', marginBottom: 2 }}>
                    {brief.child_name || 'My'}'s Storybook
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    Page {displayIdx + 1} of {spreads.length || '…'}
                    {isGenerating && (
                        <span style={{
                            background: '#EDE9FE', color: '#6D28D9',
                            border: '1px solid #C4B5FD', borderRadius: 50,
                            padding: '2px 10px', fontSize: 11, fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6D28D9', display: 'inline-block', animation: 'floatY 1s ease-in-out infinite' }} />
                            Generating
                        </span>
                    )}
                </div>
            </div>

            {/* Book shell — static container, never re-renders */}
            <div style={{
                maxWidth: 900, margin: '0 auto', minHeight: 460,
                position: 'relative', overflow: 'hidden',
                borderRadius: '6px 20px 20px 6px',
                boxShadow: '-5px 0 0 #C4B5FD, 10px 12px 44px rgba(109,40,217,.12)',
            }}>
                {spreads.length > 0 ? (
                    <PageSpread
                        key={displayIdx}
                        spread={spread}
                        idx={displayIdx}
                        enterClass={enterClass || 'pg-enterRight'}
                        creativeNote={creativeNote}
                        isGenerating={isGenerating}
                        isLastSpread={isLastSpread}
                    />
                ) : (
                    /* Very first page — nothing built yet, show waiting state */
                    <div style={{
                        display: 'flex', width: '100%', minHeight: 460,
                        alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(to right,#F5F3FF,#FFFDF7)',
                        flexDirection: 'column', gap: 16,
                    }}>
                        <div className="float-it"><Px grid={DRAGON} size={9} /></div>
                        <div style={{ fontFamily: "'Jersey 10',monospace", fontSize: 22, color: '#6D28D9', letterSpacing: '1.5px' }}>
                            Writing the story
                            <span className="gen-dot"> ·</span>
                            <span className="gen-dot">·</span>
                            <span className="gen-dot">·</span>
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
                            Gemini is crafting · Imagen 3 is painting
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 14, maxWidth: 900, margin: '22px auto 0',
            }}>
                <button
                    onClick={() => flip('prev')}
                    disabled={displayIdx === 0 || flipping}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                        background: displayIdx === 0 ? '#F5F3FF' : 'white',
                        color: displayIdx === 0 ? '#C4B5FD' : '#6D28D9',
                        border: `1.5px solid ${displayIdx === 0 ? '#DDD6FE' : '#A78BFA'}`,
                        borderRadius: 12, padding: '10px 26px',
                        cursor: displayIdx === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: displayIdx === 0 ? 'none' : '0 4px 0 #DDD6FE',
                        transition: 'all .15s',
                    }}
                >
                    ← Prev
                </button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {spreads.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => jumpTo(i)}
                            style={{
                                width: i === displayIdx ? 20 : 8, height: 8,
                                borderRadius: 4, border: 'none', padding: 0,
                                cursor: i === displayIdx ? 'default' : 'pointer',
                                background: i === displayIdx ? '#6D28D9'
                                    : spreads[i]?.image ? '#A78BFA'   /* complete */
                                        : spreads[i]?.loading ? '#DDD6FE' /* painting */
                                            : '#E5E7EB',                       /* text only */
                                transition: 'all .2s',
                            }}
                            title={
                                spreads[i]?.image ? `Page ${i + 1} ready` :
                                    spreads[i]?.loading ? `Page ${i + 1} painting…` :
                                        `Page ${i + 1}`
                            }
                        />
                    ))}
                </div>

                <button
                    onClick={() => flip('next')}
                    disabled={displayIdx >= spreads.length - 1 || flipping}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                        background: displayIdx >= spreads.length - 1 ? '#F5F3FF' : '#6D28D9',
                        color: displayIdx >= spreads.length - 1 ? '#C4B5FD' : '#EDE9FE',
                        border: 'none', borderRadius: 12, padding: '10px 26px',
                        cursor: displayIdx >= spreads.length - 1 ? 'not-allowed' : 'pointer',
                        boxShadow: displayIdx >= spreads.length - 1 ? 'none' : '0 5px 0 #3B0764',
                        transition: 'all .15s',
                    }}
                >
                    Next →
                </button>
            </div>

            {/* Dot legend during generation */}
            {isGenerating && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 16, marginTop: 10,
                    fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#9CA3AF', fontWeight: 500,
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#A78BFA', display: 'inline-block' }} /> Ready
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#DDD6FE', display: 'inline-block' }} /> Painting
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#E5E7EB', display: 'inline-block' }} /> Writing
                    </span>
                </div>
            )}

            {/* Action buttons — only after done */}
            {done && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
                    <button
                        onClick={onNewStory}
                        style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                            background: '#D1FAE5', color: '#047857',
                            border: '1.5px solid #A7F3D0', borderRadius: 14,
                            padding: '11px 28px', cursor: 'pointer',
                            boxShadow: '0 4px 0 #A7F3D0', transition: 'transform .1s',
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
                        onMouseUp={e => e.currentTarget.style.transform = ''}
                    >
                        ✨ New Story
                    </button>
                    <button
                        onClick={onViewHistory}
                        style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                            background: '#DBEAFE', color: '#1D4ED8',
                            border: '1.5px solid #BFDBFE', borderRadius: 14,
                            padding: '11px 28px', cursor: 'pointer',
                            boxShadow: '0 4px 0 #BFDBFE', transition: 'transform .1s',
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'translateY(3px)'}
                        onMouseUp={e => e.currentTarget.style.transform = ''}
                    >
                        📚 Library
                    </button>
                </div>
            )}
        </div>
    )
}