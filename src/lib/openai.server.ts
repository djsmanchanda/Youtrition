// src/lib/openai.server.ts
import OpenAI from "openai";

// Check for the API key
if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY environment variable is not set. OpenAI API calls will fail.");
}

// Create the OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development",
});