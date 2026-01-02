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
  
  // HP 12c keys are generally black with a sloped front.
  // Exception: 'f' is orange, 'g' is blue, Enter is large.
  
  let bgGradient = 'bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a]'; // Standard Black Key
  let textColor = 'text-white';
  
  if (isBlue) {
    bgGradient = 'bg-gradient-to-b from-[#4096ee] to-[#2563eb]';
    textColor = 'text-white'; // or black depending on model, usually white on blue key
  }
  if (isOrange) {
    bgGradient = 'bg-gradient-to-b from-[#fca5a5] to-[#ea580c]'; // Light orange to dark orange
    textColor = 'text-black'; 
  }

  // Key shape styling to mimic the "hinged" look
  const keyShapeClass = `
    relative 
    w-full 
    ${isEnter ? 'h-full' : 'h-10 sm:h-12'} 
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
    <div className={`relative flex flex-col items-center justify-end ${k.className || ''} ${isEnter ? 'h-full' : 'h-auto'}`}>
      
      {/* Chassis Label (Orange/Gold - Function f) - Printed on the calculator body */}
      {k.fLabel && (
        <span className="absolute -top-4 left-0 right-0 text-center text-[9px] sm:text-[10px] font-bold text-[#d97706] tracking-tight leading-none z-10 font-sans">
          {k.fLabel}
        </span>
      )}

      {/* The Physical Key */}
      <button
        onClick={() => onClick(k)}
        className={keyShapeClass}
      >
        {/* Main Label (White/Primary) */}
        <span className={`
          font-sans font-semibold 
          ${isEnter ? 'text-sm mt-4' : 'text-sm sm:text-base mt-1'} 
          ${textColor}
          ${isOrange ? 'text-black' : 'text-white'}
        `}>
          {k.label}
        </span>

        {/* Secondary Label (Blue - Function g) - Printed ON the key face bottom */}
        {k.gLabel && (
          <span className={`
            mb-1 text-[9px] sm:text-[10px] font-bold font-sans
            ${isBlue ? 'text-white' : 'text-[#60a5fa]'}
          `}>
            {k.gLabel}
          </span>
        )}
      </button>
    </div>
  );
};