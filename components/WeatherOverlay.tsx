import React from 'react';
import { WeatherType, TimeOfDay } from '../types';

interface WeatherOverlayProps {
  weather: WeatherType;
  time: TimeOfDay;
}

const WeatherOverlay: React.FC<WeatherOverlayProps> = ({ weather, time }) => {
  // Generate rain drops
  const renderRain = () => {
    const drops = [];
    for (let i = 0; i < 50; i++) {
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * 0.5;
      const left = Math.random() * 100;
      drops.push(
        <div
          key={i}
          className="rain-drop"
          style={{
            left: `${left}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }
    return <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">{drops}</div>;
  };

  // Determine overlay color/opacity based on Time
  let timeOverlayClass = '';
  if (time === TimeOfDay.NIGHT) {
    timeOverlayClass = 'bg-slate-900/60 mix-blend-multiply';
  } else if (time === TimeOfDay.SUNSET) {
    timeOverlayClass = 'bg-orange-500/30 mix-blend-overlay';
  }

  // Determine weather tint
  let weatherOverlayClass = '';
  if (weather === WeatherType.RAINY) {
    weatherOverlayClass = 'bg-gray-700/20';
  } else if (weather === WeatherType.CLOUDY) {
    weatherOverlayClass = 'bg-gray-400/10';
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Time Layer */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${timeOverlayClass}`} />
      
      {/* Weather Tint Layer */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${weatherOverlayClass}`} />
      
      {/* Particle Effects */}
      {weather === WeatherType.RAINY && renderRain()}
      {weather === WeatherType.SUNNY && time === TimeOfDay.DAY && (
        <div className="absolute top-10 right-10 w-24 h-24 bg-yellow-300 rounded-full blur-2xl opacity-40 animate-pulse" />
      )}
    </div>
  );
};

export default WeatherOverlay;