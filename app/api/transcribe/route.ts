import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  let audioBuffer: Buffer | null = null;
  
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;
    
    if (!audio) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await audio.arrayBuffer();
    audioBuffer = Buffer.from(bytes);
    
    // Save temp file
    const tempDir = os.tmpdir();
    tempPath = path.join(tempDir, `${Date.now()}.mp3`);
    fs.writeFileSync(tempPath, audioBuffer);
    
    console.log("Temp file saved:", tempPath);
    console.log("File size:", audioBuffer.length, "bytes");

    // Transcribe using Groq
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
    const formDataGroq = new FormData();
    formDataGroq.append("file", blob, "audio.mp3");
    formDataGroq.append("model", "whisper-large-v3");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formDataGroq,
    });

    const result = await response.json();
    console.log("Groq transcription response:", result);

    if (!result.text) {
      throw new Error(result.error?.message || "Transcription failed");
    }

    // Create audio URL for download
    const audioBase64 = audioBuffer.toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Cleanup temp file
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log("Temp file deleted");
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      audioUrl: audioDataUrl,
    });

  } catch (error: any) {
    console.error("Error:", error);
    
    // Cleanup on error
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch(e) {}
    }
    
    return NextResponse.json({ 
      error: error.message || "Server error" 
    }, { status: 500 });
  }
}