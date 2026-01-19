import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOG_API_KEY;
// Initialize client safely (it might be undefined during build, so handle in function)
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateLuxuryImage(promptText: string): Promise<Buffer> {
    if (!client) throw new Error("Missing GOOG_API_KEY environment variable");

    const fullPrompt = `Architectural photography, 8k, hyper-realistic, luxury villa, golden hour, magazine quality, cinematic lighting: ${promptText}`;

    try {
        const response = await client.models.generateImages({
            model: 'gemini-2.0-flash-exp',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: "16:9",
                outputMimeType: "image/png"
            }
        });

        // Cast to any to handle potential SDK response structure variations
        const resp: any = response;

        // Check for common response patterns: generatedImages array, or direct image property
        // SDK typically returns generatedImages for this method
        const generatedImage = resp.generatedImages?.[0]?.image || resp.images?.[0] || resp.image;

        if (!generatedImage) throw new Error("No image generated from AI model");

        // Convert base64 string to Buffer
        // Handle both direct bytes or base64 string
        const imageBytes = generatedImage.imageBytes || generatedImage;
        return Buffer.from(imageBytes, 'base64');
    } catch (error) {
        console.error("Nano Banana Gen Error:", error);
        throw error;
    }
}
