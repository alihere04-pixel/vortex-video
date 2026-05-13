import Replicate from "replicate";
import { NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      prompt,
      aspectRatio,
      fps,
      duration,
      style,
      resolution,
      cameraMotion,
      lighting,
      negativePrompt,
      seed,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required",
        },
        { status: 400 }
      );
    }

    // Enhanced cinematic prompt
    const finalPrompt = `
${prompt}

Style: ${style}
Aspect Ratio: ${aspectRatio}
FPS: ${fps}
Duration: ${duration} seconds
Resolution: ${resolution}
Camera Motion: ${cameraMotion}
Lighting: ${lighting}

Ultra cinematic.
Highly detailed.
Professional video quality.
`;

    console.log("FINAL PROMPT:", finalPrompt);

    // Replicate prediction create
    const prediction = await replicate.predictions.create({
      model: "minimax/video-01",
      input: {
        prompt: finalPrompt,
        ...(negativePrompt && {
          negative_prompt: negativePrompt,
        }),
        ...(seed && {
          seed,
        }),
      },
    });

    console.log("PREDICTION CREATED:", prediction);

    // Wait for completion
    const result = await replicate.wait(prediction);

    console.log("FINAL RESULT:", result);

    // Extract video URL
    let videoUrl = "";

    if (!result?.output) {
      throw new Error("No output received");
    }

    const output = result.output;

    if (typeof output === "string") {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      videoUrl = output[0];
    } else if (output?.url) {
      videoUrl = output.url();
    } else if (typeof output === "object") {
      videoUrl = output[0] || output.url || "";
    }

    if (!videoUrl) {
      throw new Error("Failed to extract video URL");
    }

    return NextResponse.json({
      success: true,
      video: videoUrl,
    });

  } catch (error: any) {
    console.error("REPLICATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Video generation failed",
      },
      { status: 500 }
    );
  }
}