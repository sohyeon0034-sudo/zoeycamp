export enum WeatherType {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
  CLOUDY = 'CLOUDY',
  SNOWY = 'SNOWY'
}

export enum TimeOfDay {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  SUNSET = 'SUNSET',
  DAWN = 'DAWN',
  SUNRISE = 'SUNRISE',
  PINK = 'PINK'
}

export enum FloorType {
  GRASS = 'GRASS',
  SNOW = 'SNOW',
  SAND = 'SAND',
  DIRT = 'DIRT'
}

export enum WaterTheme {
  BLUE = 'BLUE',
  EMERALD = 'EMERALD'
}

export enum ItemCategory {
  FURNITURE = 'FURNITURE',
  DECORATION = 'DECORATION',
  PLANT = 'PLANT',
  FOOD = 'FOOD',
  VEHICLE = 'VEHICLE'
}

export type PoseType = 'IDLE' | 'SIT' | 'LIE';

export interface ItemBlueprint {
  id: string;
  name: string;
  icon: string;
  category: ItemCategory;
}

export interface GameItem extends ItemBlueprint {
  itemId: string; // Stores the blueprint ID (e.g., 'camping_chair') distinct from the instance ID
  position: [number, number, number]; // x, y, z in 3D space
  rotation: [number, number, number];
  itemState?: any; // For interactive items like car trunk
}

export type TentSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface TentState {
  id: string;
  type: 'TRIANGLE' | 'SQUARE' | 'WINDOW'; 
  size: TentSize;
  pattern: 'ORANGE' | 'RED' | 'DOTS' | 'RAINBOW' | 'HEARTS' | 'YELLOW_STARS' | 'KHAKI_OUTDOOR'; 
  rug: 'ETHNIC' | 'BLUE_FUR' | 'SILVER' | 'VINTAGE'; 
  isLit: boolean;
  isDoorOpen: boolean;
  position: [number, number, number];
}

export interface AvatarState {
  id: string; // Add ID to identify main vs partner
  gender: 'MALE' | 'FEMALE'; // Added gender
  skinTone: 'TONE1' | 'TONE2' | 'TONE3' | 'TONE4';
  // Female & Male Options Combined for Type Safety
  outfit: 'YELLOW_MIDI_DRESS' | 'WHITE_FLOWER_DRESS' | 'BURGUNDY_SWEAT_JEAN_SKIRT' | 'JEANS_BLOUSE' | 'YELLOW_SHORTS' | 'BLACK_CHIC' | 'BLACK_SUIT' | 'WHITE_SHIRT_JEANS' | 'NAVY_HOODIE' | 'GREY_HOODIE' | 'YELLOW_RAINCOAT' | 'PINK_BIKINI' | 'SKY_BIKINI_SKIRT' | 'PURPLE_BIKINI_GRADIENT_SKIRT' | 'BLACK_ONEPIECE' | 'BLACK_BOXERS' | 'BLACK_RASHGUARD';
  shoes: 'RED_CANVAS' | 'BLACK_BOOTS' | 'GREEN_SNEAKERS' | 'BLACK_SANDALS' | 'GREY_SNEAKERS' | 'BLACK_SNEAKERS_M' | 'BAREFOOT';
  hairstyle: 'LONG' | 'SHORT' | 'PONYTAIL' | 'PONYTAIL_PINK' | 'BUN_GREEN' | 'HIPPIE';
  blush: 'NONE' | 'SOFT_PINK' | 'HOT_PINK' | 'ORANGE';
  accessories: string[]; 
  position: [number, number, number];
  rotation: [number, number, number]; // Added rotation for movable friends
  pose: PoseType; 
}

export interface PetState {
  id: string; // Needs ID for multiple pets
  name: string;
  type: string; 
  mood: string;
  lastThought: string;
  icon: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Added rotation
}

export interface GameState {
  weather: WeatherType;
  time: TimeOfDay;
  floor: FloorType; // Added Floor Type
  waterTheme: WaterTheme;
  islandTheme: string; 
  cameraMode: 'ISLAND' | 'TENT_INTERIOR';
  tents: TentState[];
  placedItems: GameItem[];
  avatar: AvatarState;
  partners: AvatarState[]; // Changed from single partner to array
  pets: PetState[]; // Changed from single pet to array
}
