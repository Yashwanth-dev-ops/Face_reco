import { GoogleGenAI, Type } from '@google/genai';
import { Emotion, HandSign, DetectionResult, HeadPose, TimeTableEntry, AdminInfo, Designation, Holiday, AttendanceAnomaly } from '../types';

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

export async function askAI(prompt: string, context?: string, systemInstructionOverride?: string): Promise<string> {
    const systemInstruction = systemInstructionOverride || `You are a helpful university administration assistant for Krishna University. Your goal is to answer questions based on the provided data context. Be concise and clear in your answers. Format lists and tables neatly using markdown. If you are asked a question for which you have no context, state that the information is not available. Do not invent data.`;

    const fullPrompt = `${context ? `\n--- DATA CONTEXT ---\n${context}\n--- END CONTEXT ---\n\n` : ''}USER QUESTION: "${prompt}"`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error in askAI:", error);

        if (error instanceof Error) {
            if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
                throw new Error("The AI service is busy. Please wait a moment and try again.");
            }
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                throw new Error("Network error. Could not connect to the AI service.");
            }
        }
        throw new Error("An unexpected error occurred while contacting the AI service.");
    }
}

export async function suggestSubstituteTeacher(
    classToCover: TimeTableEntry,
    allTeachers: AdminInfo[],
    fullTimeTable: TimeTableEntry[]
): Promise<{ suggestedTeacherId: string; reason: string } | null> {
    
    const teachersWithCorrectDesignation = allTeachers.filter(t => [Designation.Teacher, Designation.Incharge].includes(t.designation));

    const availableTeachers = teachersWithCorrectDesignation.filter(teacher => {
        // Exclude the absent teacher
        if (teacher.idNumber === classToCover.teacherId) return false;

        // Check if the teacher has any class at the given time slot
        const isBusy = fullTimeTable.some(entry => 
            !entry.isAbsent &&
            entry.teacherId === teacher.idNumber &&
            entry.dayOfWeek === classToCover.dayOfWeek &&
            entry.startTime === classToCover.startTime
        );
        return !isBusy;
    });

    if (availableTeachers.length === 0) {
        return null;
    }

    const systemInstruction = `You are a helpful school administration AI. Your task is to find the most suitable substitute teacher for an uncovered class. Analyze the context and provide your recommendation in the specified JSON format.`;

    const context = `
    **Class to Cover:**
    - Subject: ${classToCover.subject}
    - Department: ${classToCover.department}
    - Year: ${classToCover.year}
    - Time: Day ${classToCover.dayOfWeek} at ${classToCover.startTime}

    **Available Teachers:**
    ${availableTeachers.map(t => `- ID: ${t.idNumber}, Name: ${t.name}, Department: ${t.department}`).join('\n')}
    `;

    const suggestionPrompt = `
    Based on the provided context, please suggest the best substitute teacher from the list of available teachers.
    Prioritize teachers from the same department ('${classToCover.department}') if possible. If no one from the same department is available, choose a suitable teacher from another department.
    Provide a brief reason for your choice.
    `;
    
    const suggestionSchema = {
        type: Type.OBJECT,
        properties: {
            suggestedTeacherId: { type: Type.STRING, description: "The ID number of the recommended substitute teacher." },
            reason: { type: Type.STRING, description: "A brief justification for the recommendation." }
        },
        required: ["suggestedTeacherId", "reason"]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: context }, { text: suggestionPrompt }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: suggestionSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || typeof parsedResult.suggestedTeacherId !== 'string' || typeof parsedResult.reason !== 'string') {
            throw new Error("Invalid response structure from substitute suggestion API");
        }
        
        return parsedResult;
    } catch (error) {
        console.error("Error in suggestSubstituteTeacher:", error);
        throw new Error("Failed to get a suggestion from the AI service.");
    }
}


export async function generateStudentPerformanceReport(context: string): Promise<string> {
    const systemInstruction = `You are a helpful and encouraging academic advisor for a university student. Analyze the provided data on their attendance and marks. Provide a concise, insightful report in markdown format. 
    - Start with a brief, positive opening.
    - Use bullet points for key insights.
    - Highlight areas of strength (good attendance/marks) and suggest areas for improvement.
    - If you find a correlation between poor attendance and low marks in a subject, state it directly but constructively.
    - Keep the tone supportive.
    - End with an encouraging closing statement.
    - Do not invent data. Base all analysis strictly on the context provided.`;
    
    const prompt = `Please generate a performance report based on this student's data:\n\n${context}`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error in generateStudentPerformanceReport:", error);
        throw new Error("Failed to generate the AI performance report. Please try again.");
    }
}

export async function rescheduleClass(
    classToReschedule: TimeTableEntry,
    fullTimeTable: TimeTableEntry[],
    allTeachers: AdminInfo[],
    holidays: Holiday[],
    originalDate: Date
): Promise<{ newDate: string; newStartTime: string; reason: string } | null> {
    const systemInstruction = `You are an intelligent university timetable scheduler. Your task is to find a new slot for a class that was cancelled due to a holiday. You must avoid all conflicts.`;

    const nextMonday = new Date(originalDate);
    nextMonday.setDate(originalDate.getDate() + (8 - originalDate.getDay()) % 7);
    const searchEndDate = new Date(nextMonday);
    searchEndDate.setDate(nextMonday.getDate() + 14); // Search for 2 weeks from the next Monday

    const context = `
    **Class to Reschedule:**
    - Subject: ${classToReschedule.subject}
    - Teacher ID: ${classToReschedule.teacherId}
    - Group: ${classToReschedule.department} / ${classToReschedule.year} / Section ${classToReschedule.section}
    - Original Date: ${originalDate.toISOString().split('T')[0]}

    **Constraints:**
    - Reschedule between ${nextMonday.toISOString().split('T')[0]} and ${searchEndDate.toISOString().split('T')[0]}.
    - New slot must be on a weekday (Monday to Saturday).
    - New slot must not be on a holiday.
    - The teacher and the student group must both be free at the new time.
    - The time slot must be between 09:00 and 17:00.

    **Existing University Holidays:**
    ${holidays.map(h => `- From ${h.startDate} to ${h.endDate}`).join('\n')}

    **Full Current Timetable (dayOfWeek: 1=Mon, 7=Sun):**
    ${fullTimeTable.map(e => `- Day ${e.dayOfWeek}, ${e.startTime}, Teacher: ${e.teacherId}, Group: ${e.department}/${e.year}/Sec ${e.section}`).join('\n')}
    `;

    const reschedulePrompt = `Based on the context, find the earliest possible valid slot to reschedule the class. Provide the new date (YYYY-MM-DD) and start time (HH:MM).`;
    
    const rescheduleSchema = {
        type: Type.OBJECT,
        properties: {
            newDate: { type: Type.STRING, description: "The new date for the class in YYYY-MM-DD format." },
            newStartTime: { type: Type.STRING, description: "The new start time in HH:MM format." },
            reason: { type: Type.STRING, description: "A brief justification for choosing this slot." }
        },
        required: ["newDate", "newStartTime", "reason"]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: context }, { text: reschedulePrompt }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: rescheduleSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || typeof parsedResult.newDate !== 'string' || typeof parsedResult.newStartTime !== 'string') {
            throw new Error("Invalid response structure from reschedule API");
        }
        
        return parsedResult;
    } catch (error) {
        console.error("Error in rescheduleClass:", error);
        // Return null instead of throwing, so the calling function can handle it gracefully
        return null;
    }
}


export async function suggestStudyTime(
    memberTimetables: { memberId: string, schedule: TimeTableEntry[] }[],
    allHolidays: Holiday[]
): Promise<{ suggestions: { dayOfWeek: number, startTime: string, reason: string }[] }> {
    const systemInstruction = `You are an intelligent university timetable scheduler. Your task is to find three optimal 1-hour study slots for a group of students in the upcoming week (Monday to Saturday). You must avoid all conflicts with their existing classes and university holidays.`;

    const context = `
    **Current Date:** ${new Date().toDateString()}

    **University Holidays:**
    ${allHolidays.map(h => `- From ${h.startDate} to ${h.endDate}`).join('\n') || 'None'}
    
    **Student Schedules (dayOfWeek: 1=Mon, 7=Sun):**
    ${memberTimetables.map(mt => `
    --- Member ${mt.memberId} ---
    ${mt.schedule.map(e => `- Day ${e.dayOfWeek}, ${e.startTime}-${e.endTime}, Subject: ${e.subject}`).join('\n')}
    `).join('\n')}
    `;

    const prompt = `Based on the provided schedules and constraints, find three distinct, 1-hour-long study slots between 09:00 and 17:00 on weekdays (Monday to Saturday) in the upcoming week where ALL members are free. Provide a brief reason for each suggestion.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        dayOfWeek: { type: Type.NUMBER, description: "The day of the week for the suggested slot (1=Monday, 6=Saturday)." },
                        startTime: { type: Type.STRING, description: "The suggested start time in HH:MM format." },
                        reason: { type: Type.STRING, description: "A brief justification for choosing this slot." }
                    },
                    required: ["dayOfWeek", "startTime", "reason"]
                }
            }
        },
        required: ["suggestions"]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: context }, { text: prompt }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);
        return parsedResult;
    } catch (error) {
        console.error("Error in suggestStudyTime:", error);
        throw new Error("AI failed to suggest a study time.");
    }
}

export async function summarizeNoteContent(noteContent: string): Promise<{ summary: string }> {
    const systemInstruction = `You are a helpful study assistant. Your task is to summarize the provided text into a few concise bullet points.`;
    const prompt = `Please summarize the following content:\n\n---\n${noteContent}\n---`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "A concise summary of the text, preferably as markdown bullet points." }
        },
        required: ["summary"]
    };
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);
        return parsedResult;
    } catch (error) {
        console.error("Error in summarizeNoteContent:", error);
        throw new Error("AI failed to generate a summary.");
    }
}

export async function analyzeAttendanceAnomalies(context: string): Promise<{ anomalies: AttendanceAnomaly[] }> {
    const systemInstruction = `You are an expert academic advisor for a university. Your task is to analyze student attendance data to identify patterns of concern that may indicate a student is at risk. Focus on sudden changes, consistent absences for specific subjects, or negative emotional trends correlated with attendance. Be objective and data-driven in your summary. Respond only with the provided JSON schema.`;
    
    const anomalyPrompt = `Analyze the following student data summaries. For each student, identify any attendance anomalies. If a student's pattern is normal, do not include them in the output array.\n\n--- STUDENT DATA ---\n\n${context}`;

    const anomalySchema = {
        type: Type.OBJECT,
        properties: {
            anomalies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        studentRollNumber: { type: Type.STRING, description: "The student's unique roll number." },
                        severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The severity of the identified anomaly." },
                        anomalyType: { type: Type.STRING, description: "A short title for the anomaly type, e.g., 'Sudden Drop in Attendance'." },
                        summary: { type: Type.STRING, description: "A concise, data-driven summary of the anomaly." }
                    },
                    required: ["studentRollNumber", "severity", "anomalyType", "summary"]
                }
            }
        },
        required: ["anomalies"]
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: anomalyPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: anomalySchema,
            }
        });

        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult || !Array.isArray(parsedResult.anomalies)) {
            throw new Error("Invalid response structure from anomaly detection API.");
        }
        
        return parsedResult;
    } catch (error) {
        console.error("Error in analyzeAttendanceAnomalies:", error);
        throw new Error("Failed to get attendance anomaly insights from the AI service.");
    }
}
