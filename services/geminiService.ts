import { GoogleGenAI } from "@google/genai";
import { WeatherType, TimeOfDay, PetState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to check if key exists
const isAiAvailable = () => !!process.env.API_KEY;

// Retry helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateContentWithRetry(prompt: string, retries = 2, delay = 2000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response;
    } catch (error: any) {
      // Check for 429 or Resource Exhausted
      const isQuotaError = error?.code === 429 || 
                           error?.status === 429 || 
                           error?.status === 'RESOURCE_EXHAUSTED' ||
                           (error?.message && error.message.includes('429')) ||
                           (error?.message && error.message.includes('quota'));
      
      if (isQuotaError && i < retries) {
        // Exponential backoff
        await wait(delay * Math.pow(2, i));
        continue;
      }
      throw error;
    }
  }
  return null;
}

export const generatePetThought = async (
  pet: PetState,
  weather: WeatherType,
  time: TimeOfDay
): Promise<string> => {
  if (!isAiAvailable()) return " *Happy noises*";

  const prompt = `
    You are a cute ${pet.type} named ${pet.name} in a cozy camping game like Animal Crossing.
    The current weather is ${weather} and it is ${time}.
    Write a very short, cute thought bubble (max 15 words) that you are thinking right now.
    Be whimsical and adorable. Use an emoji.
  `;

  try {
    const response = await generateContentWithRetry(prompt);
    return response?.text?.trim() || " *Happy noises*";
  } catch (error) {
    // Silently fall back on quota errors to prevent console spam
    return " *Happy noises*";
  }
};

export const generateAtmosphereDescription = async (
  weather: WeatherType,
  time: TimeOfDay,
  theme: string
): Promise<string> => {
  if (!isAiAvailable()) return "A peaceful moment on the island.";

  const prompt = `
    Describe the atmosphere of a camping island in one gentle, poetic sentence.
    Theme: ${theme}. Weather: ${weather}. Time: ${time}.
    Keep it cozy and relaxing.
  `;

  try {
    const response = await generateContentWithRetry(prompt);
    return response?.text?.trim() || "A peaceful moment on the island.";
  } catch (error) {
    // Silently fall back
    return "The wind whispers through the trees...";
  }
};