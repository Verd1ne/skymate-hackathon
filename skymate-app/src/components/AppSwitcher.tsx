import { useState } from 'react';
import CrewApp from './crew/CrewApp';
import GalleyApp from './galley/GalleyApp';
import TTSPlayground from './tts/TTSPlayground';
import { Megaphone, Plane, UtensilsCrossed } from 'lucide-react';
import { ToastProvider } from './shared/ToastContainer';

function AppSwitcher() {
  const [activeApp, setActiveApp] = useState<'crew' | 'galley' | 'tts'>('crew');

  return (
    <ToastProvider>
      <div className="min-h-screen">
        {/* Top App Switcher Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/20">
          <div className="flex justify-center gap-4 p-2">
            <button
              onClick={() => setActiveApp('crew')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                activeApp === 'crew'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Plane size={20} />
              <span>Crew App</span>
            </button>
            <button
              onClick={() => setActiveApp('galley')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                activeApp === 'galley'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <UtensilsCrossed size={20} />
              <span>Galley App</span>
            </button>
            <button
              onClick={() => setActiveApp('tts')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                activeApp === 'tts'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Megaphone size={20} />
              <span>TTS Playground</span>
            </button>
          </div>
        </div>

        {/* App Content */}
        <div className="pt-16">
          {activeApp === 'crew' && <CrewApp />}
          {activeApp === 'galley' && <GalleyApp />}
          {activeApp === 'tts' && <TTSPlayground />}
        </div>
      </div>
    </ToastProvider>
  );
}

export default AppSwitcher;

