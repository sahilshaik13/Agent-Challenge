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
const WAND = [
    [P, P, P, P, P, P, '#FCD34D', P],
    [P, P, P, P, P, '#FCD34D', '#FDE68A', '#FCD34D'],
    [P, P, P, P, '#10B981', '#10B981', P, P],
    [P, P, P, '#10B981', '#059669', P, P, P],
    [P, P, '#6D28D9', '#7C3AED', P, P, P, P],
    [P, '#6D28D9', '#8B5CF6', P, P, P, P, P],
    ['#4C1D95', '#7C3AED', P, P, P, P, P, P],
    ['#4C1D95', P, P, P, P, P, P, P],
]

const Px = ({ grid, size = 5 }) => (
    <svg
        viewBox={`0 0 ${grid[0].length * size} ${grid.length * size}`}
        width={grid[0].length * size} height={grid.length * size}
        style={{ imageRendering: 'pixelated', display: 'block' }}
    >
        {grid.map((row, y) => row.map((c, x) =>
            c ? <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={c} /> : null
        ))}
    </svg>
)

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
    if (texts.length) out.push({ text: texts.join(''), image: null, loading: false, id: 'final' })
    return out
}

const STYLES = `
  @keyframes bookUp {
    from { opacity:0; transform:translateY(44px) scale(.95); }
    to   { opacity:1; transform:none; }
  }
  @keyframes flipClose {
    0%   { transform:perspective(2200px) rotateY(0deg);    opacity:1; }
    55%  { opacity:1; }
    100% { transform:perspective(2200px) rotateY(-170deg); opacity:0; }
  }
  @keyframes pagesIn {
    0%,55% { opacity:0; }
    100%   { opacity:1; }
  }
  @keyframes genPulse {
    0%,100% { transform:scaleX(.45); opacity:.4; }
    50%     { transform:scaleX(1);   opacity:1;  }
  }
  @keyframes shimmer {
    0%   { background-position:200% 0;  }
    100% { background-position:-200% 0; }
  }
  @keyframes floatY {
    0%,100% { transform:translateY(0);   }
    50%     { transform:translateY(-9px);}
  }
  /* ── smooth slide-fade for page turns — no flicker ── */
  @keyframes slideOutLeft {
    from { opacity:1; transform:translateX(0);    }
    to   { opacity:0; transform:translateX(-28px);}
  }
  @keyframes slideInRight {
    from { opacity:0; transform:translateX(28px); }
    to   { opacity:1; transform:translateX(0);    }
  }
  @keyframes slideOutRight {
    from { opacity:1; transform:translateX(0);   }
    to   { opacity:0; transform:translateX(28px);}
  }
  @keyframes slideInLeft {
    from { opacity:0; transform:translateX(-28px);}
    to   { opacity:1; transform:translateX(0);    }
  }

  .anim-bookUp       { animation:bookUp .5s ease both; }
  .anim-outLeft      { animation:slideOutLeft  .22s ease forwards; }
  .anim-inRight      { animation:slideInRight  .24s ease both; }
  .anim-outRight     { animation:slideOutRight .22s ease forwards; }
  .anim-inLeft       { animation:slideInLeft   .24s ease both; }
  .anim-visible      { animation:bookUp .4s ease both; }
  .cover-flip        { transform-origin:left center; animation:flipClose 1.45s cubic-bezier(.4,0,.2,1) forwards; will-change:transform; }
  .pages-in          { animation:pagesIn 1.45s ease forwards; }
  .skel              { background:linear-gradient(90deg,#EDE9FE 25%,#F5F3FF 50%,#EDE9FE 75%); background-size:200% 100%; animation:shimmer 1.8s infinite; border-radius:12px; }
  .book-lines        { background-image:repeating-linear-gradient(to bottom,transparent,transparent 27px,rgba(167,139,250,.13) 27px,rgba(167,139,250,.13) 28px); }
  .float-it          { animation:floatY 3.2s ease-in-out infinite; }

  /* make the spread container clip overflow so slides don't bleed */
  .spread-wrap {
    overflow: hidden;
    border-radius: 6px 20px 20px 6px;
    will-change: contents;
  }
`

export default function StoryBook({
    segments, done, brief, creativeNote,
    isGenerating, onNewStory, onViewHistory,
    storyKey,          /* pass a new value each time a story loads to reset state */
}) {
    const [bookOpen, setBookOpen] = useState(false)
    const [isOpening, setIsOpening] = useState(false)
    const [idx, setIdx] = useState(0)
    const [anim, setAnim] = useState('anim-visible')
    const [flipping, setFlipping] = useState(false)
    const endRef = useRef(null)

    /* ── reset whenever a new story is loaded (storyKey changes) ── */
    useEffect(() => {
        setBookOpen(false)
        setIsOpening(false)
        setIdx(0)
        setAnim('anim-visible')
        setFlipping(false)
    }, [storyKey])

    /* ── auto-scroll during generation ── */
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [segments])

    /* ── open book after generation completes ── */
    useEffect(() => {
        if (done && !bookOpen && !isOpening) {
            const t = setTimeout(() => {
                setIsOpening(true)
                setTimeout(() => { setBookOpen(true); setAnim('anim-visible') }, 1500)
            }, 600)
            return () => clearTimeout(t)
        }
    }, [done])   /* intentionally only [done] — don't re-trigger on bookOpen change */

    const spreads = toSpreads(segments)
    const spread = spreads[idx]

    /* ── page flip — uses slide-fade, no 3D flicker ── */
    const flip = (dir) => {
        if (flipping) return
        const next = dir === 'next' ? idx + 1 : idx - 1
        if (next < 0 || next >= spreads.length) return
        setFlipping(true)
        setAnim(dir === 'next' ? 'anim-outLeft' : 'anim-outRight')
        setTimeout(() => {
            setIdx(next)
            setAnim(dir === 'next' ? 'anim-inRight' : 'anim-inLeft')
            setTimeout(() => { setFlipping(false); setAnim('anim-visible') }, 260)
        }, 230)
    }

    const jumpTo = (i) => {
        if (flipping || i === idx) return
        const dir = i > idx ? 'next' : 'prev'
        setFlipping(true)
        setAnim(dir === 'next' ? 'anim-outLeft' : 'anim-outRight')
        setTimeout(() => {
            setIdx(i)
            setAnim(dir === 'next' ? 'anim-inRight' : 'anim-inLeft')
            setTimeout(() => { setFlipping(false); setAnim('anim-visible') }, 260)
        }, 230)
    }

    /* ════════════════════════════════════════════════
       RENDER 1 — generating live stream preview
    ════════════════════════════════════════════════ */
    if (!done && isGenerating) return (
        <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 20px' }}>
            <style>{STYLES}</style>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="float-it" style={{ display: 'inline-block', marginBottom: 14 }}>
                    <Px grid={WAND} size={9} />
                </div>
                <div style={{
                    fontFamily: "'Jersey 10',monospace", fontSize: 32,
                    color: '#6D28D9', letterSpacing: '1.5px', marginBottom: 6
                }}>
                    Writing {brief.child_name || 'the'} story...
                </div>
                <div style={{
                    fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF',
                    fontSize: 15, fontWeight: 500
                }}>
                    Gemini is crafting · Imagen 3 is painting
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 24 }}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                        width: 26, height: 4, borderRadius: 2, background: '#DDD6FE',
                        animation: 'genPulse 1.5s ease-in-out infinite',
                        animationDelay: `${i * .18}s`,
                    }} />
                ))}
            </div>

            <div style={{
                background: '#F5F3FF', border: '1.5px dashed #C4B5FD',
                borderRadius: 20, padding: '28px 32px', minHeight: 200,
                fontFamily: "'DM Sans',sans-serif", fontSize: 16,
                lineHeight: 1.95, color: '#374151', fontWeight: 500,
            }}>
                {segments.filter(s => s.type === 'text').map((s, i) => <span key={i}>{s.content}</span>)}
                {segments.filter(s => s.type === 'image_loading').map((s, i) => (
                    <div key={i} style={{ marginTop: 14, marginBottom: 6 }}>
                        <div className="skel" style={{ height: 150 }} />
                        <div style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 13,
                            color: '#A78BFA', textAlign: 'center', marginTop: 6, letterSpacing: '1px',
                        }}>
                            Painting illustration...
                        </div>
                    </div>
                ))}
                {segments.length === 0 && (
                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>The story is beginning...</span>
                )}
                <div ref={endRef} />
            </div>

            {creativeNote && (
                <div style={{
                    marginTop: 14, padding: '10px 18px', background: '#FFF1F2',
                    border: '1.5px dashed #FECDD3', borderRadius: 12,
                    fontSize: 13, color: '#9F1239', fontStyle: 'italic',
                    fontWeight: 500, lineHeight: 1.6,
                }}>
                    🎨 {creativeNote}
                </div>
            )}
        </div>
    )

    /* ════════════════════════════════════════════════
       RENDER 2 — done, book cover (not yet opened)
    ════════════════════════════════════════════════ */
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
                {spreads.length} pages ready · tap the book to open it
            </div>

            {/* Book object */}
            <div style={{
                position: 'relative', width: 240, height: 340,
                cursor: isOpening ? 'default' : 'pointer',
                marginBottom: 44,
            }}
                onClick={() => {
                    if (!isOpening) {
                        setIsOpening(true)
                        setTimeout(() => setBookOpen(true), 1500)
                    }
                }}
            >
                {/* page stack behind cover */}
                <div style={{
                    position: 'absolute', left: 8, top: 4,
                    width: '100%', height: '100%',
                    background: '#F0EBE3', borderRadius: '4px 14px 14px 4px',
                    boxShadow: '3px 5px 18px rgba(0,0,0,.1)',
                }} />
                <div style={{
                    position: 'absolute', left: 4, top: 2,
                    width: '100%', height: '100%',
                    background: '#FBF7F2', borderRadius: '4px 14px 14px 4px',
                }} />

                {/* pages revealed after cover flips */}
                {isOpening && (
                    <div className="pages-in" style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to right,#EDE9FE,#FFFDF7)',
                        borderRadius: '4px 14px 14px 4px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Px grid={STAR} size={11} />
                    </div>
                )}

                {/* cover */}
                <div
                    className={isOpening ? 'cover-flip' : ''}
                    style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(145deg,#6D28D9,#4C1D95 60%,#3B0764)',
                        borderRadius: '4px 14px 14px 4px',
                        boxShadow: isOpening
                            ? 'none'
                            : '-4px 0 0 #3B0764, 6px 7px 28px rgba(109,40,217,.35)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 12, padding: 26,
                    }}
                >
                    <div style={{ position: 'absolute', top: 10, left: 10, opacity: .35 }}>
                        <Px grid={STAR} size={3} />
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, right: 10, opacity: .25 }}>
                        <Px grid={STAR} size={3} />
                    </div>
                    <Px grid={DRAGON} size={7} />
                    <div style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 20,
                        color: '#EDE9FE', textAlign: 'center',
                        letterSpacing: '1.5px', lineHeight: 1.45,
                    }}>
                        {brief.child_name || 'My'}'s<br />Storybook
                    </div>
                    <div style={{
                        width: 44, height: 1.5,
                        background: 'rgba(196,181,253,.4)', borderRadius: 2,
                    }} />
                    <div style={{
                        fontFamily: "'DM Sans',sans-serif", fontSize: 11,
                        color: '#A78BFA', fontWeight: 600,
                        letterSpacing: '.8px', textTransform: 'uppercase',
                    }}>
                        {brief.style} · ages {brief.age_group}
                    </div>
                    <div style={{
                        position: 'absolute', left: 14, top: 18, bottom: 18,
                        width: 1.5, background: 'rgba(167,139,250,.2)', borderRadius: 4,
                    }} />
                </div>
            </div>

            {!isOpening ? (
                <button
                    onClick={() => {
                        setIsOpening(true)
                        setTimeout(() => setBookOpen(true), 1500)
                    }}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 20,
                        letterSpacing: '1.5px',
                        background: 'linear-gradient(135deg,#6D28D9,#4C1D95)',
                        color: '#EDE9FE', border: 'none', borderRadius: 16,
                        padding: '13px 44px', cursor: 'pointer',
                        boxShadow: '0 6px 0 #3B0764, 0 14px 30px rgba(109,40,217,.28)',
                        transition: 'transform .1s, box-shadow .1s',
                    }}
                    onMouseDown={e => {
                        e.currentTarget.style.transform = 'translateY(5px)'
                        e.currentTarget.style.boxShadow = '0 1px 0 #3B0764'
                    }}
                    onMouseUp={e => {
                        e.currentTarget.style.transform = ''
                        e.currentTarget.style.boxShadow = '0 6px 0 #3B0764, 0 14px 30px rgba(109,40,217,.28)'
                    }}
                >
                    📖 Open Your Story
                </button>
            ) : (
                <div style={{
                    fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF',
                    fontSize: 15, fontStyle: 'italic',
                }}>
                    Opening the book...
                </div>
            )}
        </div>
    )

    /* ════════════════════════════════════════════════
       RENDER 3 — open book reader
    ════════════════════════════════════════════════ */
    if (bookOpen && spreads.length > 0) return (
        <div style={{ padding: '28px 12px 52px', animation: 'bookUp .5s ease both' }}>
            <style>{STYLES}</style>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                    fontFamily: "'Jersey 10',monospace", fontSize: 28,
                    color: '#6D28D9', letterSpacing: '1.5px', marginBottom: 2,
                }}>
                    {brief.child_name || 'My'}'s Storybook
                </div>
                <div style={{
                    fontFamily: "'DM Sans',sans-serif", color: '#9CA3AF',
                    fontSize: 14, fontWeight: 500,
                }}>
                    Page {idx + 1} of {spreads.length}
                </div>
            </div>

            {/* ── THE OPEN BOOK ── */}
            <div
                className="spread-wrap"
                style={{
                    display: 'flex', maxWidth: 900, margin: '0 auto', minHeight: 460,
                    boxShadow: '-5px 0 0 #C4B5FD, 10px 12px 44px rgba(109,40,217,.12)',
                }}
            >
                {/* animated content wrapper — only this slides, not the whole book shell */}
                <div
                    className={anim}
                    style={{ display: 'flex', width: '100%', minHeight: 460 }}
                >
                    {/* LEFT — illustration */}
                    <div style={{
                        flex: '0 0 44%', background: '#F5F3FF',
                        borderRight: '2px solid rgba(196,181,253,.28)',
                        padding: '32px 24px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 14,
                    }}>
                        <div style={{
                            fontFamily: "'Jersey 10',monospace", fontSize: 12,
                            color: '#A78BFA', letterSpacing: '2px', textTransform: 'uppercase',
                        }}>
                            Page {idx + 1}
                        </div>

                        {spread?.image ? (
                            <img
                                src={spread.image}
                                alt={`Illustration ${idx + 1}`}
                                style={{
                                    width: '100%', borderRadius: 12,
                                    boxShadow: '0 4px 20px rgba(109,40,217,.14)',
                                    display: 'block',
                                }}
                                onError={e => { e.target.style.display = 'none' }}
                            />
                        ) : spread?.loading ? (
                            <div className="skel" style={{ width: '100%', height: 200 }} />
                        ) : (
                            <div style={{
                                width: '100%', height: 200, borderRadius: 12,
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
                    <div className="book-lines" style={{
                        flex: 1, background: '#FFFDF7',
                        padding: '40px 32px 36px',
                        fontFamily: "'DM Sans',sans-serif",
                        fontSize: 17, lineHeight: 1.95,
                        color: '#374151', fontWeight: 500,
                        minHeight: 440, position: 'relative',
                    }}>
                        {spread?.text
                            ? <p style={{ margin: 0 }}>{spread.text}</p>
                            : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>The adventure continues...</span>
                        }

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
            </div>

            {/* ── NAVIGATION ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 14, marginTop: 24, maxWidth: 900, margin: '24px auto 0',
            }}>
                <button
                    onClick={() => flip('prev')}
                    disabled={idx === 0 || flipping}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                        background: idx === 0 ? '#F5F3FF' : 'white',
                        color: idx === 0 ? '#C4B5FD' : '#6D28D9',
                        border: `1.5px solid ${idx === 0 ? '#DDD6FE' : '#A78BFA'}`,
                        borderRadius: 12, padding: '10px 26px',
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: idx === 0 ? 'none' : '0 4px 0 #DDD6FE',
                        transition: 'all .15s',
                    }}
                >
                    ← Prev
                </button>

                {/* dot indicators */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {spreads.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => jumpTo(i)}
                            style={{
                                width: i === idx ? 20 : 8, height: 8,
                                borderRadius: 4, border: 'none', padding: 0,
                                cursor: i === idx ? 'default' : 'pointer',
                                background: i === idx ? '#6D28D9' : '#DDD6FE',
                                transition: 'all .2s',
                            }}
                        />
                    ))}
                </div>

                <button
                    onClick={() => flip('next')}
                    disabled={idx >= spreads.length - 1 || flipping}
                    style={{
                        fontFamily: "'Jersey 10',monospace", fontSize: 16, letterSpacing: '1px',
                        background: idx >= spreads.length - 1 ? '#F5F3FF' : '#6D28D9',
                        color: idx >= spreads.length - 1 ? '#C4B5FD' : '#EDE9FE',
                        border: 'none', borderRadius: 12, padding: '10px 26px',
                        cursor: idx >= spreads.length - 1 ? 'not-allowed' : 'pointer',
                        boxShadow: idx >= spreads.length - 1 ? 'none' : '0 5px 0 #3B0764',
                        transition: 'all .15s',
                    }}
                >
                    Next →
                </button>
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div style={{
                display: 'flex', gap: 12, justifyContent: 'center',
                marginTop: 28, flexWrap: 'wrap',
            }}>
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
        </div>
    )

    /* ── FALLBACK ── */
    return (
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
                Check your <code style={{ background: '#EDE9FE', padding: '2px 7px', borderRadius: 6, color: '#6D28D9', fontSize: 13 }}>VITE_BACKEND_URL</code> in your <code style={{ background: '#EDE9FE', padding: '2px 7px', borderRadius: 6, color: '#6D28D9', fontSize: 13 }}>.env</code> file.
            </div>
            <button
                onClick={onNewStory}
                style={{
                    fontFamily: "'Jersey 10',monospace", fontSize: 18, letterSpacing: '1px',
                    background: 'linear-gradient(135deg,#6D28D9,#4C1D95)',
                    color: '#EDE9FE', border: 'none', borderRadius: 14,
                    padding: '12px 36px', cursor: 'pointer',
                    boxShadow: '0 5px 0 #3B0764',
                }}
            >
                ← Back to Form
            </button>
        </div>
    )
}