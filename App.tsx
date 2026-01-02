import React, { useState } from 'react';
import { HP12C } from './components/HP12C';
import { askGemini } from './services/gemini';

const App: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    const answer = await askGemini(query);
    setResponse(answer);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      
      {/* The Calculator */}
      <div className="z-10">
        <HP12C />
      </div>

      {/* AI Assistant Toggle */}
      <button 
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105 z-50 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span className="font-semibold">{showHelp ? 'Close Manual' : 'Help'}</span>
      </button>

      {/* AI Manual Panel */}
      {showHelp && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 p-6 z-40 animate-fade-in-up">
           <h3 className="text-lg font-bold text-gray-800 mb-2">Smart Manual</h3>
           <p className="text-sm text-gray-500 mb-4">Ask how to calculate something using RPN.</p>
           
           <div className="flex gap-2 mb-4">
             <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="e.g. How to calc compound interest?"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
             />
             <button 
                onClick={handleAsk}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
             >
               {loading ? '...' : 'Ask'}
             </button>
           </div>

           {response && (
             <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {response}
             </div>
           )}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-gray-500 text-xs text-center mt-8">
        HP 12C Platinum Web Replica | RPN Mode Only
      </div>
    </div>
  );
};

export default App;