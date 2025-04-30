import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini.server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const images: string[] = [];

    for (let i = 1; i <= 10; i++) {
      const file = formData.get(`image${i}`);
      if (file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        images.push(base64);
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ success: false, error: "No images uploaded." }, { status: 400 });
    }

    const prompt = `
You are an AI assistant helping a user analyze the contents of their refrigerator based on up to 10 photos.

Your task is to:
- List every object that appears to be a food item, container, or visible object in the fridge.
- Do not skip anything visible — even if you’re unsure what it is, describe it as best you can (e.g., "blue box", "jar", "white container").

For each item, return:
- "name": a lowercase noun (e.g., "milk", "spinach", "blue box", "container").
- "quantity": estimated quantity or count (e.g., "1", "half bag", "2 jars").
- "condition": freshness or guess, such as "fresh", "spoiled", "frosted", "looks old", "sealed", "unknown".

Requirements:
- Output should be a JSON array, sorted alphabetically by item name.
- If something is ambiguous (like a sealed box), include it anyway with "condition": "unknown".
- Do not return any markdown, explanation, or commentary. Just the JSON.

Example:
[
  { "name": "apple", "quantity": "2", "condition": "fresh" },
  { "name": "blue box", "quantity": "1", "condition": "unknown" },
  { "name": "spinach", "quantity": "half bag", "condition": "wilted" }
]
`;

    const model = getGeminiModel("gemini-2.0-flash-lite-001");

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...images.map((img) => ({
              inlineData: {
                mimeType: "image/jpeg",
                data: img,
              },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.85,
        topK: 50,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const responseText = await result.response.text();
    const cleaned = responseText.replace(/```json\n?|```/g, "").trim();

    // Save response for debug
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const debugDir = path.resolve(process.cwd(), "fridge-debug");
    fs.mkdirSync(debugDir, { recursive: true });
    const debugPath = path.join(debugDir, `response-${timestamp}.json`);
    fs.writeFileSync(debugPath, responseText);
    console.log(`[DEBUG] Gemini raw response saved to ${debugPath}`);

    const items = JSON.parse(cleaned);

    if (!Array.isArray(items)) {
      throw new Error("Gemini response is not a valid array.");
    }

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("Fridge scan error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to analyze fridge images." },
      { status: 500 }
    );
  }
}
