import React, { useState, useEffect, useRef } from 'react';
import { GameState, WeatherType, TimeOfDay, GameItem, ItemBlueprint, PetState, AvatarState, ItemCategory, FloorType, WaterTheme, TentState, TentSize } from '../types';
import { 
    AVAILABLE_ITEMS, 
    AVATAR_OUTFITS, AVATAR_SHOES, AVATAR_HAIRSTYLES, AVATAR_ACCESSORIES, AVATAR_BLUSH, 
    PARTNER_OUTFITS, PARTNER_SHOES, PARTNER_HAIRSTYLES, PARTNER_ACCESSORIES,
    PET_TYPES, TENT_PATTERNS, RUG_OPTIONS, FLOOR_OPTIONS
} from '../constants';
import * as THREE from 'three';

interface ControlPanelProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onRemoveItem: (id: string) => void;
  onRotateItem: (id: string, angleDelta: number) => void;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  panelMode?: 'FULL' | 'WEATHER';
}

const WATER_THEME_OPTIONS = [
  { id: WaterTheme.BLUE, name: 'Blue', color: '#3a9ed6', icon: '🌊' },
  { id: WaterTheme.EMERALD, name: 'Emerald', color: '#39c6b2', icon: '🟢' }
];
const SKIN_TONE_OPTIONS = [
  { id: 'TONE1', name: '1', color: '#ffdecb' },
  { id: 'TONE2', name: '2', color: '#f2c4a4' },
  { id: 'TONE3', name: '3', color: '#d79a7a' },
  { id: 'TONE4', name: '4', color: '#b87958' }
];
const TENT_SIZE_OPTIONS: { id: TentSize; name: string; short: string }[] = [
  { id: 'SMALL', name: 'Small', short: 'S' },
  { id: 'MEDIUM', name: 'Medium', short: 'M' },
  { id: 'LARGE', name: 'Large', short: 'L' }
];

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  gameState, 
  setGameState, 
  selectedItemId, 
  setSelectedItemId,
  onRemoveItem,
  onRotateItem,
  isEditMode,
  setIsEditMode,
  panelMode = 'FULL'
}) => {
  const [activeTab, setActiveTab] = useState<'ENV' | 'YOU' | 'FRIEND' | 'PETS' | 'DECOR' | 'TENT' | 'NATURE'>(panelMode === 'WEATHER' ? 'ENV' : 'YOU');
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedTentId, setSelectedTentId] = useState<string | null>(null);
  const isWeatherOnly = panelMode === 'WEATHER';

  // If an item/pet is selected, we want to show the Edit Interface, overriding normal tabs
  const selectedItem = gameState.placedItems.find(i => i.id === selectedItemId);
  const selectedPet = gameState.pets.find(p => p.id === selectedItemId);
  // Check if partner is selected (using 'friend_' prefix)
  const isPartnerSelected = selectedItemId?.startsWith('friend_');
  const selectedPartner = gameState.partners.find(p => p.id === selectedItemId);
  const selectedTentFromSelection = selectedItemId && gameState.tents.some(t => t.id === selectedItemId) ? selectedItemId : null;
  const activeTentId = selectedTentFromSelection ?? selectedTentId ?? gameState.tents[0]?.id;
  const activeTent = gameState.tents.find(t => t.id === activeTentId);

  const prevEditModeRef = useRef(isEditMode);

  useEffect(() => {
    if (isWeatherOnly) return;
    const prev = prevEditModeRef.current;
    if (isEditMode && !prev) {
      setIsMinimized(false);
    }
    if (!isEditMode && prev) {
      setIsMinimized(true);
      if (selectedItemId) setSelectedItemId(null);
    }
    prevEditModeRef.current = isEditMode;
  }, [isEditMode, selectedItemId, setSelectedItemId, isWeatherOnly]);

  useEffect(() => {
    if (isWeatherOnly) {
      if (activeTab !== 'ENV') setActiveTab('ENV');
      setIsMinimized(false);
      return;
    }
    if (activeTab === 'ENV') setActiveTab('YOU');
  }, [isWeatherOnly, activeTab]);

  useEffect(() => {
    if (selectedTentFromSelection) {
      setSelectedTentId(selectedTentFromSelection);
    }
  }, [selectedTentFromSelection]);

  useEffect(() => {
    if (!selectedTentId && gameState.tents[0]) {
      setSelectedTentId(gameState.tents[0].id);
    }
  }, [gameState.tents, selectedTentId]);

  const handleTogglePanel = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    if (!next && !isWeatherOnly) {
      setIsEditMode(true);
    }
  };

  const addItem = (item: ItemBlueprint) => {
    if (item.id === 'mailbox') {
      const existing = gameState.placedItems.find(existingItem => existingItem.itemId === 'mailbox');
      if (existing) {
        setSelectedItemId(existing.id);
        return;
      }
    }
    const x = (Math.random() - 0.5) * 6; // Spread slightly wider
    const z = (Math.random() - 0.5) * 6;
    
    // Snap to grid initially
    const snappedX = Math.round(x / 0.5) * 0.5;
    const snappedZ = Math.round((z + 2) / 0.5) * 0.5;

    const newItem: GameItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9), // Unique instance ID
      itemId: item.id, // Preserve the blueprint type ID
      position: [snappedX, 0, snappedZ],
      rotation: [0, 0, 0]
    };
    
    setGameState(prev => ({
      ...prev,
      placedItems: [...prev.placedItems, newItem]
    }));
    setSelectedItemId(newItem.id); 
  };

  const updateTent = (updates: Partial<TentState>) => {
    if (!activeTentId) return;
    setGameState(prev => ({
      ...prev,
      tents: prev.tents.map(tent => tent.id === activeTentId ? { ...tent, ...updates } : tent)
    }));
  };

  const addTent = () => {
    const newTent: TentState = {
      id: `tent_${Date.now()}`,
      type: 'TRIANGLE',
      size: 'MEDIUM',
      pattern: 'ORANGE',
      rug: 'ETHNIC',
      isLit: false,
      isDoorOpen: true,
      position: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6]
    };
    setGameState(prev => ({
      ...prev,
      tents: [...prev.tents, newTent]
    }));
    setSelectedTentId(newTent.id);
    setSelectedItemId(newTent.id);
  };

  const removeTent = (id: string) => {
    const remaining = gameState.tents.filter(tent => tent.id !== id);
    if (remaining.length === 0) return;
    setGameState(prev => ({
      ...prev,
      tents: prev.tents.filter(tent => tent.id !== id)
    }));
    const nextId = remaining[0]?.id ?? null;
    setSelectedTentId(nextId);
    const nextSelectedItemId = selectedItemId === id ? nextId : selectedItemId;
    setSelectedItemId(nextSelectedItemId);
  };

  const addPet = (type: string, icon: string) => {
      const newPet: PetState = {
          id: Math.random().toString(36).substr(2, 9),
          name: type,
          type: type,
          icon: icon,
          mood: 'Happy',
          lastThought: '',
          position: [-2 + Math.random(), 0, 3 + Math.random()],
          rotation: [0, 0, 0]
      };
      setGameState(prev => ({
          ...prev,
          pets: [...prev.pets, newPet]
      }));
      setSelectedItemId(newPet.id);
  };

  const addFriend = (gender: 'MALE' | 'FEMALE') => {
      if (gameState.partners.length >= 3) return;

      const newFriend: AvatarState = {
          id: `friend_${Date.now()}`,
          gender: gender,
          skinTone: 'TONE1',
          outfit: gender === 'MALE' ? 'BLACK_SUIT' : 'SKY_BIKINI_SKIRT',
          shoes: gender === 'MALE' ? 'BLACK_SNEAKERS_M' : 'RED_CANVAS',
          hairstyle: gender === 'MALE' ? 'SHORT' : 'LONG',
          blush: 'NONE',
          accessories: [],
          position: [-2 + Math.random(), 0, 3 + Math.random()],
          rotation: [0, 0, 0],
          pose: 'IDLE'
      };

      setGameState(prev => ({
          ...prev,
          partners: [...prev.partners, newFriend]
      }));
      setSelectedFriendId(newFriend.id);
      setSelectedItemId(newFriend.id);
  };

  const removeFriend = (id: string) => {
      setGameState(prev => ({
          ...prev,
          partners: prev.partners.filter(p => p.id !== id)
      }));
      setSelectedFriendId(null);
      setSelectedItemId(null);
  };

  const toggleAccessory = (id: string, targetId?: string) => {
    setGameState(prev => {
      const isFriend = !!targetId;
      const target = isFriend ? prev.partners.find(p => p.id === targetId) : prev.avatar;
      
      if (!target) return prev;

      const current = target.accessories;
      const isEquipped = current.includes(id);
      const newAccessories = isEquipped ? current.filter(a => a !== id) : [...current, id];

      if (isFriend) {
          return {
              ...prev,
              partners: prev.partners.map(p => p.id === targetId ? { ...p, accessories: newAccessories } : p)
          };
      } else {
          return { ...prev, avatar: { ...prev.avatar, accessories: newAccessories } };
      }
    });
  };

  const togglePose = (targetId?: string) => {
      setGameState(prev => {
          const isFriend = !!targetId;
          const target = isFriend ? prev.partners.find(p => p.id === targetId) : prev.avatar;
          if (!target) return prev;

          const currentPose = target.pose;
          let nextPose: 'IDLE' | 'SIT' | 'LIE' = 'IDLE';
          let pos: [number, number, number] = target.position;

          if (currentPose === 'IDLE') {
              nextPose = 'SIT'; 
              // If main avatar, sit by tent logic. If friend, simple sit where they are (or shift slightly)
              if (!isFriend) {
                  pos = [3, 0, -3];
              }
          } else if (currentPose === 'SIT') {
              nextPose = 'LIE';
              if (!isFriend) {
                  pos = [3.5, 0, -3.5];
              }
          } else {
              nextPose = 'IDLE'; 
              if (!isFriend) {
                  pos = [2, 0, 4];
              }
          }

          if (isFriend) {
              return {
                  ...prev,
                  partners: prev.partners.map(p => p.id === targetId ? { ...p, pose: nextPose } : p)
              };
          } else {
              return {
                  ...prev,
                  cameraMode: 'ISLAND',
                  avatar: {
                      ...prev.avatar,
                      pose: nextPose,
                      position: pos
                  }
              }
          }
      });
  };

  // --- Render Edit Mode if Item Selected ---
  if (isEditMode && (selectedItem || selectedPet || isPartnerSelected)) {
    const isPet = !!selectedPet;
    const isFriend = isPartnerSelected;
    
    let name = "Unknown";
    let icon = "❓";

    if (selectedItem) {
        name = selectedItem.name;
        icon = selectedItem.icon;
    } else if (selectedPet) {
        name = selectedPet.name;
        icon = selectedPet.icon;
    } else if (isFriend && selectedPartner) {
        name = selectedPartner.gender === 'MALE' ? "Male Friend" : "Female Friend";
        icon = selectedPartner.gender === 'MALE' ? "👦" : "👧";
    }

    return (
      <div className="w-80 max-w-[20rem] min-w-[20rem] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border-2 border-orange-100 animate-pop shrink-0">
          <div className="bg-orange-50 px-3 py-2 border-b border-orange-100 flex items-center justify-between">
            <div className="w-5" /> {/* Spacer for centering */}
            <h2 className="text-base font-black text-orange-600 tracking-wide text-center">
               EDIT {isPet ? 'PET' : (isFriend ? 'FRIEND' : 'ITEM')}
            </h2>
            <button onClick={() => setSelectedItemId(null)} className="text-orange-300 hover:text-orange-500">
               <span className="text-lg">✅</span>
            </button>
          </div>

          <div className="px-3 pt-3 pb-5 flex flex-col items-center justify-start gap-4">
              <div className="flex items-center gap-3 w-full">
                 <div className="text-3xl">{icon}</div>
                 <div className="text-left">
                   <div className="text-sm font-bold text-slate-700">{name}</div>
                   <div className="text-[11px] text-slate-400">
                     {isPet ? 'Pet' : (isFriend ? 'Friend' : 'Item')}
                   </div>
                 </div>
              </div>

              <div className="flex gap-3 w-full justify-center">
                  <button 
                      onClick={() => onRotateItem(selectedItemId!, -Math.PI / 4)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-500 shadow-sm active:scale-95 transition-all"
                      title="Rotate Left"
                  >
                      <span className="text-lg">↺</span>
                  </button>
                  <button 
                      onClick={() => onRotateItem(selectedItemId!, Math.PI / 4)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-500 shadow-sm active:scale-95 transition-all"
                      title="Rotate Right"
                  >
                      <span className="text-lg">↻</span>
                  </button>
                  <div className="w-px bg-slate-200 mx-1"></div>

                  <button 
                    onClick={() => isFriend ? removeFriend(selectedItemId!) : onRemoveItem(selectedItemId!)}
                    className="flex-1 py-2 bg-red-50 border border-red-100 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <span className="text-base">🗑️</span> {isPet ? 'Send Home' : (isFriend ? 'Dismiss' : 'Delete')}
                  </button>
              </div>
          </div>
      </div>
    );
  }

  // Render Styling Controls Helper
  const renderStyleControls = (targetFriendId?: string) => {
      const isFriend = !!targetFriendId;
      const target = isFriend ? gameState.partners.find(p => p.id === targetFriendId) : gameState.avatar;
      
      if (!target) return null;

      const isMale = target.gender === 'MALE';

      // Select data source based on gender
      const outfits = isMale ? PARTNER_OUTFITS : AVATAR_OUTFITS;
      const shoes = isMale ? PARTNER_SHOES : AVATAR_SHOES;
      const hairstyles = isMale ? PARTNER_HAIRSTYLES : AVATAR_HAIRSTYLES;
      const accessories = isMale ? PARTNER_ACCESSORIES : AVATAR_ACCESSORIES;

      const updateTarget = (updates: any) => {
          setGameState(prev => {
              if (isFriend) {
                  return {
                      ...prev,
                      partners: prev.partners.map(p => p.id === targetFriendId ? { ...p, ...updates } : p)
                  };
              } else {
                  return { ...prev, avatar: { ...prev.avatar, ...updates } };
              }
          });
      };

      return (
        <div className="space-y-6 animate-pop">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Outfit</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {outfits.map(o => (
                  <button
                    key={o.id}
                    onClick={() => updateTarget({ outfit: o.id })}
                    className={`min-w-[70px] py-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        target.outfit === o.id ? 'border-pink-300 bg-pink-50' : 'border-slate-100 bg-white'
                    }`}
                  >
                     <span className="text-xl">{o.icon}</span>
                     <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center px-1">{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Shoes</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {shoes.map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateTarget({ shoes: s.id })}
                    className={`min-w-[70px] py-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        target.shoes === s.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-white'
                    }`}
                  >
                     <span className="text-xl">{s.icon}</span>
                     <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center px-1">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Accessories</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {accessories.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleAccessory(a.id, targetFriendId)}
                    className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center text-lg shrink-0 border border-slate-100 transition-all ${target.accessories.includes(a.id) ? 'bg-purple-50 ring-2 ring-purple-300' : 'opacity-70'}`}
                    title={a.name}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>

            {!isMale && (
             <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Cheeks</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {AVATAR_BLUSH.map(b => (
                  <button
                    key={b.id}
                    onClick={() => updateTarget({ blush: b.id })}
                    className={`px-3 py-2 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 border border-slate-100 ${target.blush === b.id ? 'ring-2 ring-red-300 bg-red-50' : ''}`}
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Hair</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {hairstyles.map(h => (
                  <button
                    key={h.id}
                    onClick={() => updateTarget({ hairstyle: h.id })}
                    className={`px-3 py-2 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 border border-slate-100 ${target.hairstyle === h.id ? 'ring-2 ring-orange-300 bg-orange-50' : ''}`}
                  >
                    <span className="text-lg">{h.icon}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{h.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Skin Tone</span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {SKIN_TONE_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateTarget({ skinTone: s.id })}
                    className={`px-3 py-2 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100 ${target.skinTone === s.id ? 'ring-2 ring-amber-300 bg-amber-50' : ''}`}
                    title={`Tone ${s.name}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] text-slate-500 font-bold ml-2">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
        </div>
      );
  }

  // Adjusted Height Logic for Mobile: use percentage height (e.g. 55vh) instead of fixed pixel on small screens
  // to ensure the bottom navigation bar is visible.
  return (
    <div className={`w-80 max-w-[20rem] min-w-[20rem] bg-white/80 backdrop-blur-md rounded-3xl shadow-xl flex flex-col overflow-hidden border border-white/50 transition-all duration-300 ease-in-out shrink-0 ${isMinimized ? 'h-16' : 'h-[calc(55vh-30px)] md:h-[470px]'}`}>
      
      {/* Header */}
      <div 
        className="bg-slate-100/50 px-3 py-2 border-b border-white/50 flex justify-between items-center cursor-pointer hover:bg-slate-100/80 transition-colors"
        onClick={handleTogglePanel}
      >
        <div className="w-5" /> {/* Spacer for centering */}
        <h2 className="text-sm font-black text-slate-700 text-center tracking-wide">{isWeatherOnly ? 'WEATHER' : 'EDIT'}</h2>
        <button className="text-slate-400 hover:text-slate-600">
          <span className="text-lg">{isMinimized ? '🔼' : '🔽'}</span>
        </button>
      </div>

      {/* Screen Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        
        {/* Environment Controls */}
        {isWeatherOnly && activeTab === 'ENV' && (
          <div className="space-y-6 animate-pop">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Atmosphere</h3>
            
            <div className="space-y-3">
              <div className="bg-blue-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-blue-400 block mb-2">Weather</span>
                <div className="grid grid-cols-4 gap-1">
                  {[WeatherType.SUNNY, WeatherType.CLOUDY, WeatherType.RAINY, WeatherType.SNOWY].map(w => (
                    <button
                      key={w}
                      onClick={() => setGameState(prev => ({ ...prev, weather: w }))}
                      className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                        gameState.weather === w 
                        ? 'bg-white shadow-sm scale-105 ring-2 ring-blue-100' 
                        : 'text-slate-400 hover:bg-white/50'
                      }`}
                      title={w}
                    >
                      {w === WeatherType.SUNNY ? <span className="text-lg">☀️</span> : 
                       w === WeatherType.RAINY ? <span className="text-lg">🌧️</span> : 
                       w === WeatherType.SNOWY ? <span className="text-lg">❄️</span> : 
                       <span className="text-lg">☁️</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-indigo-400 block mb-2">Time</span>
                <div className="grid grid-cols-6 gap-1">
                  {[TimeOfDay.DAY, TimeOfDay.SUNSET, TimeOfDay.PINK, TimeOfDay.NIGHT, TimeOfDay.DAWN, TimeOfDay.SUNRISE].map(t => (
                    <button
                      key={t}
                      onClick={() => setGameState(prev => ({ ...prev, time: t }))}
                      className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                        gameState.time === t
                        ? 'bg-white text-indigo-600 shadow-sm scale-105 ring-2 ring-indigo-100' 
                        : 'text-slate-400 hover:bg-white/50'
                      }`}
                      title={t}
                    >
                       {t === TimeOfDay.DAY ? <span className="text-lg">☀️</span> :
                        t === TimeOfDay.SUNSET ? <span className="text-lg">🌇</span> :
                        t === TimeOfDay.PINK ? <span className="text-lg">💗</span> :
                        t === TimeOfDay.DAWN ? <span className="text-lg">🌅</span> :
                        t === TimeOfDay.SUNRISE ? <span className="text-lg">🌄</span> :
                        <span className="text-lg">🌙</span>}
                       <span className="text-[9px] font-bold mt-1">
                         {t === TimeOfDay.DAY ? 'DAY' :
                          t === TimeOfDay.SUNSET ? 'SET' :
                          t === TimeOfDay.PINK ? 'PNK' :
                          t === TimeOfDay.DAWN ? 'DAW' :
                          t === TimeOfDay.SUNRISE ? 'RSE' : 'NGT'}
                       </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-emerald-500 block mb-2">Ground Floor</span>
                <div className="grid grid-cols-4 gap-1">
                  {FLOOR_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setGameState(prev => ({ ...prev, floor: f.id }))}
                      className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all ${
                        gameState.floor === f.id
                        ? 'bg-white text-emerald-600 shadow-sm scale-105 ring-2 ring-emerald-100' 
                        : 'text-slate-400 hover:bg-white/50'
                      }`}
                      title={f.name}
                    >
                       <span className="text-lg">{f.icon}</span>
                       <span className="text-[9px] font-bold mt-1 truncate w-full text-center px-1">{f.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-cyan-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-cyan-500 block mb-2">Sea</span>
                <div className="grid grid-cols-2 gap-2">
                  {WATER_THEME_OPTIONS.map(w => (
                    <button
                      key={w.id}
                      onClick={() => setGameState(prev => ({ ...prev, waterTheme: w.id }))}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                        gameState.waterTheme === w.id
                        ? 'bg-white text-cyan-700 shadow-sm scale-105 ring-2 ring-cyan-100'
                        : 'text-slate-400 hover:bg-white/50'
                      }`}
                      title={w.name}
                    >
                      <span className="text-base">{w.icon}</span>
                      <span className="text-[10px] font-bold">{w.name}</span>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tent Controls */}
        {activeTab === 'TENT' && (
           <div className="space-y-6 animate-pop">
             <div className="flex items-center justify-between">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Tents</h3>
               <button
                 onClick={addTent}
                 className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full hover:bg-orange-100 transition-all"
               >
                 ➕ Add
               </button>
             </div>

             {gameState.tents.length > 0 && (
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                 {gameState.tents.map((tent, index) => {
                   const isActive = tent.id === activeTentId;
                   const sizeLabel = tent.size === 'SMALL' ? 'S' : tent.size === 'MEDIUM' ? 'M' : 'L';
                   const tentIcon = tent.type === 'TRIANGLE' ? '⛺️' : (tent.type === 'SQUARE' ? '🏠' : '🏕️');
                   return (
                     <button
                       key={tent.id}
                       onClick={() => {
                         setSelectedTentId(tent.id);
                         setSelectedItemId(tent.id);
                       }}
                       className={`min-w-[70px] h-[62px] rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                     >
                       <span className="text-lg">{tentIcon}</span>
                       <span className="text-[9px] font-bold text-slate-500">#{index + 1} · {sizeLabel}</span>
                     </button>
                   );
                 })}
               </div>
             )}

             {!activeTent && (
               <div className="text-xs text-slate-400 text-center py-6">
                 Add a tent to customize its style.
               </div>
             )}

             {activeTent && (
               <>
             
             {/* Type Selection */}
             <div className="bg-slate-50 p-3 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 block mb-2">Model</span>
                <div className="flex gap-2">
                   <button 
                      onClick={() => updateTent({ type: 'TRIANGLE' })}
                      className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTent.type === 'TRIANGLE' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-white text-slate-400'}`}
                   >
                     <span className="text-lg">⛺️</span> Dome
                   </button>
                   <button 
                      onClick={() => updateTent({ type: 'SQUARE' })}
                      className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTent.type === 'SQUARE' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-white text-slate-400'}`}
                   >
                     <span className="text-lg">🏠</span> Cabin
                   </button>
                   <button 
                      onClick={() => updateTent({ type: 'WINDOW' })}
                      className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTent.type === 'WINDOW' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-white text-slate-400'}`}
                   >
                     <span className="text-lg">🏕️</span> Window
                   </button>
                </div>
             </div>

             {/* Size Selection */}
             <div className="bg-amber-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-amber-500 block mb-2">Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {TENT_SIZE_OPTIONS.map(size => (
                    <button
                      key={size.id}
                      onClick={() => updateTent({ size: size.id })}
                      className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        activeTent.size === size.id
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-white text-slate-400 border-transparent'
                      }`}
                    >
                      <span className="text-base font-black">{size.short}</span>
                      <span className="text-[9px] font-bold">{size.name}</span>
                    </button>
                  ))}
                </div>
             </div>

             {/* Patterns */}
             <div className="bg-orange-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-orange-400 block mb-2">Pattern</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {TENT_PATTERNS.map(pat => (
                    <button
                      key={pat.id}
                      onClick={() => updateTent({ pattern: pat.id as any })}
                      className={`min-w-[50px] h-12 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${
                        activeTent.pattern === pat.id ? 'border-orange-400 bg-white scale-105' : 'border-transparent bg-white/50'
                      }`}
                      title={pat.name}
                    >
                      {pat.icon}
                    </button>
                  ))}
                </div>
             </div>

            {/* Rug Patterns */}
             <div className="bg-pink-50/80 p-3 rounded-2xl">
                <span className="text-xs font-bold text-pink-400 block mb-2">Rug Style</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {RUG_OPTIONS.map(rug => (
                    <button
                      key={rug.id}
                      onClick={() => updateTent({ rug: rug.id as any })}
                      className={`min-w-[70px] py-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        activeTent.rug === rug.id ? 'border-pink-400 bg-white' : 'border-white bg-white/50'
                      }`}
                    >
                      <span className="text-xl">{rug.icon}</span>
                      <span className="text-[9px] font-bold text-pink-500 truncate w-full text-center px-1">{rug.name}</span>
                    </button>
                  ))}
                </div>
             </div>

             {/* Light Toggle */}
             <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Interior Light</span>
                <button 
                  onClick={() => updateTent({ isLit: !activeTent.isLit })}
                  className={`px-4 py-2 rounded-full font-bold text-xs transition-colors ${
                    activeTent.isLit ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {activeTent.isLit ? 'ON' : 'OFF'}
                </button>
             </div>

             {gameState.tents.length > 1 && (
               <button
                 onClick={() => removeTent(activeTent.id)}
                 className="w-full py-2 text-xs font-bold text-red-500 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-all"
               >
                 Remove This Tent
               </button>
             )}
             </>
             )}
           </div>
        )}

        {/* Nature Controls */}
        {activeTab === 'NATURE' && (
          <div className="space-y-3 animate-pop">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Plants & Trees</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {AVAILABLE_ITEMS.filter(i => i.category === ItemCategory.PLANT).map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="aspect-square bg-green-50 rounded-lg flex flex-col items-center justify-center gap-0.5 hover:bg-green-100 transition-all border border-green-100 hover:border-green-300 active:scale-95"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[8px] text-green-700 font-bold truncate w-full text-center px-1 leading-tight">{item.name}</span>
                </button>
              ))}
            </div>
            
            <p className="text-[10px] text-slate-400 text-center pt-2">Plant trees to customize your forest</p>
          </div>
        )}

        {/* Decoration Controls */}
        {activeTab === 'DECOR' && (
          <div className="space-y-3 animate-pop">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assets</h3>
            {[
              { key: ItemCategory.FURNITURE, label: 'Furniture' },
              { key: ItemCategory.DECORATION, label: 'Decorations' },
              { key: ItemCategory.FOOD, label: 'Food' },
              { key: ItemCategory.VEHICLE, label: 'Vehicles' }
            ].map(group => {
              const items = AVAILABLE_ITEMS.filter(i => i.category === group.key);
              if (items.length === 0) return null;
              return (
                <div key={group.key} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="aspect-square bg-slate-50 rounded-lg flex flex-col items-center justify-center gap-0.5 hover:bg-green-50 transition-all border border-transparent hover:border-green-200 active:scale-95"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[8px] text-slate-500 font-bold truncate w-full text-center px-1 leading-tight">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <p className="text-[10px] text-slate-400 text-center pt-2">Tip: Click items in world to move/edit</p>
          </div>
        )}

        {/* PETS Controls */}
        {activeTab === 'PETS' && (
          <div className="space-y-4 animate-pop">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Companions</h3>
             <div className="grid grid-cols-3 gap-2">
                {PET_TYPES.map(p => (
                    <button
                        key={p.type}
                        onClick={() => addPet(p.type, p.icon)}
                        className="aspect-square rounded-xl border-2 border-slate-100 bg-white flex flex-col items-center justify-center gap-1 transition-all hover:bg-orange-50 active:scale-95"
                    >
                        <span className="text-3xl">{p.icon}</span>
                        <span className="text-[9px] font-bold text-slate-500">{p.type}</span>
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-2">Pets can be moved and rotated</p>
          </div>
        )}

        {/* Avatar Controls */}
        {activeTab === 'YOU' && (
          <>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Style & Pose</h3>
            {renderStyleControls()}
          </>
        )}

        {/* Friend Controls */}
        {activeTab === 'FRIEND' && (
            <div className="space-y-6 animate-pop">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Friends ({gameState.partners.length}/3)</h3>
                </div>
                
                {/* Friend List */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {gameState.partners.map((partner, index) => (
                        <button
                            key={partner.id}
                            onClick={() => setSelectedFriendId(selectedFriendId === partner.id ? null : partner.id)}
                            className={`min-w-[60px] h-[60px] rounded-full border-2 flex items-center justify-center text-xl transition-all relative ${selectedFriendId === partner.id ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                        >
                            {partner.gender === 'MALE' ? '👦' : '👧'}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">{index + 1}</span>
                            </div>
                        </button>
                    ))}
                    
                    {/* Add Friend Button */}
                    {gameState.partners.length < 3 && (
                        <div className="flex gap-1">
                            <button
                                onClick={() => addFriend('MALE')}
                                className="min-w-[60px] h-[60px] rounded-full border-2 border-dashed border-blue-200 bg-blue-50 flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-all flex-col"
                                title="Add Male Friend"
                            >
                                <span className="text-base">➕</span>
                                <span className="text-[8px] font-bold">MALE</span>
                            </button>
                            <button
                                onClick={() => addFriend('FEMALE')}
                                className="min-w-[60px] h-[60px] rounded-full border-2 border-dashed border-pink-200 bg-pink-50 flex items-center justify-center text-pink-400 hover:bg-pink-100 transition-all flex-col"
                                title="Add Female Friend"
                            >
                                <span className="text-base">➕</span>
                                <span className="text-[8px] font-bold">FEMALE</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Friend Customization Panel */}
                {selectedFriendId ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-slate-600">Editing Friend</span>
                            <button 
                                onClick={() => removeFriend(selectedFriendId)}
                                className="text-xs text-red-400 hover:text-red-600 font-bold border border-red-100 bg-red-50 px-3 py-1 rounded-full"
                            >
                                Remove
                            </button>
                        </div>
                        {renderStyleControls(selectedFriendId)}
                    </div>
                ) : (
                    gameState.partners.length > 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            Select a friend above to customize their look
                        </div>
                    )
                )}

                {gameState.partners.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                        No friends invited yet. Add one!
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Navigation Dock */}
      {!isWeatherOnly && (
        <div className="bg-white p-2 border-t border-slate-100 flex justify-around items-center h-16 min-h-[4rem] max-w-full overflow-x-auto scrollbar-hide">
          <NavButton icon={<span className="text-lg">🧑</span>} active={activeTab === 'YOU'} onClick={() => setActiveTab('YOU')} color="text-purple-500" />
          <NavButton icon={<span className="text-lg">🐾</span>} active={activeTab === 'PETS'} onClick={() => setActiveTab('PETS')} color="text-yellow-500" />
          <NavButton icon={<span className="text-lg">🧰</span>} active={activeTab === 'DECOR'} onClick={() => setActiveTab('DECOR')} color="text-green-500" />
          <NavButton icon={<span className="text-lg">⛺️</span>} active={activeTab === 'TENT'} onClick={() => setActiveTab('TENT')} color="text-orange-500" />
          <NavButton icon={<span className="text-lg">🌿</span>} active={activeTab === 'NATURE'} onClick={() => setActiveTab('NATURE')} color="text-emerald-600" />
          <NavButton icon={<span className="text-lg">👥</span>} active={activeTab === 'FRIEND'} onClick={() => setActiveTab('FRIEND')} color="text-pink-500" />
        </div>
      )}
    </div>
  );
};

const NavButton = ({ icon, active, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all duration-200 shrink-0 ${active ? `${color} bg-slate-100 scale-110 shadow-sm` : 'text-slate-300'}`}
  >
    {icon}
  </button>
);

export default ControlPanel;
