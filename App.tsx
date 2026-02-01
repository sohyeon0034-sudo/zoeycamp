import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { GameState, WeatherType, TimeOfDay, GameItem, FloorType } from './types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save } from 'lucide-react';

function App() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Mobile/UI Input State
  const [mobileInput, setMobileInput] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  });

  const [gameState, setGameState] = useState<GameState>({
    weather: WeatherType.SUNNY,
    time: TimeOfDay.DAY,
    floor: FloorType.GRASS, // Initialize Floor
    islandTheme: 'forest',
    cameraMode: 'ISLAND',
    tent: {
      type: 'TRIANGLE',
      pattern: 'ORANGE', 
      rug: 'ETHNIC', 
      isLit: false,
      isDoorOpen: true, 
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
      outfit: 'JEANS_BLOUSE',
      shoes: 'RED_CANVAS',
      hairstyle: 'PONYTAIL',
      blush: 'NONE',
      accessories: [], 
      position: [0, 0, 4],
      rotation: [0, 0, 0],
      pose: 'IDLE'
    },
    partners: [
      {
        id: 'partner_initial',
        gender: 'MALE',
        outfit: 'BLACK_SUIT',
        shoes: 'BLACK_SNEAKERS_M',
        hairstyle: 'SHORT_BLACK',
        blush: 'NONE',
        accessories: ['GLASSES', 'WATCH'],
        position: [-2, 0, 4],
        rotation: [0, 0, 0],
        pose: 'IDLE'
      }
    ],
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

  // Helper to handle touch/mouse hold for mobile controls
  const handleControl = (key: keyof typeof mobileInput, value: boolean) => {
      setMobileInput(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full h-screen relative overflow-hidden">
      
      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState} 
          setGameState={setGameState} 
          onRemoveItem={handleRemoveItem}
          onMoveItem={handleMoveItem}
          onMovePet={handleMovePet}
          onMovePartner={handleMovePartner}
          onRotateItem={handleRotateItem}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          mobileInput={mobileInput}
        />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
           <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border-2 border-white transform -rotate-1 hover:scale-105 transition-transform flex gap-3 items-center">
              <h1 className="text-xl font-black text-orange-500 tracking-wide flex items-center gap-2">
                ⛺ Yaloo camp!
              </h1>
              <button 
                id="save-btn"
                onClick={saveGame}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition-all flex items-center justify-center w-10 h-10"
                title="Save Game"
              >
                <Save size={18} />
              </button>
           </div>

           {/* Mobile Controls (Top Right) */}
           <div className="flex flex-col items-center gap-2 bg-black/10 backdrop-blur-sm p-3 rounded-3xl">
              <button 
                onMouseDown={() => handleControl('forward', true)} onMouseUp={() => handleControl('forward', false)} onMouseLeave={() => handleControl('forward', false)}
                onTouchStart={() => handleControl('forward', true)} onTouchEnd={() => handleControl('forward', false)}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-orange-100 active:scale-95 transition-all"
              >
                  <ArrowUp className="text-slate-600" />
              </button>
              <div className="flex gap-2">
                  <button 
                    onMouseDown={() => handleControl('left', true)} onMouseUp={() => handleControl('left', false)} onMouseLeave={() => handleControl('left', false)}
                    onTouchStart={() => handleControl('left', true)} onTouchEnd={() => handleControl('left', false)}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-orange-100 active:scale-95 transition-all"
                  >
                      <ArrowLeft className="text-slate-600" />
                  </button>
                  <button 
                    onMouseDown={() => handleControl('backward', true)} onMouseUp={() => handleControl('backward', false)} onMouseLeave={() => handleControl('backward', false)}
                    onTouchStart={() => handleControl('backward', true)} onTouchEnd={() => handleControl('backward', false)}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-orange-100 active:scale-95 transition-all"
                  >
                      <ArrowDown className="text-slate-600" />
                  </button>
                  <button 
                    onMouseDown={() => handleControl('right', true)} onMouseUp={() => handleControl('right', false)} onMouseLeave={() => handleControl('right', false)}
                    onTouchStart={() => handleControl('right', true)} onTouchEnd={() => handleControl('right', false)}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-orange-100 active:scale-95 transition-all"
                  >
                      <ArrowRight className="text-slate-600" />
                  </button>
              </div>
              <button 
                onMouseDown={() => handleControl('jump', true)} onMouseUp={() => handleControl('jump', false)} onMouseLeave={() => handleControl('jump', false)}
                onTouchStart={() => handleControl('jump', true)} onTouchEnd={() => handleControl('jump', false)}
                className="w-16 h-12 mt-1 bg-orange-400 rounded-xl shadow-lg flex items-center justify-center active:bg-orange-500 active:scale-95 transition-all text-white font-bold text-xs"
              >
                  JUMP!
              </button>
           </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-end items-end pointer-events-auto">
           <ControlPanel 
              gameState={gameState} 
              setGameState={setGameState} 
              selectedItemId={selectedItemId}
              setSelectedItemId={setSelectedItemId}
              onRemoveItem={handleRemoveItem}
              onRotateItem={handleRotateItem}
           />
        </div>

      </div>

    </div>
  );
}

export default App;