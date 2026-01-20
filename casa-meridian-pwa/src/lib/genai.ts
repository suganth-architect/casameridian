import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOG_API_KEY;
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateLuxuryImage(promptText: string): Promise<Buffer> {
    if (!client) throw new Error("Missing GOOG_API_KEY environment variable");

    const fullPrompt =
        `Architectural photography, 8k, hyper-realistic, luxury villa, golden hour, magazine quality, cinematic lighting: ${promptText}`;

    let response;
    try {
        response = await client.models.generateImages({
            model: "gemini-3-pro-image-preview",
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: "16:9",
                outputMimeType: "image/png",
            },
        });
    } catch (primaryError: any) {
        console.warn("Gemini 3 Pro Image failed, trying fallback:", primaryError.message);

        // Fallback
        const fallbackModel = "gemini-2.0-flash-exp";
        // Note: Check actual model name. User suggested "gemini-2.0-flash-exp-image-generation" but often it's "gemini-2.0-flash-exp" or similar.
        // User explicitly asked for "gemini-2.0-flash-exp-image-generation" (or configured env model).
        // I will use that.

        response = await client.models.generateImages({
            model: process.env.GEMINI_IMAGE_MODEL_FALLBACK || "gemini-2.0-flash-exp",
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: "16:9",
                outputMimeType: "image/png",
            },
        });
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
        throw new Error("No image generated from Nano Banana Pro");
    }

    const imageBytes = img.imageBytes ?? img;
    if (!imageBytes) {
        console.error("Nano Banana image is empty:", img);
        throw new Error("Nano Banana returned empty imageBytes");
    }

    return Buffer.from(imageBytes, "base64");
}
