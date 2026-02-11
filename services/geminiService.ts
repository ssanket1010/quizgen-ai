import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, GenerationConfig } from "../types";
import { ParsedContent } from "./fileParser";

// Configuration constant - defined at the top level
const MODEL_NAME = "gemini-3-flash-preview";

/**
 * Generates a quiz based on the provided content using Google Gemini.
 */
export const generateQuizFromContent = async (
  content: ParsedContent,
  config: GenerationConfig
): Promise<{ title: string; questions: Question[] }> => {
  const { questionCount, difficulty } = config;

  // 1. SECURE INITIALIZATION
  // We initialize the client INSIDE the function so the app doesn't crash on load
  // if the key is missing.
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your Vercel Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 2. PROMPT CONSTRUCTION
  const instructionPart = {
    text: `
    You are an expert educational content creator and quiz master.
    Analyze the provided document or image content and generate a quiz.
    
    Requirements:
    1. Generate exactly ${questionCount} questions.
    2. Difficulty level: ${difficulty}.
    3. Mix of Question Types: Multiple Choice, True/False, Short Answer.
    4. For Multiple Choice, provide 4 options.
    5. Provide a short, concise explanation for the correct answer.
    6. Generate a catchy title for this quiz based on the content.
    
    If the content is an image, perform OCR and visual analysis to extract relevant educational information before creating the quiz.
    `
  };

  // Prepare content parts
  const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [instructionPart];

  if (content.type === 'text') {
    contents.push({ text: `Document Content:\n${content.content.slice(0, 100000)}` });
  } else {
    contents.push({ inlineData: content.inlineData });
  }

  // 3. API CALL
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A creative title for the quiz based on the topic." },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique identifier like q1, q2" },
                  type: { 
                    type: Type.STRING, 
                    enum: [
                      QuestionType.MULTIPLE_CHOICE,
                      QuestionType.TRUE_FALSE,
                      QuestionType.SHORT_ANSWER
                    ] 
                  },
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Array of 4 options. Required for MULTIPLE_CHOICE, empty for others."
                  },
                  correctAnswer: { type: Type.STRING, description: "The exact correct answer string." },
                  explanation: { type: Type.STRING, description: "Why this answer is correct." }
                },
                required: ["id", "type", "question", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const data = JSON.parse(text);
    return data;

  } catch (error: any) {
    console.error("Failed to parse Gemini response", error);
    throw new Error(error.message || "Failed to generate valid quiz data.");
  }
};