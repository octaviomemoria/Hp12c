import React from 'react';
import { HP12C } from './components/HP12C';

const App: React.FC = () => {
  return (
    // Changed min-h-screen to h-[100dvh] (dynamic viewport height) to better handle mobile browsers
    // Added overflow-hidden to prevent scrolling when in full screen app mode
    <div className="h-[100dvh] w-screen bg-[#e5e5e5] flex flex-col items-center justify-center p-4 pb-20 sm:pb-4 overflow-hidden landscape:p-0 landscape:justify-start">
      
      {/* The Calculator Container */}
      <div className="z-10 w-full flex justify-center mb-4 sm:mb-8 landscape:mb-0 landscape:w-full landscape:h-full">
        <HP12C />
      </div>

      {/* Footer Info - Hidden in Landscape to save space */}
      <div className="text-gray-500 text-xs text-center mt-4 landscape:hidden">
        HP 12C Platinum Web Replica | RPN Mode Only
      </div>
    </div>
  );
};

export default App;