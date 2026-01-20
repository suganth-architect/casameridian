import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOG_API_KEY;
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateLuxuryImage(promptText: string): Promise<Buffer> {
    if (!client) throw new Error("Missing GOOG_API_KEY environment variable");

    const fullPrompt =
        `Architectural photography, 8k, hyper-realistic, luxury villa, golden hour, magazine quality, cinematic lighting: ${promptText}`;

    const models = [
        process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview",
        process.env.GEMINI_IMAGE_MODEL_FALLBACK || "gemini-3-flash-preview",
        process.env.GEMINI_IMAGE_MODEL_FALLBACK_2 || "gemini-2.0-flash-exp"
    ];

    let response;
    let lastError;

    for (const model of models) {
        try {
            console.log(`Trying GenAI model: ${model}`);
            response = await client.models.generateImages({
                model: model,
                prompt: fullPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: "16:9",
                    outputMimeType: "image/png",
                },
            });

            // If we successfully got a response, break loop
            if (response) break;

        } catch (error: any) {
            console.warn(`Model ${model} failed:`, error.message);
            lastError = error;
            // Continue to next model
        }
    }

    if (!response) {
        throw new Error(`All AI models failed. Last error: ${lastError?.message || "Unknown error"}`);
    }

    const resp: any = response;

    const img =
        resp?.generatedImages?.[0]?.image ??
        resp?.images?.[0]?.image ??
        resp?.images?.[0] ??
        resp?.image ??
        null;

    if (!img) {
        console.error("Unexpected Nano Banana response:", resp);
        throw new Error("No image generated from GenAI models");
    }

    const imageBytes = img.imageBytes ?? img;
    if (!imageBytes) {
        console.error("Nano Banana image is empty:", img);
        throw new Error("GenAI returned empty imageBytes");
    }

    return Buffer.from(imageBytes, "base64");
}
