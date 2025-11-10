"use client";

import Head from "next/head";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, ExternalLink, X, Search } from "lucide-react";

/**
 * Creator Reels • Biography Landing (Modern UI • Null-Safe • TS fix)
 * - Full screen reel-style viewer with neon glass UI
 * - One-click sponsor interstitial (once/session) then biography link
 * - TypeScript fix: MODELS is readonly; hooks accept ReadonlyArray<Model>
 * - Smooth wheel/touch navigation + basic keyboard support (↑/↓)
 */

// ----------------------------
// Types
// ----------------------------
interface Model {
  name: string;
  url: string;
  image: string; // 9:16 preferred
  tags?: string[];
}

// ----------------------------
// Data (Biography creators)
// ----------------------------
const RAW_MODELS: Partial<Model>[] = [
  {
    name: "Charvi Bhatt",
    url: "https://link-shortner-indol-nu.vercel.app/v0riwp",
    image: "https://i.ibb.co/xqwpVcCB/IMG-20251110-003150-720.jpg",
    tags: ["actress", "biography", "reels"],
  },
  {
    name: "Arushi Chatterjee",
    url: "https://link-shortner-indol-nu.vercel.app/gpvegn",
    image: "https://i.ibb.co/5WrM1PSf/photo-2025-11-10-08-09-45.jpg",
    tags: ["actress", "bio"],
  },
  {
    name: "Your Creator 3",
    url: "#",
    image: "https://placehold.co/720x1280?text=Creator+3%5Cn9:16",
    tags: ["new"],
  },
];

// Freeze to avoid accidental mutation; type as ReadonlyArray<Model>
const MODELS: ReadonlyArray<Model> = Object.freeze(
  (Array.isArray(RAW_MODELS) ? RAW_MODELS : [])
    .filter((m) => !!m && typeof m === "object")
    .map((m) => ({
      name: String(m?.name ?? "Unnamed"),
      url: String(m?.url ?? "#"),
      image: String(m?.image ?? "https://placehold.co/720x1280?text=Image+Missing%5Cn9:16"),
      tags: Array.isArray(m?.tags) ? [...(m.tags as string[])] : [],
    }))
);

// ----------------------------
// Mini runtime checks (log-only)
// ----------------------------
function useModelDataChecks(list: ReadonlyArray<Model>) {
  useEffect(() => {
    try {
      if (!Array.isArray(list)) {
        console.error("[TEST] MODELS must be an array");
        return;
      }
      if (list.length === 0) console.warn("[TEST] MODELS is empty – add at least one creator.");
      list.forEach((m, i) => {
        if (!m || typeof m !== "object") console.error(`[TEST] Model at index ${i} is not an object.`);
        if (!m.name) console.error(`[TEST] Model at index ${i} is missing name.`);
        if (!m.url) console.error(`[TEST] Model at index ${i} is missing url.`);
        if (!m.image) console.error(`[TEST] Model at index ${i} is missing image.`);
      });
    } catch (err) {
      console.warn("[TEST] Checks failed:", err);
    }
  }, [list]);
}

// ----------------------------
// Component
// ----------------------------
export default function Page() {
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [interstitialFor, setInterstitialFor] = useState<Model | null>(null);
  const wheelLock = useRef(false);
  const touchY = useRef<number | null>(null);

  const adUrl = (process?.env?.NEXT_PUBLIC_MONETAG_URL as string) || "https://otieu.com/4/9449507";
  const onceKey = "monetag_interstitial_once";

  useModelDataChecks(MODELS);

  // Filter (use spread to get a mutable copy when needed)
  const filtered: Model[] = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [...MODELS];
    const result = [...MODELS].filter((m) => [m.name, ...(m.tags || [])].some((t) => t.toLowerCase().includes(q)));
    return result.length > 0 ? result : [...MODELS];
  }, [query]);

  // Clamp index when filter changes
  useEffect(() => {
    if (filtered.length === 0) { if (index !== 0) setIndex(0); return; }
    if (index >= filtered.length || index < 0) setIndex(0);
  }, [filtered, index]);

  const cycleLen = Math.max(filtered.length, 1);
  const next = () => setIndex((i) => (i + 1) % cycleLen);
  const prev = () => setIndex((i) => (i - 1 + cycleLen) % cycleLen);

  // sessionStorage helpers
  const safeGetSession = (k: string): string | null => {
    try { return typeof window !== "undefined" ? window.sessionStorage.getItem(k) : null; } catch { return null; }
  };
  const safeSetSession = (k: string, v: string) => {
    try { if (typeof window !== "undefined") window.sessionStorage.setItem(k, v); } catch {}
  };

  const openLink = (m: Model | null | undefined) => {
    if (!m || !m.url) return;
    const shown = safeGetSession(onceKey) === "1";
    if (adUrl && !shown) { setInterstitialFor(m); return; }
    try { window.open(m.url, "_blank", "noopener,noreferrer"); } catch {}
  };

  const proceed = () => {
    const m = interstitialFor; setInterstitialFor(null);
    if (!m?.url) return;
    if (adUrl) { try { window.open(adUrl, "_blank", "noopener,noreferrer"); } catch {} }
    safeSetSession(onceKey, "1");
    try { window.open(m.url, "_blank", "noopener,noreferrer"); } catch {}
  };

  // Wheel / touch / keyboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onWheel = (e: WheelEvent) => {
      if (wheelLock.current) return; wheelLock.current = true; setTimeout(() => (wheelLock.current = false), 400);
      if (e.deltaY > 10) next(); else if (e.deltaY < -10) prev();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
    };
    window.addEventListener("wheel", onWheel, { passive: true } as AddEventListenerOptions);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("wheel", onWheel as any); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onTouchStart = (e: TouchEvent) => { touchY.current = e.touches?.[0]?.clientY ?? null; };
    const onTouchEnd = (e: TouchEvent) => {
      const y = e.changedTouches?.[0]?.clientY ?? null; if (touchY.current == null || y == null) return;
      const dy = y - touchY.current; if (Math.abs(dy) < 40) return; if (dy < 0) next(); else prev(); touchY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart as any, { passive: true } as AddEventListenerOptions);
    window.addEventListener("touchend", onTouchEnd as any, { passive: true } as AddEventListenerOptions);
    return () => { window.removeEventListener("touchstart", onTouchStart as any); window.removeEventListener("touchend", onTouchEnd as any); };
  }, []);

  const current: Model | null = filtered.length > 0 ? (filtered[index] ?? null) : null;

  // ----------------------------
  // Modern UI: neon gradient backdrop + glass controls
  // ----------------------------
  return (
    <div style={{height:"100vh",width:"100%",position:"relative",overflow:"hidden",background:"#0b0b12",color:"#fff"}}>
      <Head>
        <title>Creator Reels • Biographies</title>
        <meta name="description" content="Swipe through creator biographies in a slick, reel-style landing page." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Creator Reels • Biographies" />
        <meta property="og:description" content="Tap a card to open the full biography." />
        <meta property="og:type" content="website" />
      </Head>

      {/* Neon gradient blobs */}
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:-200,left:-200,width:600,height:600,filter:"blur(120px)",background:"conic-gradient(from 90deg, #7c3aed, #06b6d4, #22c55e)",opacity:.25,borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:-220,right:-220,width:600,height:600,filter:"blur(120px)",background:"conic-gradient(from 10deg, #a78bfa, #ec4899, #10b981)",opacity:.22,borderRadius:"50%"}}/>
      </div>

      {/* Top bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,padding:16,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",backdropFilter:"blur(8px)",padding:"8px 12px",borderRadius:16}}>
          <Search size={18}/>
          <input
            placeholder="Search name or tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{background:"transparent",border:"none",outline:"none",color:"#fff",width:"100%",fontSize:14}}
          />
        </div>
        <button onClick={prev} aria-label="Previous" style={{padding:10,borderRadius:999,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)"}}>
          <ChevronUp size={18}/>
        </button>
        <button onClick={next} aria-label="Next" style={{padding:10,borderRadius:999,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)"}}>
          <ChevronDown size={18}/>
        </button>
      </div>

      {/* Reel Canvas */}
      <div style={{height:"100%",width:"100%",position:"relative"}}>
        <AnimatePresence initial={false} mode="wait">
          {/* @ts-expect-error framer-motion type relax */}
          <motion.div
            key={current ? current.name : "empty"}
            style={{position:"absolute",inset:0}}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {current ? (
              <div style={{height:"100%",width:"100%",display:"grid",placeItems:"center"}}>
                <div style={{position:"relative",width:"min(92vw,440px)",aspectRatio:"9/16",borderRadius:28,overflow:"hidden",boxShadow:"0 10px 40px rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.12)"}}>
                  <img src={current.image} alt={current.name} style={{objectFit:"cover",width:"100%",height:"100%"}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.15), transparent)"}}/>

                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:18}}>
                    <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:700,letterSpacing:.2}}>{current.name}</div>
                        {current.tags && current.tags.length > 0 && (
                          <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                            {current.tags.slice(0,3).map((t) => (
                              <span key={t} style={{fontSize:11,padding:"3px 8px",borderRadius:999,background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.18)"}}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => openLink(current)} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:14,background:"#fff",color:"#000",fontWeight:600,border:"none"}}>
                        Open <ExternalLink size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{height:"100%",width:"100%",display:"grid",placeItems:"center",color:"rgba(255,255,255,.7)",padding:32,textAlign:"center"}}>
                No creators match your search.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Interstitial Monetag (once per session) */}
      <AnimatePresence>
        {interstitialFor ? (
          <motion.div
            className="modal-backdrop"
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              style={{padding:20,background:"rgba(17,17,20,.95)",border:"1px solid rgba(255,255,255,.12)",borderRadius:20,width:"min(92vw,380px)",position:"relative"}}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button onClick={() => setInterstitialFor(null)} aria-label="Close" style={{position:"absolute",top:10,right:10,padding:8,borderRadius:10,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)"}}>
                <X size={16}/>
              </button>
              <h3 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Support this site</h3>
              <p style={{color:"#c9c9d1",fontSize:14,marginBottom:12}}>We'll open our sponsor in a new tab, then continue to <span style={{fontWeight:600}}>{interstitialFor?.name ?? "the biography"}</span>.</p>
              <button onClick={proceed} style={{width:"100%",padding:"10px 14px",borderRadius:12,background:"#fff",color:"#000",fontWeight:700,border:"none"}}>Open Sponsor & Continue</button>
              <div style={{textAlign:"center",color:"#9ca3af",fontSize:11,marginTop:8}}>Opens 2 tabs: sponsor and biography.</div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
