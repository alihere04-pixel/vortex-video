import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang, script } = await req.json();
    
    console.log("Translation request:", { textLength: text?.length, targetLang, script });
    
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Handle Roman English (Urdu/Hindi in English script)
    let finalLang = targetLang;
    let promptAddon = "";
    
    if (targetLang === "roman-ur") {
      finalLang = "Urdu";
      promptAddon = "Write the translation in Roman English script (using English alphabets as people type in chats), not in Arabic script. Example: 'Aap kaise ho?' instead of 'آپ کیسے ہو؟'";
    } else if (targetLang === "roman-hi") {
      finalLang = "Hindi";
      promptAddon = "Write the translation in Roman English script (using English alphabets as people type in chats), not in Devanagari script. Example: 'Aap kaise hain?' instead of 'आप कैसे हैं?'";
    }

    const languageNames: Record<string, string> = {
      en: "English", ur: "Urdu", hi: "Hindi", es: "Spanish",
      fr: "French", de: "German", zh: "Chinese", ar: "Arabic",
      ru: "Russian", ja: "Japanese", ko: "Korean", tr: "Turkish",
      it: "Italian", pt: "Portuguese", nl: "Dutch"
    };

    const languageName = languageNames[finalLang] || finalLang;

    const systemPrompt = `You are a professional translator. Translate the following text to ${languageName}. 
${promptAddon}
Only return the translated text, nothing else. Keep the meaning and tone intact.`;

    console.log("Calling Groq API...");

    // ✅ FIXED: Using active model
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",  // ✅ Changed from llama3-70b-8192
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
      }),
    });

    const result = await response.json();
    console.log("Groq API response status:", response.status);

    if (result.error) {
      console.error("Groq API error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const translatedText = result.choices?.[0]?.message?.content || text;

    return NextResponse.json({
      success: true,
      translatedText: translatedText,
    });

  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: error.message || "Translation failed" }, { status: 500 });
  }
}