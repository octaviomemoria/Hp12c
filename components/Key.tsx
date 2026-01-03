import React from 'react';
import { KeyDefinition } from '../types';

interface KeyProps {
  k: KeyDefinition;
  onClick: (k: KeyDefinition) => void;
}

export const Key: React.FC<KeyProps> = ({ k, onClick }) => {
  const isEnter = k.id === 'ENTER';
  const isBlue = k.id === 'g';
  const isOrange = k.id === 'f';
  
  let bgGradient = 'bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a]'; 
  let textColor = 'text-white';
  
  if (isBlue) {
    bgGradient = 'bg-gradient-to-b from-[#4096ee] to-[#2563eb]';
    textColor = 'text-white';
  }
  if (isOrange) {
    bgGradient = 'bg-gradient-to-b from-[#fca5a5] to-[#ea580c]'; 
    textColor = 'text-black'; 
  }

  // Realistic key shape with 3D effect
  // Fixed height for portrait (h-10 sm:h-12)
  // Dynamic height for landscape (landscape:h-full) to fill the screen
  const keyShapeClass = `
    relative 
    w-full 
    ${isEnter ? 'h-full min-h-[5.5rem]' : 'h-10 sm:h-12 landscape:h-full'} 
    rounded-[2px] 
    ${bgGradient}
    border-t border-white/20 border-b-2 border-b-black/60
    shadow-[0px_2px_3px_rgba(0,0,0,0.5)]
    active:translate-y-[1px] active:shadow-none active:border-b-0
    flex flex-col items-center justify-between
    overflow-hidden
    z-20
  `;

  return (
    <div className={`relative flex flex-col items-center justify-end h-full w-full ${k.className || ''}`}>
      
      {/* Chassis Label (Orange/Gold - Function f) */}
      {/* Positioned slightly closer (-top-4) to clear the key button but not float too high */}
      {k.fLabel && (
        <span className="absolute -top-4 left-0 right-0 text-center text-[8px] sm:text-[10px] font-bold text-[#e8b025] tracking-tight leading-none z-30 font-sans whitespace-nowrap overflow-visible">
          {k.fLabel}
        </span>
      )}

      {/* The Physical Key */}
      <button
        onClick={() => onClick(k)}
        className={keyShapeClass}
      >
        {/* Main Label */}
        <span className={`
          font-sans font-semibold 
          ${isEnter ? 'text-sm mt-4' : 'text-xs sm:text-sm mt-1'} 
          ${textColor}
          ${isOrange ? 'text-black' : 'text-white'}
        `}>
          {k.label}
        </span>

        {/* Secondary Label (Blue - Function g) */}
        {k.gLabel && (
          <span className={`
            mb-0.5 sm:mb-1 text-[7px] sm:text-[9px] font-bold font-sans
            ${isBlue ? 'text-white' : 'text-[#60a5fa]'}
          `}>
            {k.gLabel}
          </span>
        )}
      </button>
    </div>
  );
};