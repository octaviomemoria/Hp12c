import React from 'react';
import { HP12C } from './components/HP12C';

const App: React.FC = () => {
  return (
    // Dark background for professional/OLED look
    <div className="h-[100dvh] w-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 pb-20 sm:pb-4 overflow-hidden landscape:p-0 landscape:justify-start">
      
      {/* The Calculator Container */}
      <div className="z-10 w-full flex justify-center mb-4 sm:mb-8 landscape:mb-0 landscape:w-full landscape:h-full">
        <HP12C />
      </div>

      {/* Footer Info - Subtle and Dark */}
      <div className="text-gray-700 text-xs text-center mt-4 landscape:hidden">
        Calculadora Financeira RPN | Professional Edition
      </div>
    </div>
  );
};

export default App;