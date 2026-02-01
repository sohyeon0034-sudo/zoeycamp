import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { GameState, WeatherType, TimeOfDay, GameItem, FloorType, WaterTheme } from './types';
import { Save, Check } from 'lucide-react';

function App() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    weather: WeatherType.SUNNY,
    time: TimeOfDay.DAY,
    floor: FloorType.GRASS, // Initialize Floor
    waterTheme: WaterTheme.BLUE,
    islandTheme: 'forest',
    cameraMode: 'ISLAND',
    tent: {
      type: 'TRIANGLE',
      pattern: 'ORANGE', 
      rug: 'ETHNIC', 
      isLit: false,
      isDoorOpen: true, 
      position: [4, 0, -4],
    },
    // Initialize with starter items so they are editable
    placedItems: [
        { id: 'start_tree_1', itemId: 'tree_pine', name: 'Pine Tree', icon: '🌲', category: 'PLANT' as any, position: [0, 0, -6], rotation: [0, 0, 0] },
        { id: 'start_tree_2', itemId: 'tree_zelkova', name: 'Zelkova', icon: '🥦', category: 'PLANT' as any, position: [-8, 0, -5], rotation: [0, 0, 0] },
        { id: 'start_tree_3', itemId: 'tree_round', name: 'Round Tree', icon: '🌳', category: 'PLANT' as any, position: [9, 0, 2], rotation: [0, 0, 0] },
    ],
    avatar: {
      id: 'main_avatar',
      gender: 'FEMALE',
      skinTone: 'TONE1',
      outfit: 'JEANS_BLOUSE',
      shoes: 'RED_CANVAS',
      hairstyle: 'PONYTAIL',
      blush: 'NONE',
      accessories: [], 
      position: [0, 0, 4],
      rotation: [0, 0, 0],
      pose: 'IDLE'
    },
    partners: [],
    pets: [
      {
        id: 'pet_initial',
        name: 'Cloudy',
        type: 'Maltese',
        mood: 'Happy',
        lastThought: '',
        icon: '🐶',
        position: [-3, 0, 5],
        rotation: [0, 0, 0]
      }
    ]
  });

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem('yaloo-camp-save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Basic validation/migration could go here
        if (parsed && parsed.avatar) {
          if (parsed.tent && !parsed.tent.position) {
            parsed.tent.position = [4, 0, -4];
          }
          if (!parsed.waterTheme) {
            parsed.waterTheme = WaterTheme.BLUE;
          }
          if (parsed.avatar && !parsed.avatar.skinTone) {
            parsed.avatar.skinTone = 'TONE1';
          }
          if (parsed.avatar && !['SHORT', 'LONG', 'PONYTAIL'].includes(parsed.avatar.hairstyle)) {
            parsed.avatar.hairstyle = 'SHORT';
          }
          if (Array.isArray(parsed.partners)) {
            parsed.partners = parsed.partners.map((p: any) => {
              const withSkin = p.skinTone ? p : { ...p, skinTone: 'TONE1' };
              if (!['SHORT', 'LONG', 'PONYTAIL'].includes(withSkin.hairstyle)) {
                return { ...withSkin, hairstyle: 'SHORT' };
              }
              return withSkin;
            });
          }
          setGameState(parsed);
        }
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  const saveGame = () => {
    try {
      localStorage.setItem('yaloo-camp-save', JSON.stringify(gameState));
      // Simple visual feedback
      const btn = document.getElementById('save-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Saved!';
        btn.style.backgroundColor = '#4cd137';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.backgroundColor = '';
        }, 1500);
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("Could not save game (storage full?)");
    }
  };

  const handleRemoveItem = (id: string) => {
    // Check if it's an item, pet, or friend (handled in ControlPanel mostly, but good to have here)
    if (gameState.pets.find(p => p.id === id)) {
        setGameState(prev => ({
            ...prev,
            pets: prev.pets.filter(p => p.id !== id)
        }));
    } else if (gameState.partners.find(p => p.id === id)) {
        setGameState(prev => ({
            ...prev,
            partners: prev.partners.filter(p => p.id !== id)
        }));
    } else {
        setGameState(prev => ({
            ...prev,
            placedItems: prev.placedItems.filter(item => item.id !== id)
        }));
    }
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleMoveItem = (id: string, newPosition: [number, number, number]) => {
    setGameState(prev => ({
      ...prev,
      placedItems: prev.placedItems.map(item => 
        item.id === id ? { ...item, position: newPosition } : item
      )
    }));
  };

  const handleMovePet = (id: string, newPosition: [number, number, number]) => {
    setGameState(prev => ({
      ...prev,
      pets: prev.pets.map(p => p.id === id ? { ...p, position: newPosition } : p)
    }));
  };

  const handleMovePartner = (id: string, newPosition: [number, number, number]) => {
      setGameState(prev => ({
          ...prev,
          partners: prev.partners.map(p => p.id === id ? { ...p, position: newPosition } : p)
      }));
  };

  const handleRotateItem = (id: string, angleDelta: number) => {
    setGameState(prev => {
        // Check if partner/friend
        if (prev.partners.find(p => p.id === id)) {
            return { 
                ...prev, 
                partners: prev.partners.map(p => 
                    p.id === id ? { ...p, rotation: [0, (p.rotation ? p.rotation[1] : 0) + angleDelta, 0] } : p
                ) 
            };
        }
        
        // Check if pet
        if (prev.pets.find(p => p.id === id)) {
            return {
                ...prev,
                pets: prev.pets.map(p => p.id === id ? { ...p, rotation: [0, (p.rotation ? p.rotation[1] : 0) + angleDelta, 0] } : p)
            }
        }
        
        // Else item
        return {
            ...prev,
            placedItems: prev.placedItems.map(item => 
                item.id === id ? { ...item, rotation: [0, item.rotation[1] + angleDelta, 0] } : item
            )
        }
    });
  };

  const handleMoveTent = (newPosition: [number, number, number]) => {
    setGameState(prev => ({
      ...prev,
      tent: {
        ...prev.tent,
        position: newPosition
      }
    }));
  };

  const exitEditMode = () => {
    setSelectedItemId(null);
    setIsEditMode(false);
  };

  const handleEditButton = () => {
    if (isEditMode) {
      exitEditMode();
    } else {
      setIsEditMode(true);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      
      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          onRemoveItem={handleRemoveItem}
          onMoveItem={handleMoveItem}
          onMovePet={handleMovePet}
          onMovePartner={handleMovePartner}
          onMoveTent={handleMoveTent}
          onRotateItem={handleRotateItem}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          isEditMode={isEditMode}
        />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
           <div className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-full shadow-lg border-2 border-white transform -rotate-1 hover:scale-105 transition-transform flex gap-2 items-center">
              <h1 className="text-sm font-black text-orange-500 tracking-wide flex items-center gap-2">
                ⛺ Zoey camp
              </h1>
              <button 
                id="save-btn"
                onClick={saveGame}
                className="text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center"
                title="Save Game"
              >
                <Save size={18} />
              </button>
           </div>

           {/* Edit Button (Top Right) */}
           <button
             onClick={handleEditButton}
             className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-full shadow-lg border-2 border-white text-orange-500 font-bold text-xs hover:scale-105 transition-transform flex items-center gap-1"
           >
             {isEditMode && <Check size={14} />}
             {isEditMode ? '편집 완료' : 'EDIT'}
           </button>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-end items-end pointer-events-auto">
          <div className="flex flex-col items-end gap-3">
            {isEditMode && (
              <ControlPanel 
                 gameState={gameState} 
                 setGameState={setGameState} 
                 selectedItemId={selectedItemId}
                 setSelectedItemId={setSelectedItemId}
                 onRemoveItem={handleRemoveItem}
                 onRotateItem={handleRotateItem}
                 isEditMode={isEditMode}
                 setIsEditMode={setIsEditMode}
              />
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default App;
