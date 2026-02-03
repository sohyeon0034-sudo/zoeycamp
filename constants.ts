import { ItemCategory, ItemBlueprint, FloorType } from './types';

export const ISLAND_THEMES = [
  { id: 'forest', name: 'Pine Forest', url: 'https://picsum.photos/id/10/800/600' },
  { id: 'beach', name: 'Sunny Beach', url: 'https://picsum.photos/id/1047/800/600' },
  { id: 'meadow', name: 'Flower Meadow', url: 'https://picsum.photos/id/28/800/600' },
  { id: 'mountain', name: 'High Peaks', url: 'https://picsum.photos/id/29/800/600' },
];

export const FLOOR_OPTIONS = [
    { id: FloorType.GRASS, name: 'Fresh Grass', color: '#57b864', icon: '🌿' },
    { id: FloorType.SNOW, name: 'Snowy Ground', color: '#f1f2f6', icon: '❄️' },
    { id: FloorType.SAND, name: 'Sandy Beach', color: '#f7d794', icon: '🏖️' },
    { id: FloorType.DIRT, name: 'Dirt Path', color: '#cd6133', icon: '🟤' },
];

export const AVAILABLE_ITEMS: ItemBlueprint[] = [
  // Plants (Nature)
  { id: 'tree_pine', name: 'Pine Tree', icon: '🌲', category: ItemCategory.PLANT },
  { id: 'tree_round', name: 'Round Tree', icon: '🌳', category: ItemCategory.PLANT },
  { id: 'tree_zelkova', name: 'Zelkova', icon: '🥦', category: ItemCategory.PLANT },
  { id: 'tree_birch', name: 'Birch Tree', icon: '🎋', category: ItemCategory.PLANT },
  { id: 'tree_palm', name: 'Palm Tree', icon: '🌴', category: ItemCategory.PLANT },
  { id: 'tree_lemon', name: 'Lemon Tree', icon: '🍋', category: ItemCategory.PLANT },
  { id: 'tree_baobab', name: 'Baobab Tree', icon: '🌳', category: ItemCategory.PLANT },
  { id: 'mini_tree', name: 'Mini Tree', icon: '🎄', category: ItemCategory.PLANT },

  // Furniture
  { id: 'ev_car', name: 'Cozy EV Camper', icon: '🚙', category: ItemCategory.VEHICLE },
  { id: 'sunbed', name: 'Sunbed', icon: '🏖️', category: ItemCategory.FURNITURE },
  { id: 'picnic_mat', name: 'Picnic Mat', icon: '🏁', category: ItemCategory.FURNITURE },
  { id: 'orange_mat', name: 'Round Mat', icon: '🟠', category: ItemCategory.FURNITURE },
  { id: 'camping_chair', name: 'Camping Chair', icon: '🪑', category: ItemCategory.FURNITURE },
  { id: 'camping_table', name: 'Camping Table', icon: '🪵', category: ItemCategory.FURNITURE },
  { id: 'camping_box', name: 'Cargo Box', icon: '📦', category: ItemCategory.FURNITURE },
  { id: 'picnic_table_small', name: 'Picnic Table', icon: '🧺', category: ItemCategory.FURNITURE },
  
  // Decoration
  { id: 'snowman', name: 'Snowman', icon: '☃️', category: ItemCategory.DECORATION },
  { id: 'snow_pile', name: 'Snow Pile', icon: '❄️', category: ItemCategory.DECORATION },
  { id: 'lantern', name: 'Camping Lantern', icon: '🏮', category: ItemCategory.DECORATION },
  { id: 'wood_lamp', name: 'Wood Street Lamp', icon: '💡', category: ItemCategory.DECORATION },
  { id: 'candle', name: 'Candle', icon: '🕯️', category: ItemCategory.DECORATION },
  { id: 'flashlight', name: 'Flashlight', icon: '🔦', category: ItemCategory.DECORATION },
  { id: 'campfire', name: 'Campfire', icon: '🔥', category: ItemCategory.DECORATION },
  { id: 'duck_float', name: 'Duck Float', icon: '🛟', category: ItemCategory.DECORATION },
  { id: 'duck_feet', name: 'Duck Feet', icon: '🦆', category: ItemCategory.DECORATION },
  { id: 'pond', name: 'Small Pond', icon: '💧', category: ItemCategory.DECORATION },
  { id: 'sandcastle', name: 'Sandcastle', icon: '🏰', category: ItemCategory.DECORATION },
  { id: 'surfboard', name: 'Surfboard', icon: '🏄', category: ItemCategory.DECORATION },
  { id: 'mailbox', name: 'Mailbox', icon: '📮', category: ItemCategory.DECORATION },
  { id: 'teddy_bear', name: 'Teddy Bear', icon: '🧸', category: ItemCategory.DECORATION },
  { id: 'books', name: 'Book Stack', icon: '📚', category: ItemCategory.DECORATION },
  { id: 'radio', name: 'Retro Radio', icon: '📻', category: ItemCategory.DECORATION },
  { id: 'game_console', name: 'Game Console', icon: '🎮', category: ItemCategory.DECORATION },
  { id: 'laptop', name: 'Laptop', icon: '💻', category: ItemCategory.DECORATION },
  { id: 'suitcase', name: 'Pink Suitcase', icon: '🧳', category: ItemCategory.DECORATION },
  { id: 'first_aid', name: 'First Aid Kit', icon: '⛑️', category: ItemCategory.DECORATION },

  // Food
  { id: 'coffee_cup', name: 'Takeout Coffee', icon: '🥤', category: ItemCategory.FOOD },
  { id: 'marshmallow', name: 'Marshmallow', icon: '🍡', category: ItemCategory.FOOD },
  { id: 'tangerine', name: 'Tiny Tangerine', icon: '🍊', category: ItemCategory.FOOD },
  { id: 'tteokbokki', name: 'Tteokbokki', icon: '🍢', category: ItemCategory.FOOD },
  { id: 'pot', name: 'Cooking Pot', icon: '🍲', category: ItemCategory.FOOD },
  { id: 'coffee_pot', name: 'Coffee Pot', icon: '☕', category: ItemCategory.FOOD },
  { id: 'camping_burner', name: 'Camping Burner', icon: '🍳', category: ItemCategory.FOOD },
  { id: 'ramen_pot', name: 'Ramen Pot', icon: '🍜', category: ItemCategory.FOOD },
  { id: 'spoon_chopsticks', name: 'Spoon & Chopsticks', icon: '🥢', category: ItemCategory.FOOD },
  { id: 'choco_cookie', name: 'Pistachio Choco Cookie', icon: '🍪', category: ItemCategory.FOOD },
];

// --- Female Avatar Assets ---
export const AVATAR_OUTFITS = [
  { id: 'YELLOW_MIDI_DRESS', name: 'Yellow Midi Dress', icon: '💛' },
  { id: 'WHITE_FLOWER_DRESS', name: 'Yellow Flower Dress', icon: '🌼' },
  { id: 'BURGUNDY_SWEAT_JEAN_SKIRT', name: 'Burgundy Sweat + Denim Skirt', icon: '👚' },
  { id: 'JEANS_BLOUSE', name: 'Jeans & White', icon: '👖' },
  { id: 'YELLOW_SHORTS', name: 'Yellow & Black', icon: '👕' },
  { id: 'BLACK_CHIC', name: 'All Black', icon: '🖤' },
  { id: 'YELLOW_RAINCOAT', name: 'Raincoat', icon: '🧥' },
  { id: 'PINK_BIKINI', name: 'Pink Bikini', icon: '👙' },
  { id: 'SKY_BIKINI_SKIRT', name: 'Sky Bikini + Skirt', icon: '🩵' },
  { id: 'PURPLE_BIKINI_GRADIENT_SKIRT', name: 'Purple Bikini + Gradient Skirt', icon: '💜' },
  { id: 'BLACK_ONEPIECE', name: 'Black Swimsuit', icon: '🩱' },
];

export const AVATAR_SHOES = [
  { id: 'RED_CANVAS', name: 'Red Canvas', icon: '👟' },
  { id: 'BLACK_BOOTS', name: 'Black Boots', icon: '👢' },
  { id: 'GREEN_SNEAKERS', name: 'Green Kicks', icon: '🟢' },
  { id: 'BLACK_SANDALS', name: 'Sandals', icon: '🩴' },
  { id: 'BAREFOOT', name: 'Barefoot', icon: '🦶' },
];

export const AVATAR_HAIRSTYLES = [
  { id: 'SHORT', name: 'Bob', icon: '👩🏻‍🦰' },
  { id: 'LONG', name: 'Long', icon: '👩🏻' },
  { id: 'PONYTAIL', name: 'Ponytail', icon: '👱🏻‍♀️' },
  { id: 'PONYTAIL_PINK', name: 'Ponytail (Pink Tie)', icon: '🎀' },
  { id: 'BUN_GREEN', name: 'Top Bun (Green Tie)', icon: '🟢' },
  { id: 'HIPPIE', name: 'Hippie Perm', icon: '🌀' },
];

export const AVATAR_ACCESSORIES = [
  { id: 'HAT', name: 'Cap', icon: '🧢' },
  { id: 'HEADSET', name: 'Headset', icon: '🎧' },
  { id: 'EARRINGS', name: 'Earrings', icon: '✨' },
  { id: 'EARRINGS_HOOP', name: 'Hoop Earrings', icon: '⭕' },
  { id: 'FLOWER_PIN', name: 'Aloha Flower', icon: '🌺' },
  { id: 'FLORAL_CAP', name: 'Floral Swim Cap', icon: '🌸' },
];

// --- Male Partner Assets ---
export const PARTNER_OUTFITS = [
    { id: 'BLACK_SUIT', name: 'Black Suit', icon: '🕴️' },
    { id: 'WHITE_SHIRT_JEANS', name: 'White & Jeans', icon: '👕' },
    { id: 'NAVY_HOODIE', name: 'Navy Hoodie', icon: '🧥' },
    { id: 'GREY_HOODIE', name: 'Grey Hoodie', icon: '🌪️' },
    { id: 'YELLOW_RAINCOAT', name: 'Raincoat', icon: '🧥' },
    { id: 'BLACK_BOXERS', name: 'Swim Shorts', icon: '🩳' },
    { id: 'BLACK_RASHGUARD', name: 'Rashguard', icon: '🏄' },
];

export const PARTNER_SHOES = [
    { id: 'GREY_SNEAKERS', name: 'Grey Kicks', icon: '👟' },
    { id: 'BLACK_SNEAKERS_M', name: 'Black Kicks', icon: '👞' },
    { id: 'BAREFOOT', name: 'Barefoot', icon: '🦶' },
];

export const PARTNER_HAIRSTYLES = [
    { id: 'SHORT', name: 'Bob', icon: '👦🏻' },
    { id: 'LONG', name: 'Long', icon: '🧑🏻' },
    { id: 'PONYTAIL', name: 'Ponytail', icon: '🧑🏻‍🦱' },
];

export const PARTNER_ACCESSORIES = [
    { id: 'GLASSES', name: 'Glasses', icon: '👓' },
    { id: 'HEADSET_WHITE', name: 'Headset', icon: '🎧' },
    { id: 'WATCH', name: 'Watch', icon: '⌚' },
    { id: 'KEYBOARD', name: 'Keyboard', icon: '⌨️' },
];

export const AVATAR_BLUSH = [
  { id: 'NONE', name: 'None', icon: '😐' },
  { id: 'HOT_PINK', name: 'Hot Pink', icon: '😳' },
];

export const PET_TYPES = [
  { type: 'Maltese', icon: '🐶' },
  { type: 'Poodle', icon: '🐩' },
  { type: 'Bichon', icon: '☁️' },
  { type: 'Shiba', icon: '🐕' },
  { type: 'CheeseCat', icon: '🐱' },
  { type: 'SpottedCat', icon: '🐆' },
  { type: 'Koala', icon: '🐨' },
  { type: 'Quokka', icon: '🐻' },
  { type: 'Turtle', icon: '🐢' },
  { type: 'WhiteBird', icon: '🕊️' },
];

export const TENT_PATTERNS = [
    { id: 'ORANGE', name: 'Classic Orange', icon: '🟠' },
    { id: 'RED', name: 'Red', icon: '🔴' },
    { id: 'DOTS', name: 'Black & Dots', icon: '⚫' },
    { id: 'RAINBOW', name: 'Rainbow', icon: '🌈' },
    { id: 'HEARTS', name: 'Pink Hearts', icon: '💖' },
    { id: 'YELLOW_STARS', name: 'Yellow Stars', icon: '⭐' },
    { id: 'KHAKI_OUTDOOR', name: 'Khaki Outdoor', icon: '🏕️' },
];

export const RUG_OPTIONS = [
    { id: 'ETHNIC', name: 'Ethnic Brown', icon: '🟤' },
    { id: 'BLUE_FUR', name: 'Blue Mustang', icon: '🔵' },
    { id: 'SILVER', name: 'Silver Foil', icon: '💿' },
    { id: 'VINTAGE', name: 'Vintage Cloth', icon: '📜' },
];
