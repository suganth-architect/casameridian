import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOG_API_KEY;
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateLuxuryImage(promptText: string): Promise<Buffer> {
    if (!client) throw new Error("Missing GOOG_API_KEY environment variable");

    const fullPrompt =
        `Architectural photography, 8k, hyper-realistic, luxury villa, golden hour, magazine quality, cinematic lighting: ${promptText}`;

    const response = await client.models.generateImages({
        model: "gemini-3-pro-image-preview",
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            outputMimeType: "image/png",
        },
    });

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
