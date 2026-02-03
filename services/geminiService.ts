import { GoogleGenAI } from "@google/genai";
import { WeatherType, TimeOfDay, PetState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to check if key exists
const isAiAvailable = () => !!process.env.API_KEY;

const pickOne = (items: string[]) => items[Math.floor(Math.random() * items.length)];

const getLocalPetThought = (pet: PetState, weather: WeatherType, time: TimeOfDay) => {
  const generic = [
    "꼬리 살랑~ 기분 최고! 🐾",
    "오늘은 낮잠 각이야… 😴",
    "간식 생각 중! 🍪",
    "풀냄새가 좋아! 🌿",
    "주인님, 같이 놀자! 🎾",
    "햇살 따뜻해~ ☀️",
    "바람 냄새 킁킁! 🌬️",
  ];
  const byWeather: Record<WeatherType, string[]> = {
    [WeatherType.SUNNY]: ["햇살 샤워 중! ☀️", "그림자에서 뒹굴~ 😎"],
    [WeatherType.CLOUDY]: ["구름 폭신~ ☁️", "하늘이 포근해! 🌥️"],
    [WeatherType.RAINY]: ["빗소리 자장가… 🌧️", "빗방울 톡톡! ☔"],
    [WeatherType.SNOWY]: ["눈! 눈! 눈! ❄️", "코끝이 시려~ ⛄"],
  };
  const byTime: Record<TimeOfDay, string[]> = {
    [TimeOfDay.DAY]: ["낮 산책 가자! 🚶", "햇빛 반짝! ✨"],
    [TimeOfDay.SUNSET]: ["노을 너무 예뻐! 🌇", "저녁 바람 솔솔~ 🌆"],
    [TimeOfDay.PINK]: ["핑크 하늘 설렌다! 💗", "오늘 하늘 달콤해! 🍬"],
    [TimeOfDay.NIGHT]: ["별빛 구경 중… 🌙", "밤 공기 시원해! 🌌"],
    [TimeOfDay.DAWN]: ["해 뜨는 냄새! 🌅", "아침 공기 상쾌~ 🍃"],
    [TimeOfDay.SUNRISE]: ["해가 솟는다! 🌄", "오늘도 좋은 하루! 🌞"],
  };
  const byType: Record<string, string[]> = {
    Maltese: ["보송보송 기분~ 🐶", "구름처럼 둥실! ☁️"],
    Poodle: ["곱슬곱슬 산책~ 🐩", "기분 좋게 뛰어! 🐾"],
    Bichon: ["솜사탕 모드! 🍥", "폭신폭신~ ☁️"],
    Shiba: ["꼬리 말림 완벽! 🦊", "느긋하게 멍~ 😌"],
    CheeseCat: ["치즈 냠! 🧀", "냥냥~ 🐱"],
    SpottedCat: ["무늬 자랑 중! 🐾", "햇살 자리 찜! ☀️"],
    Koala: ["나무 향 좋아~ 🌿", "졸려… 🐨"],
    Quokka: ["웃으면 복이 와! 😊", "기분 최고~ 😄"],
    Turtle: ["천천히, 하지만 확실히! 🐢", "물가가 좋아~ 💧"],
    WhiteBird: ["날개 살랑~ 🐦", "하늘이 좋아! ☁️"],
  };

  const pool = [
    ...(byType[pet.type] ?? []),
    ...(byWeather[weather] ?? []),
    ...(byTime[time] ?? []),
    ...generic,
  ];
  return pickOne(pool);
};

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
  if (!isAiAvailable()) return getLocalPetThought(pet, weather, time);

  const prompt = `
    You are a cute ${pet.type} named ${pet.name} in a cozy camping game like Animal Crossing.
    The current weather is ${weather} and it is ${time}.
    Write a very short, cute thought bubble (max 15 words) that you are thinking right now.
    Be whimsical and adorable. Use an emoji.
  `;

  try {
    const response = await generateContentWithRetry(prompt);
    return response?.text?.trim() || getLocalPetThought(pet, weather, time);
  } catch (error) {
    // Silently fall back on quota errors to prevent console spam
    return getLocalPetThought(pet, weather, time);
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
