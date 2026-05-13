"use client";
import { useEffect, useRef, useState } from "react";

// Configuration arrays for accordion dropdowns
const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", icon: "🖥️", desc: "YouTube/Desktop" },
  { value: "9:16", label: "9:16", icon: "📱", desc: "TikTok/Reels" },
  { value: "1:1", label: "1:1", icon: "⬜", desc: "Instagram" },
  { value: "4:3", label: "4:3", icon: "📺", desc: "Classic" },
  { value: "21:9", label: "21:9", icon: "🎬", desc: "Ultrawide" },
];

const FPS_OPTIONS = [
  { value: 24, label: "24fps", desc: "Cinematic" },
  { value: 30, label: "30fps", desc: "Standard" },
  { value: 60, label: "60fps", desc: "Ultra Smooth" },
];

const DURATIONS = [
  { value: 5, label: "5s", desc: "Quick" },
  { value: 10, label: "10s", desc: "Standard" },
  { value: 15, label: "15s", desc: "Detailed" },
  { value: 30, label: "30s", desc: "Extended" },
];

const STYLES = [
  "Neon", "Cinematic", "Anime", "Cyberpunk", "Realistic",
  "3D Pixar", "Dark Fantasy", "Sci-Fi", "Cartoon", "Horror",
  "Dreamy", "Vintage", "Photorealistic", "Watercolor", "Oil Painting"
];

const RESOLUTIONS = [
  { value: "480p", label: "480p", quality: "SD", desc: "Fastest" },
  { value: "720p", label: "720p", quality: "HD", desc: "Fast" },
  { value: "1080p", label: "1080p", quality: "Full HD", desc: "Standard" },
  { value: "2K", label: "2K", quality: "QHD", desc: "Good" },
  { value: "4K", label: "4K", quality: "Ultra HD", desc: "Slow" },
  { value: "8K", label: "8K", quality: "Ultra HD", desc: "Slowest" },
];

const CAMERA_MOTIONS = [
  "Static", "Pan Left", "Pan Right", "Zoom In", "Zoom Out",
  "Drone Shot", "Tracking Shot", "Cinematic Orbit", "Crane Shot", "Handheld"
];

const LIGHTING_STYLES = [
  "Natural Light", "Neon Glow", "Golden Hour", "Dark Moody",
  "Studio Light", "Sunset", "Blue Hour", "Dramatic Shadow", "Soft Diffused"
];

export default function Home() {
  // Prompt state
  const [prompt, setPrompt] = useState<string>("");
  
  // 🎤 Speech to Text states
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  
  // Video generation settings
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [fps, setFps] = useState<number>(24);
  const [duration, setDuration] = useState<number>(5);
  const [style, setStyle] = useState<string>("Neon");
  const [resolution, setResolution] = useState<string>("1080p");
  const [cameraMotion, setCameraMotion] = useState<string>("Static");
  const [lighting, setLighting] = useState<string>("Natural Light");
  
  // Advanced settings (optional)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  
  // Accordion states - which dropdown is open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  
  // Video History/Gallery State
  const [videoHistory, setVideoHistory] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<{ toastTimeout?: number }>({});

  // Load history from localStorage on page load
  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) {
      try {
        setVideoHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("videoHistory", JSON.stringify(videoHistory));
  }, [videoHistory]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timersRef.current.toastTimeout) window.clearTimeout(timersRef.current.toastTimeout);
    };
  }, []);

  function showToast(message: string) {
    if (timersRef.current.toastTimeout) window.clearTimeout(timersRef.current.toastTimeout);
    setToast({ open: true, message });
    timersRef.current.toastTimeout = window.setTimeout(() => setToast({ open: false, message: "" }), 2600);
  }

  function regenerateSeed() {
    setSeed(Math.floor(Math.random() * 1000000));
  }

  function toggleDropdown(dropdownName: string) {
    if (openDropdown === dropdownName) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(dropdownName);
    }
  }

  // 🎤 Speech to Text - Start Listening
  function startListening() {
  // Check browser support
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast("❌ Speech recognition not supported. Try Chrome.");
    return;
  }
  
  // Stop any existing recognition
  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch(e) {}
    recognitionRef.current = null;
  }
  
  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognitionRef.current = recognition;
  
  // ✅ FIXED for longer sentences
  recognition.continuous = true;        // Keep listening
  recognition.interimResults = false;   // Only final results
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  let finalTranscript = '';
  let timeoutId: any = null;
  
  recognition.onstart = () => {
    setIsListening(true);
    finalTranscript = '';
    showToast("🎤 Speak now... (automatic stop after 2 seconds silence)");
    setPrompt(prev => prev ? prev + " [🎤]" : "[🎤]");
  };
  
  recognition.onresult = (event: any) => {
    // Clear previous timeout
    if (timeoutId) clearTimeout(timeoutId);
    
    // Collect all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
    
    // Show live progress
    if (finalTranscript.trim()) {
      setPrompt(prev => {
        let cleanPrev = prev.replace(/ \[🎤\]$/, '');
        return cleanPrev ? `${cleanPrev} ${finalTranscript.trim()}` : finalTranscript.trim();
      });
    }
    
    // Auto-stop after 2 seconds of silence
    timeoutId = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 2000);
  };
  
  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      showToast("🎤 No speech detected. Click mic and speak again.");
    } else if (event.error === 'not-allowed') {
      showToast("❌ Microphone permission denied.");
    } else {
      showToast(`❌ Error: ${event.error}`);
    }
    setIsListening(false);
    setPrompt(prev => prev.replace(/ \[🎤\]$/, ''));
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  recognition.onend = () => {
    setIsListening(false);
    recognitionRef.current = null;
    setPrompt(prev => prev.replace(/ \[🎤\]$/, ''));
    if (timeoutId) clearTimeout(timeoutId);
    
    if (finalTranscript.trim()) {
      showToast(`✅ "${finalTranscript.trim()}" added!`);
    }
  };
  
  recognition.start();
}

  // Stop listening
  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }

  async function handleGenerate() {
    if (loading) return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      showToast("Please enter a prompt to generate a video.");
      return;
    }
  
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
  
    setLoading(true);
    setResult("");
    setVideoUrl("");
  
    try {
      const payload = {
        prompt: trimmed,
        aspectRatio,
        fps,
        duration,
        style,
        resolution,
        cameraMotion,
        lighting,
        ...(negativePrompt && { negativePrompt }),
        ...(seed && { seed }),
      };
  
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
  
      const contentType = res.headers.get("content-type") ?? "";
      const responsePayload = contentType.includes("application/json") ? await res.json() : await res.text();
  
      if (!res.ok) {
        const message = typeof responsePayload === "string"
          ? responsePayload
          : responsePayload?.error || responsePayload?.message || `Request failed (${res.status})`;
        throw new Error(message);
      }
  
      const output = responsePayload?.video || responsePayload?.videoUrl || responsePayload?.url || responsePayload?.output;
  
      if (!output) {
        throw new Error("No video returned from AI");
      }
  
      let finalUrl = "";
      if (Array.isArray(output)) {
        finalUrl = output[0];
        setVideoUrl(output[0]);
      } else {
        finalUrl = output;
        setVideoUrl(output);
      }
  
      // Save to history (avoid duplicates, keep last 12)
      setVideoHistory(prev => {
        const newHistory = [finalUrl, ...prev.filter(v => v !== finalUrl)];
        return newHistory.slice(0, 12);
      });
  
      setLoading(false);
      showToast("Success! Video generated.");
  
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Generation failed.";
      setResult(message);
      setLoading(false);
      showToast("Generation failed. Please try again.");
    }
  }

  // Get display text for main buttons
  const getAspectDisplay = () => {
    const ar = ASPECT_RATIOS.find(a => a.value === aspectRatio);
    return ar ? ar.label : aspectRatio;
  };

  const getFpsDisplay = () => {
    const f = FPS_OPTIONS.find(o => o.value === fps);
    return f ? f.label : `${fps}fps`;
  };

  const getDurationDisplay = () => {
    const d = DURATIONS.find(o => o.value === duration);
    return d ? d.label : `${duration}s`;
  };

  // Handle smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-fuchsia-500/30 selection:text-white">
      {/* Toast */}
      <div
        className={[
          "fixed left-1/2 top-5 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300",
          toast.open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0 pointer-events-none",
        ].join(" ")}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_120px_-70px_rgba(168,85,247,0.9)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
            <div className="text-sm text-white/85">{toast.message}</div>
          </div>
        </div>
      </div>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(168,85,247,0.18),transparent_55%),radial-gradient(900px_500px_at_85%_25%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_500px_at_65%_85%,rgba(236,72,153,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.85))]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="absolute left-1/2 top-[-200px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/25 via-violet-500/25 to-sky-500/25 blur-3xl animate-[float_10s_ease-in-out_infinite]" />
        <div className="absolute -left-24 top-[40%] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-violet-500/15 via-sky-500/10 to-fuchsia-500/15 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate3d(-50%, 0, 0) scale(1); opacity: 0.9; }
            50% { transform: translate3d(-50%, 18px, 0) scale(1.06); opacity: 1; }
          }
          @keyframes indeterminate {
            0% { transform: translateX(-70%); opacity: 0.7; }
            50% { opacity: 1; }
            100% { transform: translateX(130%); opacity: 0.7; }
          }
        `}</style>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#" className="group inline-flex items-center gap-2">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_-22px_rgba(168,85,247,0.65)]">
              <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/20 to-sky-500/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative text-sm font-semibold tracking-tight text-white">V</span>
            </span>
            <span className="text-sm font-semibold tracking-wide text-white">
              Vortex<span className="text-white/60">Video</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a className="transition-colors hover:text-white" href="/">Text → Video</a>
            <a className="transition-colors hover:text-white" href="/ocr">Image → Text</a>
            <a className="transition-colors hover:text-white" href="/video-to-text">Video → Text</a>
            <button onClick={() => scrollToSection("features")} className="transition-colors hover:text-white cursor-pointer">Features</button>
            <button onClick={() => scrollToSection("pricing")} className="transition-colors hover:text-white cursor-pointer">Pricing</button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => showToast("🔐 Login feature coming soon!")} className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/85 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition hover:bg-white/[0.06] md:inline-flex cursor-pointer">Login</button>
            <button onClick={() => scrollToSection("prompt")} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_50px_-24px_rgba(168,85,247,0.95)] transition hover:brightness-110 active:brightness-95 cursor-pointer">Generate →</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            {/* Left Column - Prompt & Controls */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(236,72,153,0.7)]" />
                Futuristic AI video generation platform
              </div>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Create{" "}
                <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                  AI Videos
                </span>{" "}
                Instantly
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
                Turn text prompts into cinematic clips in seconds. Generate product shots, ads, social shorts, and concept videos
                with premium motion, lighting, and style — powered by next‑gen diffusion and video transformers.
              </p>

              {/* Main Prompt Box */}
              <div id="prompt" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_-50px_rgba(59,130,246,0.55)] backdrop-blur-xl">
                
                {/* 🎤 Updated Header with Mic Button */}
                <div className="flex items-center justify-between gap-4 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-white/70">Prompt</div>
                    
                    {/* MIC BUTTON */}
                    {isListening ? (
                      <button
                        onClick={stopListening}
                        className="px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 bg-red-500/30 text-red-400 animate-pulse border border-red-500/40"
                        title="Stop listening"
                      >
                        🔴 Stop
                      </button>
                    ) : (
                      <button
                        onClick={startListening}
                        className="px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] border border-white/10"
                        title="Click and speak to write prompt"
                      >
                        🎤 Voice
                      </button>
                    )}
                  </div>
                  
                  <div className="hidden items-center gap-2 text-xs text-white/50 sm:flex">
                    <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">Text → Video</span>
                    <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">{resolution} Export</span>
                  </div>
                </div>

                <textarea
                  name="prompt"
                  rows={3}
                  placeholder="Describe the video you want to generate... (or click 🎤 mic button and speak)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/90 placeholder:text-white/35 shadow-inner outline-none ring-0 transition focus:border-fuchsia-500/40 focus:shadow-[0_0_0_1px_rgba(236,72,153,0.25),0_0_80px_-40px_rgba(168,85,247,0.9)]"
                />

                {/* ACCORDION BUTTONS */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {/* Aspect Ratio Button */}
                  <div className="relative">
                    <button onClick={() => toggleDropdown("aspect")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${openDropdown === "aspect" ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 text-white" : "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"}`}>
                      <span>📐</span> {getAspectDisplay()}
                      <span className={`text-xs transition-transform ${openDropdown === "aspect" ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openDropdown === "aspect" && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[160px] shadow-2xl">
                        {ASPECT_RATIOS.map((ar) => (
                          <button key={ar.value} onClick={() => { setAspectRatio(ar.value); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${aspectRatio === ar.value ? "bg-fuchsia-500/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
                            <span>{ar.icon}</span><span>{ar.label}</span><span className="text-[10px] text-white/40 ml-auto">{ar.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FPS Button */}
                  <div className="relative">
                    <button onClick={() => toggleDropdown("fps")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${openDropdown === "fps" ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 text-white" : "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"}`}>
                      <span>🎬</span> {getFpsDisplay()}
                      <span className={`text-xs transition-transform ${openDropdown === "fps" ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openDropdown === "fps" && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[140px] shadow-2xl">
                        {FPS_OPTIONS.map((f) => (
                          <button key={f.value} onClick={() => { setFps(f.value); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${fps === f.value ? "bg-fuchsia-500/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
                            <span>{f.label}</span><span className="text-[10px] text-white/40">{f.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Duration Button */}
                  <div className="relative">
                    <button onClick={() => toggleDropdown("duration")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${openDropdown === "duration" ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 text-white" : "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"}`}>
                      <span>⏱️</span> {getDurationDisplay()}
                      <span className={`text-xs transition-transform ${openDropdown === "duration" ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openDropdown === "duration" && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[130px] shadow-2xl">
                        {DURATIONS.map((d) => (
                          <button key={d.value} onClick={() => { setDuration(d.value); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${duration === d.value ? "bg-fuchsia-500/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
                            <span>{d.label}</span><span className="text-[10px] text-white/40">{d.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Style Button */}
                  <div className="relative">
                    <button onClick={() => toggleDropdown("style")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${openDropdown === "style" ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 text-white" : "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"}`}>
                      <span>🎨</span> Style: {style}
                      <span className={`text-xs transition-transform ${openDropdown === "style" ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openDropdown === "style" && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[160px] max-h-64 overflow-y-auto shadow-2xl">
                        {STYLES.map((s) => (
                          <button key={s} onClick={() => { setStyle(s); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${style === s ? "bg-fuchsia-500/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Accordion */}
                <div className="mt-4">
                  <div className="mb-1.5 text-xs font-medium text-white/60">📺 Resolution</div>
                  <div className="relative">
                    <button onClick={() => toggleDropdown("resolution")} className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${openDropdown === "resolution" ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 text-white" : "border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"}`}>
                      <span className="flex items-center gap-2"><span>📺</span> {resolution}</span>
                      <span className={`text-xs transition-transform ${openDropdown === "resolution" ? "rotate-180" : ""}`}>▼</span>
                    </button>
                    {openDropdown === "resolution" && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[200px] shadow-2xl">
                        {RESOLUTIONS.map((res) => (
                          <button key={res.value} onClick={() => { setResolution(res.value); setOpenDropdown(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${resolution === res.value ? "bg-fuchsia-500/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
                            <span>{res.label}</span><span className="text-[10px] text-white/40">{res.quality} • {res.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Motion */}
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-medium text-white/60">🎥 Camera Motion</div>
                  <select value={cameraMotion} onChange={(e) => setCameraMotion(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500/40" style={{ backgroundColor: "#000000", color: "white" }}>
                    {CAMERA_MOTIONS.map((cm) => (
                      <option key={cm} value={cm} className="bg-black text-white" style={{ backgroundColor: "#000000", color: "white" }}>{cm}</option>
                    ))}
                  </select>
                </div>

                {/* Lighting */}
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-medium text-white/60">💡 Lighting</div>
                  <select value={lighting} onChange={(e) => setLighting(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500/40" style={{ backgroundColor: "#000000", color: "white" }}>
                    {LIGHTING_STYLES.map((l) => (
                      <option key={l} value={l} className="bg-black text-white" style={{ backgroundColor: "#000000", color: "white" }}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Advanced Settings Toggle */}
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.06]">
                  <span>⚙️ Advanced Settings</span>
                  <span>{showAdvanced ? "▲" : "▼"}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-white/60">🚫 Negative Prompt</div>
                      <input type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="blurry, low quality, distorted face, bad anatomy" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-fuchsia-500/40" />
                      <p className="mt-1 text-[10px] text-white/40">Things you DON'T want in the video</p>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-white/60">🔢 Seed</span>
                        <button onClick={regenerateSeed} className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/50 hover:bg-white/[0.05]">Random</button>
                      </div>
                      <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/70 outline-none focus:border-fuchsia-500/40" />
                      <p className="mt-1 text-[10px] text-white/40">Same seed + same prompt = similar results</p>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                <div className={["mt-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.03] transition-all duration-300", loading ? "h-2 opacity-100" : "h-0 opacity-0"].join(" ")} aria-hidden={!loading}>
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-sky-400 animate-[indeterminate_1.2s_ease-in-out_infinite]" />
                </div>

                {/* Generate Button */}
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={handleGenerate} disabled={loading} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(236,72,153,0.95)] transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70">
                    {loading ? (
                      <>
                        <span className="relative inline-flex h-4 w-4">
                          <span className="absolute inset-0 rounded-full border border-white/30" />
                          <span className="absolute inset-0 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
                        </span>
                        Generating...
                      </>
                    ) : (
                      <>Generate Video <span className="translate-x-0 text-white/85 transition-transform group-hover:translate-x-0.5">→</span></>
                    )}
                  </button>
                </div>

                {loading && (
                  <div className="mt-4 text-sm text-purple-300 animate-pulse">
                    🧠 AI is generating your video with {style} style, {cameraMotion} camera...
                  </div>
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/55">
                <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(59,130,246,0.65)]" />Lightning-fast rendering</div>
                <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_18px_rgba(168,85,247,0.65)]" />Commercial-ready outputs</div>
                <div className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_18px_rgba(236,72,153,0.65)]" />{resolution} quality</div>
              </div>
            </div>

            {/* Right Column - Video Preview */}
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/15 to-sky-500/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_60px_160px_-120px_rgba(168,85,247,0.9)] backdrop-blur-xl">
                <div className="absolute inset-0 bg-[radial-gradient(500px_250px_at_30%_20%,rgba(236,72,153,0.14),transparent_60%),radial-gradient(500px_250px_at_70%_70%,rgba(59,130,246,0.14),transparent_60%)]" />
                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.7)]" />
                      Live Preview
                    </div>
                    <div className="flex gap-2 text-xs text-white/45">
                      <span>{aspectRatio}</span><span>•</span><span>{fps}fps</span><span>•</span><span>{duration}s</span>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/10 bg-black">
                      {videoUrl ? (
                        <video src={videoUrl} controls autoPlay className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-blue-900/30 to-pink-900/30 animate-pulse" />
                          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:24px_24px]" />
                          <div className="absolute inset-0 flex items-center justify-center"><div className="text-white text-5xl">▶</div></div>
                          <div className="absolute bottom-3 left-3 text-xs text-white/70 bg-black/40 px-2 py-1 rounded">{style} • {cameraMotion}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resolution, Lighting, Camera Info */}
                  <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-white/60">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-white/45">Resolution</div>
                      <div className="mt-1 font-medium text-white/85">{resolution}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-white/45">Lighting</div>
                      <div className="mt-1 font-medium text-white/85 truncate">{lighting}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-white/45">Camera</div>
                      <div className="mt-1 font-medium text-white/85 truncate">{cameraMotion}</div>
                    </div>
                  </div>

                  {/* Download & Copy Buttons */}
                  {videoUrl && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <a href={videoUrl} download={`vortex_video_${Date.now()}.mp4`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:brightness-110 transition shadow-lg">
                        ⬇️ Download Video
                      </a>
                      <button onClick={() => { navigator.clipboard.writeText(videoUrl); showToast("📋 Video link copied!"); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium hover:brightness-110 transition shadow-lg">
                        🔗 Copy Link
                      </button>
                    </div>
                  )}

                  {/* VIDEO HISTORY GALLERY */}
                  {videoHistory.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                          <span>🎬</span> Recent Videos
                          <span className="text-xs text-white/40">({videoHistory.length})</span>
                        </h3>
                        <button
                          onClick={() => {
                            setVideoHistory([]);
                            localStorage.removeItem("videoHistory");
                            showToast("🗑️ History cleared!");
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {videoHistory.slice(0, 6).map((url, idx) => (
                          <div
                            key={idx}
                            onClick={() => { setVideoUrl(url); showToast("📼 Loading video from history..."); }}
                            className="relative aspect-video rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-fuchsia-500 transition-all group"
                          >
                            <video src={url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <span className="text-2xl">▶️</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {videoHistory.length > 6 && (
                        <p className="text-[10px] text-white/40 text-center mt-2">
                          +{videoHistory.length - 6} more videos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trust row */}
          <div className="mt-14 border-t border-white/5 pt-10 sm:mt-16">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <p className="text-sm text-white/55">Trusted by creators and teams worldwide to ship premium video content.</p>
              <div className="flex flex-wrap items-center gap-3">
                {["Studio", "Agency", "Commerce", "Creator", "Enterprise"].map((t) => (
                  <div key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/60 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_80px_220px_-160px_rgba(168,85,247,0.95)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for speed and quality</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">Premium generation modes, fast rendering, and export-ready outputs — designed for modern teams.</p></div>
            <div className="flex items-center gap-2 text-xs text-white/55"><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Secure</span><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Scalable</span><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Global</span></div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            
            {/* Text to Video - Click to Home */}
            <a href="/" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-white/15 hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/25 via-violet-500/20 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_18px_60px_-40px_rgba(59,130,246,0.8)]">✦</div>
              <div><div className="text-base font-semibold text-white group-hover:text-fuchsia-400 transition">Text to Video</div><div className="mt-1 text-sm leading-relaxed text-white/65">Write a prompt. Get a cinematic clip with motion, lighting, and camera moves.</div></div></div>
            </a>

            {/* Image to Text - Click to OCR Page */}
            <a href="/ocr" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-white/15 hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/22 via-violet-500/18 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_18px_60px_-40px_rgba(59,130,246,0.8)]">✦</div>
              <div><div className="text-base font-semibold text-white group-hover:text-fuchsia-400 transition">Image to Text</div><div className="mt-1 text-sm leading-relaxed text-white/65">Upload any image and extract text instantly with high accuracy OCR.</div></div></div>
            </a>

            {/* Video to Text - Click to Video-to-Text Page */}
            <a href="/video-to-text" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-white/15 hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/25 via-fuchsia-500/18 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_18px_60px_-40px_rgba(59,130,246,0.8)]">✦</div>
              <div><div className="text-base font-semibold text-white group-hover:text-fuchsia-400 transition">Video to Text</div><div className="mt-1 text-sm leading-relaxed text-white/65">Transcribe speech from any video or audio file in seconds.</div></div></div>
            </a>

            {/* Multi-Language Translation - Click to Video-to-Text Page (translation wahan hai) */}
            <a href="/video-to-text" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-white/15 hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/14 via-sky-500/16 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_18px_60px_-40px_rgba(59,130,246,0.8)]">✦</div>
              <div><div className="text-base font-semibold text-white group-hover:text-fuchsia-400 transition">Multi-Language Translation</div><div className="mt-1 text-sm leading-relaxed text-white/65">Translate transcripts to 15+ languages including Roman Urdu/Hindi.</div></div></div>
            </a>
          </div>
          
          {/* Pricing Section */}
          <div id="pricing" className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><div className="text-sm font-semibold text-white">Ready to generate?</div><div className="mt-1 text-sm text-white/65">Start with a free trial, then scale up for teams and high-volume rendering.</div></div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => { const el = document.getElementById("prompt"); el?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] cursor-pointer">Try free</button>
                <button onClick={() => showToast("💰 Pricing plans coming soon! Stay tuned.")} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_70px_-40px_rgba(168,85,247,0.95)] transition hover:brightness-110 active:brightness-95 cursor-pointer">See pricing</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div><div className="inline-flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"><span className="text-sm font-semibold">V</span></span><span className="text-sm font-semibold tracking-wide text-white">Vortex<span className="text-white/60">Video</span></span></div><p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">Premium AI video generation for modern creators. Futuristic design, smooth UX, and export-ready quality.</p></div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div><div className="text-xs font-semibold uppercase tracking-wider text-white/60">Product</div><div className="mt-3 space-y-2 text-sm text-white/60"><button onClick={() => scrollToSection("features")} className="block transition-colors hover:text-white cursor-pointer">Features</button><button onClick={() => scrollToSection("pricing")} className="block transition-colors hover:text-white cursor-pointer">Pricing</button><button onClick={() => scrollToSection("prompt")} className="block transition-colors hover:text-white cursor-pointer">Showcase</button></div></div>
              <div><div className="text-xs font-semibold uppercase tracking-wider text-white/60">Company</div><div className="mt-3 space-y-2 text-sm text-white/60"><button onClick={() => showToast("About page coming soon!")} className="block transition-colors hover:text-white cursor-pointer">About</button><button onClick={() => showToast("Careers page coming soon!")} className="block transition-colors hover:text-white cursor-pointer">Careers</button><button onClick={() => showToast("Contact page coming soon!")} className="block transition-colors hover:text-white cursor-pointer">Contact</button></div></div>
              <div><div className="text-xs font-semibold uppercase tracking-wider text-white/60">Legal</div><div className="mt-3 space-y-2 text-sm text-white/60"><button onClick={() => showToast("Privacy policy coming soon!")} className="block transition-colors hover:text-white cursor-pointer">Privacy</button><button onClick={() => showToast("Terms of service coming soon!")} className="block transition-colors hover:text-white cursor-pointer">Terms</button><button onClick={() => showToast("Security info coming soon!")} className="block transition-colors hover:text-white cursor-pointer">Security</button></div></div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/45">© {new Date().getFullYear()} VortexVideo. All rights reserved.</div>
            <div className="flex items-center gap-3 text-xs text-white/45"><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Status: <span className="text-emerald-300">Operational</span></span><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Region: <span className="text-white/70">Global</span></span></div>
          </div>
        </div>
      </footer>
    </main>
  );
}