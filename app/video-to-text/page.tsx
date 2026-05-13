"use client";
import { useState } from "react";

export default function VideoToTextPage() {
  const [activeTab, setActiveTab] = useState<"file" | "link">("file");
  const [video, setVideo] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  
  // Translation states
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    { code: "en", name: "English" },
    { code: "roman-ur", name: "Roman Urdu (Jesy likh rahe ho)" },
    { code: "roman-hi", name: "Roman Hindi" },
    { code: "ur", name: "Urdu (اردو)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese (中文)" },
    { code: "ar", name: "Arabic (العربية)" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "ko", name: "Korean (한국어)" },
    { code: "tr", name: "Turkish" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "nl", name: "Dutch" },
  ];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleFileTranscribe() {
    if (!video) {
      showToast("Please select a video first");
      return;
    }

    setLoading(true);
    setTranscript("");
    setTranslatedText("");
    setAudioUrl("");

    const formData = new FormData();
    formData.append("audio", video);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        setTranscript(data.text);
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        showToast("✅ Transcription complete!");
      } else {
        showToast("❌ Failed: " + (data.error || "Try again"));
      }
    } catch (error) {
      showToast("❌ Error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkTranscribe() {
    if (!linkUrl.trim()) {
      showToast("Please enter a valid link");
      return;
    }

    setLoading(true);
    setTranscript("");
    setTranslatedText("");
    setAudioUrl("");

    try {
      const response = await fetch("/api/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTranscript(data.text);
        if (data.audioUrl) setAudioUrl(data.audioUrl);
        showToast("✅ Text extracted from link!");
      } else {
        showToast("❌ Failed: " + (data.error || "Try again"));
      }
    } catch (error) {
      showToast("❌ Error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function translateText() {
    if (!transcript) {
      showToast("No text to translate");
      return;
    }
    
    setIsTranslating(true);
    setTranslatedText(""); // ✅ Clear previous translation before new request
    
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: transcript, 
          targetLang: targetLanguage,
          script: targetLanguage.startsWith("roman") ? "roman" : "native"
        }),
      });
      const data = await response.json();
      if (data.success) {
        setTranslatedText(data.translatedText);
        showToast(`✅ Translated to ${languages.find(l => l.code === targetLanguage)?.name}`);
      } else {
        showToast("❌ Translation failed");
      }
    } catch (error) {
      showToast("❌ Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-white/10 rounded-xl px-4 py-2 text-sm">
          {toast}
        </div>
      )}

      {/* Navbar */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold">Vortex<span className="text-white/50">Video</span></a>
          <nav className="hidden md:flex gap-6 text-sm">
            <a href="/" className="hover:text-fuchsia-400">Text → Video</a>
            <a href="/ocr" className="hover:text-fuchsia-400">Image → Text</a>
            <a href="/video-to-text" className="text-fuchsia-400">Video → Text</a>
          </nav>
          <a href="/" className="bg-gradient-to-r from-fuchsia-600 to-sky-600 px-4 py-2 rounded-lg text-sm">Generate →</a>
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Left Column */}
          <div>
            <h1 className="text-4xl font-bold mb-4">
              Extract{" "}
              <span className="bg-gradient-to-r from-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
                Text
              </span>
            </h1>
            <p className="text-white/60 mb-6">
              Upload a video/audio file OR paste any link from YouTube, TikTok, Instagram, Facebook.
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab("file")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "file" 
                    ? "bg-fuchsia-500/20 text-fuchsia-400 border-b-2 border-fuchsia-400" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                📁 Upload File
              </button>
              <button
                onClick={() => setActiveTab("link")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "link" 
                    ? "bg-fuchsia-500/20 text-fuchsia-400 border-b-2 border-fuchsia-400" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                🔗 Paste Link
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {activeTab === "file" && (
              <div>
                <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-fuchsia-500/50 transition cursor-pointer">
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setVideo(e.target.files?.[0] || null)}
                    className="hidden"
                    id="videoUpload"
                  />
                  <label htmlFor="videoUpload" className="cursor-pointer block">
                    {video ? (
                      <>
                        <div className="text-3xl mb-2">🎥</div>
                        <p className="text-sm">{video.name}</p>
                        <p className="text-xs text-white/40 mt-1">Click to change</p>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl mb-3">📹</div>
                        <p className="text-white/70">Click to upload video or audio</p>
                        <p className="text-xs text-white/40 mt-1">MP4, MOV, WebM, MP3, WAV</p>
                      </>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleFileTranscribe}
                  disabled={!video || loading}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-sky-600 font-semibold disabled:opacity-50 hover:brightness-110 transition"
                >
                  {loading ? "🎙️ Transcribing..." : "📝 Extract Text from File"}
                </button>
              </div>
            )}

            {/* Tab 2: Link Paste */}
            {activeTab === "link" && (
              <div>
                <div className="border-2 border-white/20 rounded-2xl p-6">
                  <input
                    type="url"
                    placeholder="Paste link here... (YouTube, TikTok, Instagram, Facebook)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-fuchsia-500/50"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    Supported: YouTube, TikTok, Instagram, Facebook
                  </p>
                </div>

                <button
                  onClick={handleLinkTranscribe}
                  disabled={!linkUrl.trim() || loading}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-sky-600 font-semibold disabled:opacity-50 hover:brightness-110 transition"
                >
                  {loading ? "🎙️ Processing Link..." : "🔗 Extract Text from Link"}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Output */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            
            {/* Audio Controls */}
            {audioUrl && (
              <div className="flex gap-3 mb-4 p-3 bg-white/5 rounded-xl">
                <audio controls className="h-10 flex-1">
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
                <a
                  href={audioUrl}
                  download="audio.mp3"
                  className="px-3 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm"
                >
                  ⬇️ Download
                </a>
              </div>
            )}

            {/* ===== TRANSLATION SECTION - ONLY SHOWS WHEN TRANSCRIPT EXISTS ===== */}
            {transcript && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-white/60">🌍 Translate to:</span>
                  <select
                    value={targetLanguage}
                    onChange={(e) => {
                      setTargetLanguage(e.target.value);
                      setTranslatedText(""); // ✅ Clear translation when language changes
                    }}
                    className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={translateText}
                    disabled={isTranslating}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-sky-600 text-sm font-medium disabled:opacity-50"
                  >
                    {isTranslating ? "⏳..." : "Translate"}
                  </button>
                </div>
              </div>
            )}

            {/* Original Text Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-white/40">📄 Original Text:</div>
              {transcript && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(transcript);
                    showToast("📋 Copied!");
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Copy
                </button>
              )}
            </div>

            {/* Original Transcript */}
            <div className="min-h-[200px] max-h-[250px] overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4">
              {transcript ? (
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{transcript}</p>
              ) : (
                <div className="text-center text-white/40 py-12">
                  <div className="text-5xl mb-3">📝</div>
                  <p>Upload video or paste a link</p>
                  <p className="text-xs mt-2">Transcript will appear here</p>
                </div>
              )}
            </div>

            {/* Translated Text Section */}
            {translatedText && (
              <>
                <div className="flex justify-between items-center mt-4 mb-2">
                  <div className="text-xs text-fuchsia-400">
                    🌍 Translated ({languages.find(l => l.code === targetLanguage)?.name}):
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(translatedText);
                      showToast("📋 Translated text copied!");
                    }}
                    className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    Copy
                  </button>
                </div>
                <div className="min-h-[150px] max-h-[200px] overflow-y-auto rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                  <p className="text-sm text-fuchsia-200 whitespace-pre-wrap leading-relaxed">{translatedText}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}