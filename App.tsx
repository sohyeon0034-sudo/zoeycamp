import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { GameState, WeatherType, TimeOfDay, GameItem, FloorType, WaterTheme } from './types';
import { Save, Check, Sun, Volume2, VolumeX } from 'lucide-react';

function App() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWeatherPanelOpen, setIsWeatherPanelOpen] = useState(false);
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [bgmType, setBgmType] = useState<'WAVE' | 'PEACEFUL' | 'RAIN'>('WAVE');
  const bgmRef = useRef<{
    type: 'WAVE' | 'PEACEFUL' | 'RAIN';
    ctx: AudioContext;
    gain: GainNode;
    stop: () => void;
  } | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    weather: WeatherType.SUNNY,
    time: TimeOfDay.DAY,
    floor: FloorType.GRASS, // Initialize Floor
    waterTheme: WaterTheme.BLUE,
    islandTheme: 'forest',
    cameraMode: 'ISLAND',
    tents: [
      {
        id: 'tent_1',
        type: 'TRIANGLE',
        size: 'MEDIUM',
        pattern: 'ORANGE', 
        rug: 'ETHNIC', 
        isLit: false,
        isDoorOpen: true, 
        position: [4, 0, -4],
      }
    ],
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
      outfit: 'SKY_BIKINI_SKIRT',
      shoes: 'RED_CANVAS',
      hairstyle: 'LONG',
      blush: 'NONE',
      accessories: [], 
      position: [0, 0, 0],
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
          if (!parsed.tents && parsed.tent) {
            parsed.tents = [{ ...parsed.tent }];
          }
          if (Array.isArray(parsed.tents)) {
            parsed.tents = parsed.tents.map((t: any, idx: number) => ({
              id: t.id ?? `tent_${idx + 1}`,
              type: t.type ?? 'TRIANGLE',
              size: t.size ?? 'MEDIUM',
              pattern: t.pattern ?? 'ORANGE',
              rug: t.rug ?? 'ETHNIC',
              isLit: t.isLit ?? false,
              isDoorOpen: t.isDoorOpen ?? true,
              position: t.position ?? [4, 0, -4]
            }));
          } else {
            parsed.tents = [{
              id: 'tent_1',
              type: 'TRIANGLE',
              size: 'MEDIUM',
              pattern: 'ORANGE',
              rug: 'ETHNIC',
              isLit: false,
              isDoorOpen: true,
              position: [4, 0, -4]
            }];
          }
          if (!parsed.cameraMode) {
            parsed.cameraMode = 'ISLAND';
          }
          if (!parsed.waterTheme) {
            parsed.waterTheme = WaterTheme.BLUE;
          }
          if (parsed.avatar && !parsed.avatar.skinTone) {
            parsed.avatar.skinTone = 'TONE1';
          }
          if (parsed.avatar && !['SHORT', 'LONG', 'PONYTAIL', 'PONYTAIL_PINK', 'BUN_GREEN'].includes(parsed.avatar.hairstyle)) {
            parsed.avatar.hairstyle = 'SHORT';
          }
          if (Array.isArray(parsed.partners)) {
            parsed.partners = parsed.partners.map((p: any) => {
              const withSkin = p.skinTone ? p : { ...p, skinTone: 'TONE1' };
              if (!['SHORT', 'LONG', 'PONYTAIL', 'PONYTAIL_PINK', 'BUN_GREEN'].includes(withSkin.hairstyle)) {
                return { ...withSkin, hairstyle: 'SHORT' };
              }
              return withSkin;
            });
          }
          if (parsed.avatar) {
            parsed.avatar.position = [0, 0, 0];
            parsed.avatar.pose = 'IDLE';
          }
          parsed.cameraMode = 'ISLAND';
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

  const createNoiseBuffer = (ctx: AudioContext, seconds = 2, level = 0.6) => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * level;
    }
    return buffer;
  };

  const createWaveBgm = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const buffer = createNoiseBuffer(ctx, 2, 0.6);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 280;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    lfo.start();
    source.start();

    return {
      type: 'WAVE' as const,
      ctx,
      gain,
      stop: () => {
        try { source.stop(); } catch {}
        try { lfo.stop(); } catch {}
        ctx.close();
      }
    };
  };

  const createPeacefulBgm = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.4;

    const freqs = [196, 246.94, 293.66]; // G major chord
    const oscillators = freqs.map((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.04;
      osc.connect(oscGain).connect(filter);
      osc.start();
      return { osc, oscGain };
    });

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    filter.connect(gain);
    gain.connect(ctx.destination);

    return {
      type: 'PEACEFUL' as const,
      ctx,
      gain,
      stop: () => {
        oscillators.forEach(({ osc }) => {
          try { osc.stop(); } catch {}
        });
        try { lfo.stop(); } catch {}
        ctx.close();
      }
    };
  };

  const createRainBgm = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const buffer = createNoiseBuffer(ctx, 2, 0.8);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 600;
    high.Q.value = 0.4;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 5200;
    low.Q.value = 0.2;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(ctx.destination);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    source.start();

    return {
      type: 'RAIN' as const,
      ctx,
      gain,
      stop: () => {
        try { source.stop(); } catch {}
        try { lfo.stop(); } catch {}
        ctx.close();
      }
    };
  };

  const ensureBgm = (type: 'WAVE' | 'PEACEFUL' | 'RAIN') => {
    if (bgmRef.current?.type === type) return bgmRef.current;
    if (bgmRef.current) {
      bgmRef.current.stop();
      bgmRef.current = null;
    }
    const next = type === 'WAVE' ? createWaveBgm() : (type === 'PEACEFUL' ? createPeacefulBgm() : createRainBgm());
    if (next) bgmRef.current = next;
    return bgmRef.current;
  };

  const setBgmEnabled = (enabled: boolean, type: 'WAVE' | 'PEACEFUL' | 'RAIN') => {
    if (!enabled) {
      if (bgmRef.current) {
        const node = bgmRef.current;
        const now = node.ctx.currentTime;
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setTargetAtTime(0, now, 0.2);
        window.setTimeout(() => {
          if (bgmRef.current === node) {
            node.stop();
            bgmRef.current = null;
          }
        }, 700);
      }
      return;
    }

    const node = ensureBgm(type);
    if (!node) return;
    const now = node.ctx.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.ctx.resume().catch(() => {});
    const target = type === 'WAVE' ? 0.16 : (type === 'PEACEFUL' ? 0.12 : 0.13);
    node.gain.gain.setTargetAtTime(target, now, 0.25);
  };

  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.gain.gain.value = 0;
        bgmRef.current.stop();
        bgmRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    setBgmEnabled(isBgmOn, bgmType);
  }, [isBgmOn, bgmType]);

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

  const handleMoveTent = (id: string, newPosition: [number, number, number]) => {
    setGameState(prev => ({
      ...prev,
      tents: prev.tents.map(tent => tent.id === id ? { ...tent, position: newPosition } : tent)
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
      setIsWeatherPanelOpen(false);
      setIsEditMode(true);
    }
  };

  const handleWeatherButton = () => {
    setSelectedItemId(null);
    setIsEditMode(false);
    setIsWeatherPanelOpen(prev => !prev);
  };
  
  const handleBgmToggle = () => {
    setIsBgmOn(prev => !prev);
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
                ⛺ Zoey's camp
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

           <div className="flex items-center gap-2">
             <button
               onClick={handleWeatherButton}
               className={`w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform ${
                 isWeatherPanelOpen ? 'bg-orange-100 text-orange-500 scale-105' : 'bg-white/80 text-slate-500 hover:text-orange-500 hover:scale-105'
               }`}
               title="Weather"
             >
               <Sun size={18} />
             </button>
             <button
               onClick={handleBgmToggle}
               className={`w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform ${
                 isBgmOn ? 'bg-sky-100 text-sky-500 scale-105' : 'bg-white/80 text-slate-500 hover:text-sky-500 hover:scale-105'
               }`}
               title="BGM"
             >
               {isBgmOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
             </button>
             <div className="flex items-center gap-1 bg-white/80 border-2 border-white shadow-lg rounded-full p-1">
               <button
                 onClick={() => setBgmType('WAVE')}
                 className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all ${
                   bgmType === 'WAVE' ? 'bg-sky-100 text-sky-600' : 'text-slate-400 hover:text-sky-500'
                 }`}
                 title="Wave BGM"
               >
                 🌊
               </button>
               <button
                 onClick={() => setBgmType('PEACEFUL')}
                 className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all ${
                   bgmType === 'PEACEFUL' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-500'
                 }`}
                 title="Peaceful BGM"
               >
                 🎵
               </button>
               <button
                 onClick={() => setBgmType('RAIN')}
                 className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all ${
                   bgmType === 'RAIN' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-500'
                 }`}
                 title="Rain BGM"
               >
                 🌧️
               </button>
             </div>
             <button
               onClick={handleEditButton}
               className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-full shadow-lg border-2 border-white text-orange-500 font-bold text-xs hover:scale-105 transition-transform flex items-center gap-1"
             >
               {isEditMode && <Check size={14} />}
               {isEditMode ? '편집 완료' : 'EDIT'}
             </button>
           </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-end items-end pointer-events-auto">
          <div className="flex flex-col items-end gap-3">
            {(isEditMode || isWeatherPanelOpen) && (
              <ControlPanel 
                 gameState={gameState} 
                 setGameState={setGameState} 
                 selectedItemId={selectedItemId}
                 setSelectedItemId={setSelectedItemId}
                 onRemoveItem={handleRemoveItem}
                 onRotateItem={handleRotateItem}
                 isEditMode={isEditMode}
                 setIsEditMode={setIsEditMode}
                 panelMode={isEditMode ? 'FULL' : 'WEATHER'}
              />
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default App;
