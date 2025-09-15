
import { GoogleGenAI, Type } from '@google/genai';
import { Emotion, HandSign, DetectionResult, HeadPose } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set for Gemini");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

const prompt = `
Analyze the provided image to identify all human faces and a variety of nuanced hand gestures.
Your response must strictly adhere to the defined JSON schema.
- For each person, provide a simple, unique identifier like 'Person 1', 'Person 2'. Maintain consistency for the same person if they appear multiple times in the same image.
- Detect the dominant emotion for each face.
- Determine the head pose for each face (e.g., looking straight, left, right, up).
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
                    headPose: { type: Type.STRING, enum: Object.values(HeadPose), description: "The detected head pose." },
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
                required: ["personId", "emotion", "headPose", "confidence", "boundingBox"]
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
        
        if (error instanceof Error) {
            // Check for specific Gemini rate limit error text
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
                 console.error("Gemini API Error: Rate limit exceeded");
                 throw new Error("RATE_LIMIT");
            }
            // Check for network errors, which often manifest as a TypeError
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                console.error("Gemini API Error: Network error");
                throw new Error("NETWORK_ERROR");
            }
        }

        // Generalize other errors
        throw new Error("Failed to get detection result from the API.");
    }
}

export async function recognizeFace(
    imageBase64: string,
    userProfiles: { id: string; photoBase64: string }[]
): Promise<{ matchedUserId: string; confidence: number }> {
    const recognizePrompt = `
    Analyze the 'Live Capture' image and find the best match from the 'User Database'.
    Return the 'matchedUserId' of the best match.
    If no confident match is found, you MUST return 'UNKNOWN' as the 'matchedUserId'.
    Strictly follow the provided JSON schema.
    `;
    
    const recognizeSchema = {
        type: Type.OBJECT,
        properties: {
            matchedUserId: { type: Type.STRING, description: "The user ID of the best match, or 'UNKNOWN'." },
            confidence: { type: Type.NUMBER, description: "Confidence score of the match from 0.0 to 1.0." }
        },
        required: ["matchedUserId", "confidence"]
    };

    try {
        const parts: any[] = [
            { text: recognizePrompt },
            { text: "--- LIVE CAPTURE ---" },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                },
            },
            { text: "\n--- USER DATABASE ---" },
        ];
        
        userProfiles.forEach(profile => {
             const base64Data = profile.photoBase64.split(',')[1];
            parts.push({ text: `\nUser ID: ${profile.id}` });
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                },
            });
        });

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: recognizeSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || typeof parsedResult.matchedUserId !== 'string' || typeof parsedResult.confidence !== 'number') {
            throw new Error("Invalid response structure from face recognition API");
        }
        
        return parsedResult;

    } catch (error) {
        console.error("Error in recognizeFace:", error);
        
        if (error instanceof Error) {
            // Check for specific Gemini rate limit error text
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
                 console.error("Gemini API Error: Rate limit exceeded during face recognition");
                 throw new Error("You are trying too frequently. Please wait a moment before trying again.");
            }
            // Check for network errors, which often manifest as a TypeError
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                console.error("Gemini API Error: Network error during face recognition");
                throw new Error("Network error. Please check your connection and try again.");
            }
        }

        // Generalize other errors
        throw new Error("Facial recognition service failed.");
    }
}

export async function detectSingleFaceEmotion(base64ImageData: string): Promise<{ emotion: Emotion } | null> {
    const emotionPrompt = `Analyze the image and identify the dominant emotion of the main face present. Your response must strictly follow the JSON schema. If no face is detected, return null.`;
    
    const emotionSchema = {
        type: Type.OBJECT,
        properties: {
            emotion: { type: Type.STRING, enum: Object.values(Emotion), description: "The detected dominant emotion." },
        },
        required: ["emotion"]
    };

    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };

        const textPart = {
            text: emotionPrompt,
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: emotionSchema,
            }
        });

        const jsonString = response.text.trim();
        // Handle cases where the API might return an empty string or "null" for no detection
        if (!jsonString || jsonString.toLowerCase() === 'null') {
            return null;
        }
        
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || typeof parsedResult.emotion !== 'string') {
             return null;
        }
        
        return parsedResult;

    } catch (error) {
        console.error("Error in detectSingleFaceEmotion:", error);
        
        if (error instanceof Error) {
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
                 console.error("Gemini API Error: Rate limit exceeded");
                 throw new Error("RATE_LIMIT");
            }
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                console.error("Gemini API Error: Network error");
                throw new Error("NETWORK_ERROR");
            }
        }
        // Generalize other errors
        throw new Error("Failed to get emotion detection result from the API.");
    }
}