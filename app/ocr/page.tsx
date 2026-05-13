"use client";
import { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import Link from "next/link";
import ReactCrop, { type Crop } from 'react-image-crop';


export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  
  // Crop States
  const [showCrop, setShowCrop] = useState<boolean>(false);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const timersRef = useRef<{ toastTimeout?: number }>({});

  useEffect(() => {
    return () => {
      if (timersRef.current.toastTimeout) window.clearTimeout(timersRef.current.toastTimeout);
    };
  }, []);

  function showToast(message: string) {
    if (timersRef.current.toastTimeout) window.clearTimeout(timersRef.current.toastTimeout);
    setToast({ open: true, message });
    timersRef.current.toastTimeout = window.setTimeout(() => setToast({ open: false, message: "" }), 2600);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImage(file);
    setExtractedText("");
    setCompletedCrop(null);
    
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function openCropEditor() {
    if (imagePreview) {
      setShowCrop(true);
    }
  }

  // ✅ Save cropped image - with corner handles support
  function saveCroppedImage() {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    setImagePreview(croppedImageUrl);
    
    // Convert to File for OCR
    fetch(croppedImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "cropped-image.png", { type: "image/png" });
        setImage(file);
      });
    
    setShowCrop(false);
    showToast("Image cropped successfully!");
  }

  async function handleOCR() {
    if (!image) {
      showToast("Please select an image first");
      return;
    }

    setIsExtracting(true);

    try {
      const result = await Tesseract.recognize(image, "eng");
      setExtractedText(result.data.text);
      showToast("Text extracted successfully!");
    } catch (error) {
      console.error("OCR Error:", error);
      showToast("Failed to extract text from image");
    } finally {
      setIsExtracting(false);
    }
  }

  function copyToClipboard() {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      showToast("Text copied to clipboard!");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white selection:bg-fuchsia-500/30 selection:text-white">
      {/* Toast */}
      <div className={["fixed left-1/2 top-5 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300", toast.open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0 pointer-events-none"].join(" ")}>
        <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="text-sm text-white/85">{toast.message}</div>
          </div>
        </div>
      </div>

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(168,85,247,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.85))]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <span className="text-sm font-semibold">V</span>
            </span>
            <span className="text-sm font-semibold tracking-wide text-white">
              Vortex<span className="text-white/60">Video</span>
            </span>
          </Link>
          
          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <Link className="transition-colors hover:text-white" href="/">Text → Video</Link>
            <Link className="transition-colors hover:text-white" href="/ocr">Image → Text</Link>
            <Link className="transition-colors hover:text-white" href="/video-to-text">Video → Text</Link>
            <a className="transition-colors hover:text-white" href="#features">Features</a>
            <a className="transition-colors hover:text-white" href="#pricing">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white">
              Generate →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            
            {/* Left Column - Upload Area */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Extract Text from Any Image
              </div>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Image to{" "}
                <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                  Text
                </span>{" "}
                Converter
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
                Upload any image and extract text instantly. Perfect for scanning documents, 
                capturing quotes, or copying text from screenshots.
              </p>

              {/* Main Upload Box */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                
                {/* Image Upload Area */}
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-fuchsia-500/40 transition cursor-pointer"
                  onClick={() => document.getElementById("imageUpload")?.click()}
                >
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img src={imagePreview} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
                      <p className="text-sm text-white/60">Click to change image</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-6xl mb-3">📷</div>
                      <p className="text-white/70">Click or drag to upload image</p>
                      <p className="text-xs text-white/40 mt-1">PNG, JPG, JPEG up to 10MB</p>
                    </>
                  )}
                </div>
                
                {/* Crop Button */}
                {imagePreview && !showCrop && (
                  <button
                    onClick={openCropEditor}
                    className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:brightness-110 transition"
                  >
                    ✂️ Crop Image
                  </button>
                )}
                
                {/* Extract Button */}
                {image && (
                  <button
                    onClick={handleOCR}
                    disabled={isExtracting}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 text-white font-medium transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isExtracting ? "🔍 Extracting Text..." : "📝 Extract Text from Image"}
                  </button>
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/55">
                <div className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Fast & Accurate OCR
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Support Multiple Languages
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  Free to Use
                </div>
              </div>
            </div>

            {/* Right Column - Extracted Text Display */}
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/15 to-sky-500/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_60px_160px_-120px_rgba(168,85,247,0.9)] backdrop-blur-xl">
                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Extracted Text
                    </div>
                    {extractedText && (
                      <button
                        onClick={copyToClipboard}
                        className="text-xs px-3 py-1 rounded-lg bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  <div className="min-h-[300px] rounded-xl border border-white/10 bg-black/30 p-4">
                    {extractedText ? (
                      <div className="space-y-3">
                        <p className="text-sm text-white/90 whitespace-pre-wrap">{extractedText}</p>
                        <div className="pt-3 border-t border-white/10">
                          <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-xs text-fuchsia-400 hover:text-fuchsia-300"
                          >
                            Use this text in Video Generator →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-3">📄</div>
                        <p className="text-white/50 text-sm">
                          {image ? "Click 'Extract Text' to start" : "Upload an image to see extracted text here"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Crop Modal - With Corner Handles */}
      {showCrop && imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-auto">
          <div className="bg-black/95 border border-white/20 rounded-2xl p-6 max-w-3xl w-full">
            <h3 className="text-lg font-semibold mb-2">✂️ Crop Image</h3>
            <p className="text-xs text-white/50 mb-4">👆 Drag the CORNERS (blue handles) to select the area you want to keep</p>
            
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={undefined}
                className="max-h-[60vh] overflow-auto"
              >
                <img
                  ref={imgRef}
                  src={imagePreview}
                  alt="Crop me"
                  className="max-w-full h-auto"
                />
              </ReactCrop>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
                  setCompletedCrop(null);
                }}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
              >
                Reset
              </button>
              <button
                onClick={() => setShowCrop(false)}
                className="flex-1 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveCroppedImage}
                disabled={!completedCrop}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-sky-600 text-white font-medium hover:brightness-110 transition disabled:opacity-50"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-semibold">Features</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">🔍 High Accuracy OCR</div>
            <div className="rounded-xl border border-white/10 p-4">🌍 Multiple Languages Support</div>
            <div className="rounded-xl border border-white/10 p-4">📱 Works with Any Image</div>
            <div className="rounded-xl border border-white/10 p-4">⚡ Instant Results</div>
            <div className="rounded-xl border border-white/10 p-4">✂️ Crop & Trim Image</div>
            <div className="rounded-xl border border-white/10 p-4">🎯 Drag Corners to Adjust</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/50">
        © 2024 VortexVideo. All rights reserved.
      </footer>
    </main>
  );
}