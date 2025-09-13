import { GoogleGenAI, Type } from '@google/genai';
import { Emotion, HandSign, DetectionResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set for Gemini");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

const prompt = `
Analyze the provided image to identify all human faces and a variety of nuanced hand gestures.
Your response must strictly adhere to the defined JSON schema.
- Identify each person with a short, descriptive identifier (e.g., 'Person with glasses'). Be consistent for the same person if possible.
- Detect the dominant emotion for each face.
- Classify any visible hand signs.
- Provide a confidence score and a normalized bounding box for each detection.
If no faces or hands are detected, return empty arrays for "faces" and "hands" respectively.
`;

const schema = {
    type: Type.OBJECT,
    properties: {
        faces: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    personId: { type: Type.STRING, description: "A short, descriptive identifier for the person." },
                    emotion: { type: Type.STRING, enum: Object.values(Emotion), description: "The detected dominant emotion." },
                    confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
                    boundingBox: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                        },
                        required: ["x", "y", "width", "height"]
                    },
                },
                required: ["personId", "emotion", "confidence", "boundingBox"]
            }
        },
        hands: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sign: { type: Type.STRING, enum: Object.values(HandSign), description: "The classification of the hand sign." },
                    confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
                    boundingBox: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                        },
                         required: ["x", "y", "width", "height"]
                    },
                },
                 required: ["sign", "confidence", "boundingBox"]
            }
        },
    },
    required: ["faces", "hands"]
};


export async function detectFacesAndHands(base64ImageData: string): Promise<DetectionResult> {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };

        const textPart = {
            text: prompt,
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || !Array.isArray(parsedResult.faces) || !Array.isArray(parsedResult.hands)) {
             throw new Error("Invalid response structure from API after parsing");
        }
        
        return parsedResult;

    } catch (error) {
        console.error("Error in detectFacesAndHands:", error);
        
        // Check for specific Gemini rate limit error text
        if (error instanceof Error && (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429'))) {
             console.error("Gemini API Error: Rate limit exceeded");
             throw new Error("RATE_LIMIT");
        }

        // Generalize other errors
        throw new Error("Failed to get detection result from the API.");
    }
}