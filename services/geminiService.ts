
import { GoogleGenAI, Type } from "@google/genai";
import { AIParsedItem } from "../types";

// Always use process.env.API_KEY for initializing the SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses shipment text using Gemini AI to extract structured data.
 * Includes explicit instructions to search TRACES NT and Douane Maroc for S.H codes or regulatory changes.
 */
export async function parseShipmentData(text: string): Promise<AIParsedItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Tu es un expert en logistique de pêche. Analyse le texte pour extraire: quantité, poids brut (KG), poids net (KG), prix unitaire (EUR).
      
      INSTRUCTION CRITIQUE: Si l'utilisateur pose des questions sur les codes S.H, les taxes, ou les changements de réglementation, effectue une recherche Google spécifique sur ces domaines:
      1. TRACES NT (EU): https://webgate.ec.europa.eu/tracesnt
      2. Douane Maroc ADIL: https://www.douane.gov.ma/adil/
      
      Texte d'entrée: "${text}"`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fishNameSuggestion: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              symbol: { type: Type.STRING, description: "C ou P" },
              brutWeight: { type: Type.NUMBER },
              netWeight: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER }
            },
            required: ["quantity", "brutWeight", "netWeight", "unitPrice"]
          }
        }
      }
    });

    const jsonStr = response.text.trim();
    const sanitized = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(sanitized);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return [];
  }
}
