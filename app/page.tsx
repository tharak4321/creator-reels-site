"use client";

import Head from "next/head";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, ExternalLink, X, Search } from "lucide-react";

/**
 * Creator Reels • Biography Landing (Hardened & Null-Safe)
 * - Full-screen 9:16 cards (reels-style)
 * - Tap CTA opens an external biography link
 * - Monetag Direct Link interstitial (once per session) before biography
 * - EXTRA NULL GUARDS: never read from possibly-null objects
 * - ErrorBoundary to catch unexpected runtime issues and render a safe fallback
 * - Mini runtime tests that validate data on mount (without breaking UI)
 *
 * HOW TO USE
 * 1) Put your Monetag link in .env: NEXT_PUBLIC_MONETAG_URL="https://otieu.com/4/9449507"
 *    (Hardcoded fallback remains below.)
 * 2) Edit the RAW_MODELS array with your creators.
 * 3) Save as `app/page.tsx` (App Router) or `pages/index.tsx` (Pages Router).
 */

interface Model {
  name: string;
  url: string;
  image: string;
  tags?: string[];
}

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

const MODELS = Object.freeze(
  (Array.isArray(RAW_MODELS) ? RAW_MODELS : [])
    .filter((m) => !!m && typeof m === "object")
    .map((m) => ({
      name: String(m?.name ?? "Unnamed"),
      url: String(m?.url ?? "#"),
      image: String(m?.image ?? "https://placehold.co/720x1280?text=Image+Missing%5Cn9:16"),
      tags: Array.isArray(m?.tags) ? [...m.tags] : []
    }))
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; err?: any }>{ constructor(props:{children:React.ReactNode}){super(props);this.state={hasError:false};} static getDerivedStateFromError(err:any){return{hasError:true,err};} componentDidCatch(e:any,i:any){console.error(e,i);} render(){return this.state.hasError?(<div style={{color:"#fff",padding:"20px"}}>Something went wrong</div>):this.props.children;}}

function useModelDataChecks(list: Model[]) {
  useEffect(() => {
    if (!Array.isArray(list)) console.error("MODELS must be array");
  }, [list]);
}

export default function Page() {
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [interstitialFor, setInterstitialFor] = useState<Model | null>(null);
  const wheelLock = useRef(false);
  const touchY = useRef<number | null>(null);

  const adUrl = (process?.env?.NEXT_PUBLIC_MONETAG_URL as string) || "https://otieu.com/4/9449507";
  const onceKey = "monetag_interstitial_once";

  useModelDataChecks(MODELS);

  const filtered: Model[] = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return MODELS;
    const result = MODELS.filter((m) => [m.name, ...(m.tags || [])].some((t) => t.toLowerCase().includes(q)));
    return result.length > 0 ? result : MODELS;
  }, [query]);

  useEffect(() => {
    if (index >= filtered.length) setIndex(0);
  }, [filtered, index]);

  const cycleLen = Math.max(filtered.length, 1);
  const next = () => setIndex((i) => (i + 1) % cycleLen);
  const prev = () => setIndex((i) => (i - 1 + cycleLen) % cycleLen);

  const safeGetSession = (k: string): string | null => {
    try { return typeof window !== "undefined" ? window.sessionStorage.getItem(k) : null; } catch { return null; }
  };
  const safeSetSession = (k: string, v: string) => {
    try { if (typeof window !== "undefined") window.sessionStorage.setItem(k, v); } catch {}
  };

  const openLink = (m: Model | null | undefined) => {
    if (!m || !m.url) return;
    const shown = safeGetSession(onceKey) === "1";
    if (adUrl && !shown) {
      setInterstitialFor(m);
      return;
    }
    window.open(m.url, "_blank", "noopener,noreferrer");
  };

  const proceed = () => {
    const m = interstitialFor;
    setInterstitialFor(null);
    if (adUrl) window.open(adUrl, "_blank", "noopener,noreferrer");
    safeSetSession(onceKey, "1");
    if (m?.url) window.open(m.url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onWheel = (e: WheelEvent) => {
      if (wheelLock.current) return;
      wheelLock.current = true;
      setTimeout(() => (wheelLock.current = false), 400);
      if (e.deltaY > 10) next();
      else if (e.deltaY < -10) prev();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onTouchStart = (e: TouchEvent) => { touchY.current = e.touches?.[0]?.clientY ?? null; };
    const onTouchEnd = (e: TouchEvent) => {
      const y = e.changedTouches?.[0]?.clientY ?? null;
      if (touchY.current == null || y == null) return;
      const dy = y - touchY.current;
      if (Math.abs(dy) > 40) { if (dy < 0) next(); else prev(); }
      touchY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const current = filtered[index] ?? null;

  return (
    <ErrorBoundary>
      <div style={{height:"100vh",width:"100%",position:"relative",overflow:"hidden",background:"#000",color:"#fff"}}>
        {current ? (
          <div style={{height:"100%",width:"100%",position:"relative"}}>
            <img src={current.image} alt={current.name} style={{objectFit:"cover",width:"100%",height:"100%"}} />
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px"}}>
              <h2 style={{fontSize:"22px",marginBottom:"10px"}}>{current.name}</h2>
              <button onClick={() => openLink(current)} style={{background:"#fff",color:"#000",padding:"10px 16px",borderRadius:"8px"}}>
                Open Biography
              </button>
            </div>
          </div>
        ) : "No creators"}

        {interstitialFor ? (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#111",padding:"20px",borderRadius:"12px",maxWidth:"300px",width:"90%"}}>
              <p>Opening sponsor, then {interstitialFor.name}</p>
              <button onClick={proceed} style={{marginTop:"12px",background:"#fff",color:"#000",padding:"8px 12px",borderRadius:"8px"}}>
                Continue
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
