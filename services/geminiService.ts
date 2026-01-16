
import { GoogleGenAI } from "@google/genai";
import { NewsExcerpt } from "../types";
import { FALLBACK_OUTRO } from "../constants";

export async function generateOutro(
  excerpts: NewsExcerpt[]
): Promise<string> {
  // Ensure we always have a fallback
  if (!process.env.API_KEY || !excerpts || excerpts.length === 0) {
    return FALLBACK_OUTRO;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are an editorial assistant for "Boston Pulse", a daily short-form news podcast.
      I will provide news excerpts from Boston sources.
      
      Create a single, gentle, open-ended reflection question related to these stories to leave the listener thinking. 
      It must be ONE sentence.

      Stories:
      ${excerpts.map((e, i) => `${i+1}. [${e.source}] ${e.title}: ${e.editorialExcerpt.substring(0, 200)}`).join('\n')}

      Constraint: Max 30 words. Calm, non-sensational, professional tone.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) {
      console.warn("Gemini returned empty text for outro.");
      return FALLBACK_OUTRO;
    }
    return text;
  } catch (err) {
    console.error("Gemini generation failed (non-blocking):", err);
    // Return fallback instead of failing the pipeline
    return FALLBACK_OUTRO;
  }
}
