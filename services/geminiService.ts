import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, GenerationConfig } from "../types";
import { ParsedContent } from "./fileParser";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Use 3-flash-preview as it's good for both text and vision tasks (multimodal)
const MODEL_NAME = "gemini-3-flash-preview";

export const generateQuizFromContent = async (
  content: ParsedContent,
  config: GenerationConfig
): Promise<{ title: string; questions: Question[] }> => {
  const { questionCount, difficulty } = config;

  // System instructions as part of the prompt construction
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

  // Fix: explicitly type the array to handle mixed content types (text and inlineData)
  const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [instructionPart];

  if (content.type === 'text') {
    contents.push({ text: `Document Content:\n${content.content.slice(0, 100000)}` });
  } else {
    contents.push({ inlineData: content.inlineData });
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts: contents }, // Correct structure for @google/genai
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

  try {
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error("Failed to generate valid quiz data.");
  }
};