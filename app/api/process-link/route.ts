export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function downloadAudioFromUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `${Date.now()}.mp3`);
    
    const ytDlpPath = path.resolve("yt-dlp.exe");
    const ffmpegPath = path.resolve("ffmpeg.exe");
    
    console.log("yt-dlp path:", ytDlpPath);
    console.log("ffmpeg path:", ffmpegPath);
    console.log("yt-dlp exists:", fs.existsSync(ytDlpPath));
    console.log("ffmpeg exists:", fs.existsSync(ffmpegPath));
    
    const process = spawn(ytDlpPath, [
      "--js-runtimes", "deno",        // ✅ ADD THIS
      "--no-check-certificate",
      "-f", "bestaudio",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--ffmpeg-location", ffmpegPath,
      "-o", outputPath,
      url
    ]);

    let errorLog = "";

    process.stdout.on("data", (data) => {
      console.log("STDOUT:", data.toString());
    });

    process.stderr.on("data", (data) => {
      errorLog += data.toString();
      console.log("STDERR:", data.toString());
    });

    process.on("close", (code) => {
      console.log("Process closed with code:", code);
      if (code === 0 && fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        console.log("✅ Audio downloaded, size:", buffer.length, "bytes");
        resolve(buffer);
      } else {
        reject(new Error(errorLog || `Process failed with code ${code}`));
      }
    });

    process.on("error", (err) => {
      console.error("Spawn error:", err);
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    console.log("Processing URL:", url);

    // Download audio
    const audioBuffer = await downloadAudioFromUrl(url);
    
    // Transcribe
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
    const formData = new FormData();
    formData.append("file", blob, "audio.mp3");
    formData.append("model", "whisper-large-v3");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formData,
    });

    const result = await response.json();
    console.log("Transcription result status:", response.status);

    if (!result.text) {
      throw new Error(result.error?.message || "Transcription failed");
    }

    // Create audio URL for download
    const audioBase64 = audioBuffer.toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    return NextResponse.json({
      success: true,
      text: result.text,
      audioUrl: audioDataUrl,
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process link" 
    }, { status: 500 });
  }
}