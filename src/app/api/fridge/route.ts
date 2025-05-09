// src/app/api/fridge/route.ts
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
- List every distinct food item, container, or object visible in the fridge.
- Do not count duplicates from different angles. If the same item appears in multiple images, list it only once.
- If a label or visual feature (e.g. color, size, shape) is visible on a box or container, describe it (e.g., "tall red juice box", "blue plastic container", "pizza box", "white tub with green lid").
- If unsure, provide your best guess (e.g., "unlabeled bottle", "clear jar with yellow liquid").

For each item, return:
- "name": lowercase noun (e.g., "milk", "spinach", "red box", "container").
- "quantity": estimated quantity or count (e.g., "1", "half bag", "2 jars").
- "condition": freshness or guess, such as "fresh", "spoiled", "frosted", "looks old", "sealed", "unknown".

Requirements:
- Output should be a JSON array, sorted alphabetically by item name.
- Do not return duplicates, even if they appear from different angles.
- If multiple similar items are visible (e.g., two milk bottles), combine them with appropriate quantity.
- Do not return any markdown, explanation, or commentary. Just the JSON.

Example:
[
  { "name": "apple", "quantity": "2", "condition": "fresh" },
  { "name": "blue plastic box", "quantity": "1", "condition": "sealed" },
  { "name": "pizza box", "quantity": "1", "condition": "looks old" }
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
    try {
      fs.mkdirSync(debugDir, { recursive: true });
      const debugPath = path.join(debugDir, `response-${timestamp}.json`);
      fs.writeFileSync(debugPath, responseText);
      console.log(`[DEBUG] Gemini raw response saved to ${debugPath}`);
    } catch (err) {
      console.error("[DEBUG] Failed to save debug file:", err);
    }

    let items;
    try {
      items = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse Gemini response:", err);
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response." },
        { status: 500 }
      );
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "AI response is not a valid array." },
        { status: 500 }
      );
    }

    // Validate and clean items
    const validItems = items
      .filter((item) => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          item.name.trim() !== ""
        );
      })
      .map((item) => ({
        name: item.name.trim().toLowerCase(),
        quantity: item.quantity?.toString() || "unknown",
        condition: item.condition?.toString() || "unknown",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, items: validItems });
  } catch (err: any) {
    console.error("Fridge scan error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to analyze fridge images." },
      { status: 500 }
    );
  }
}
