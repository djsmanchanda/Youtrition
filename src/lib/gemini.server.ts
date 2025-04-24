// src/lib/gemini.server.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Check for the API key
if (!process.env.GOOGLE_API_KEY) {
  console.warn("WARNING: GOOGLE_API_KEY environment variable is not set. Gemini API calls will fail.");
}

// Initialize the Google Generative AI SDK
export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "dummy-key-for-development");

// Helper function to create a Gemini model instance
export function getGeminiModel(modelName = "gemini-2.0-flash-lite-001") {
  return genAI.getGenerativeModel({ model: modelName });
}