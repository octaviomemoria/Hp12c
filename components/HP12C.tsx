import React, { useEffect, useState } from 'react';
import { CALCULATOR_KEYS } from '../constants';
import { Key } from './Key';
import { useHP12C } from '../hooks/useHP12C';
import { ModifierState, KeyDefinition } from '../types';

export const HP12C: React.FC = () => {
  const { state, handleKeyPress } = useHP12C();
  const [copied, setCopied] = useState(false);

  // Clipboard Copy
  const handleCopy = () => {
     if (!state.powerOn) return;
     const val = state.display.replace(/_/g, '');
     navigator.clipboard.writeText(val).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
     });
  };

  // Suporte ao teclado físico e Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Impede comportamento padrão para teclas de função e setas
      if (['/', '*', '-', '+', 'Enter', 'Backspace', 'Escape'].includes(e.key)) {
        e.preventDefault();
      }

      let keyId = '';
      const key = e.key.toLowerCase();

      // Mapeamento simples
      if (key >= '0' && key <= '9') keyId = key;
      else if (key === '.' || key === ',') keyId = 'DOT';
      else if (key === 'enter') keyId = 'ENTER';
      else if (key === '+') keyId = 'ADD';
      else if (key === '-') keyId = 'SUB';
      else if (key === '*') keyId = 'MUL';
      else if (key === '/') keyId = 'DIV';
      else if (key === 'backspace' || key === 'escape' || key === 'c') keyId = 'CLX';
      else if (key === 'f') keyId = 'f';
      else if (key === 'g') keyId = 'g';
      else if (key === 's') keyId = 'STO';
      else if (key === 'r') keyId = 'RCL';
      else if (key === 'y') keyId = 'yx';
      else if (key === 'x') keyId = 'xy';

      if (keyId) {
        for (const row of CALCULATOR_KEYS) {
          const found = row.find(k => k.id === keyId);
          if (found) {
            handleKeyPress(found);
            break;
          }
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text');
        if (!text) return;
        
        let cleanText = text.trim();
        if (cleanText.startsWith('(') && cleanText.endsWith(')')) {
            cleanText = '-' + cleanText.slice(1, -1);
        }
        cleanText = cleanText.replace(/,/g, '.');
        const match = cleanText.match(/-?\d+(\.\d+)?/);
        if (match) {
            const numStr = match[0];
            handleKeyPress({
                id: 'PASTE_INPUT',
                label: '',
                action: 'NUM',
                value: numStr
            });
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('paste', handlePaste);
    };
  }, [handleKeyPress]);

  return (
    <div className="
      relative 
      flex flex-col 
      w-full 
      bg-[#111] 
      overflow-hidden 
      transform transition-transform
      /* Portrait / Desktop Defaults */
      max-w-[600px] 
      rounded-xl shadow-2xl border-4 border-[#222]
      hover:scale-[1.005]
      /* Landscape Mobile Overrides (Full Screen) */
      landscape:max-w-none landscape:w-screen landscape:h-[100dvh] landscape:max-h-[100dvh]
      landscape:rounded-none landscape:border-0 landscape:shadow-none landscape:hover:scale-100
      landscape:lg:max-w-[900px] landscape:lg:h-auto landscape:lg:border-4 landscape:lg:rounded-xl /* Preserve desktop look on large screens */
    ">
        
      {/* TOP SECTION: SILVER / PLATINUM */}
      <div className="relative bg-gradient-to-b from-[#e5e7eb] to-[#d1d5db] border-b-2 border-black p-4 sm:p-6 pb-2 flex-none landscape:p-2 landscape:pb-1">
          <div className="flex justify-between items-start mb-4 px-1 landscape:mb-1">
            <div className="flex flex-col">
              <span className="font-sans text-base sm:text-lg font-semibold text-gray-800 tracking-tight landscape:text-xs">HP 12c</span>
              <span className="font-sans text-xs sm:text-sm text-gray-600 -mt-1 landscape:text-[10px]">Platinum</span>
            </div>
            <div className="bg-gradient-to-br from-[#333] to-[#000] rounded px-2 py-1 shadow-sm border border-gray-400 landscape:scale-75 landscape:origin-top-right">
              <span className="font-serif italic font-bold text-white text-xl leading-none">hp</span>
            </div>
          </div>

          {/* LCD Screen Container */}
          <div 
            className="mx-auto bg-[#889] p-[2px] rounded-md shadow-inner border border-gray-500 w-full max-w-sm cursor-pointer relative group landscape:max-w-xs"
            onClick={handleCopy}
            title="Click to copy value"
          >
            <div className="bg-[#aebfa3] h-14 sm:h-16 landscape:h-10 rounded shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-end px-4 relative overflow-hidden transition-colors group-hover:bg-[#b8c9ad]">
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                      style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '4px 4px'}}>
                </div>

                {copied && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20 animate-fade-in">
                        <span className="bg-black text-white text-xs px-2 py-1 rounded">COPIED</span>
                    </div>
                )}

                {!state.powerOn ? (
                    <span className="opacity-0">OFF</span>
                ) : (
                  <div className="relative w-full text-right">
                    <div className="absolute top-[-8px] md:top-[-10px] left-0 text-[8px] font-bold text-black opacity-60 flex gap-2 landscape:top-[-6px] landscape:text-[7px]">
                        <span>{state.modifiers === ModifierState.F ? 'f' : ''}</span>
                        <span>{state.modifiers === ModifierState.G ? 'g' : ''}</span>
                        <span>{state.begMode ? 'BEGIN' : ''}</span>
                    </div>
                    
                    <div className="absolute top-1 left-0 flex flex-wrap gap-1 max-w-[150px] opacity-70 hidden sm:flex">
                        {state.financial.n !== 0 && <div className="bg-black/10 px-1 py-[1px] rounded-[2px] text-[7px] font-bold text-black border border-black/10 leading-none">n</div>}
                        {state.financial.i !== 0 && <div className="bg-black/10 px-1 py-[1px] rounded-[2px] text-[7px] font-bold text-black border border-black/10 leading-none">i</div>}
                        {state.financial.PV !== 0 && <div className="bg-black/10 px-1 py-[1px] rounded-[2px] text-[7px] font-bold text-black border border-black/10 leading-none">PV</div>}
                        {state.financial.PMT !== 0 && <div className="bg-black/10 px-1 py-[1px] rounded-[2px] text-[7px] font-bold text-black border border-black/10 leading-none">PMT</div>}
                        {state.financial.FV !== 0 && <div className="bg-black/10 px-1 py-[1px] rounded-[2px] text-[7px] font-bold text-black border border-black/10 leading-none">FV</div>}
                    </div>

                    <div className="absolute bottom-[-14px] md:bottom-[-18px] left-0 text-[8px] font-bold text-black opacity-60 landscape:bottom-[-10px] landscape:text-[7px]">
                        RPN {state.pendingOp ? ` ${state.pendingOp}` : ''}
                    </div>

                    <span className="lcd-text text-3xl sm:text-4xl landscape:text-2xl text-black font-medium tracking-widest drop-shadow-sm select-none truncate w-full block">
                        {state.error || state.display}
                    </span>
                  </div>
                )}
            </div>
          </div>
      </div>

      {/* BOTTOM SECTION: KEYBOARD AREA */}
      {/* Increased top padding (pt-7) to provide clearance for the first row function labels */}
      {/* landscape:pt-4 reduced to save space, landscape:gap-y-2 reduced drastically to fit height */}
      <div className="bg-[#1a1a1a] px-2 pb-2 pt-7 sm:px-4 sm:pb-4 sm:pt-10 landscape:pt-5 landscape:px-2 landscape:pb-1 flex-grow flex flex-col">
        <div className="grid grid-cols-10 gap-x-1 gap-y-6 sm:gap-x-2 sm:gap-y-8 landscape:gap-y-2 h-full">
          {CALCULATOR_KEYS.map((row, rIdx) => (
            <React.Fragment key={rIdx}>
              {row.map((k, kIdx) => {
                let gridCol = kIdx + 1;
                let gridRow = rIdx + 1;
                if (rIdx === 3 && kIdx >= 5) {
                  gridCol = kIdx + 2;
                }
                
                // Fix: Ensure row-span-2 is respected in inline styles
                const rowStyle = k.className?.includes('row-span-2') ? `${gridRow} / span 2` : gridRow;

                return (
                  <div 
                    key={k.id} 
                    className={`${k.className || 'col-span-1'} relative flex flex-col h-full`}
                    style={{ gridColumn: gridCol, gridRow: rowStyle }}
                  >
                    <Key k={k} onClick={handleKeyPress} />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};