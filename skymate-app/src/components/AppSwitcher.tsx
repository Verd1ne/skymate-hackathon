import { useState, useEffect } from 'react';
import CrewApp from './crew/CrewApp';
import GalleyApp from './galley/GalleyApp';
import { Plane, UtensilsCrossed } from 'lucide-react';
import { ToastProvider } from './shared/ToastContainer';
import yolov8Service from '../lib/yolov8Service';

function AppSwitcher() {
  const [activeApp, setActiveApp] = useState<'crew' | 'galley'>('crew');
  
  // Initialize YOLOv8 model on app startup
  useEffect(() => {
    console.log('🚀 Initializing YOLOv8 model...');
    yolov8Service.initialize().catch(err => {
      console.error('⚠️ YOLOv8 initialization failed:', err);
    });
  }, []);

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
          </div>
        </div>

        {/* App Content */}
        <div className="pt-16">
          {activeApp === 'crew' ? <CrewApp /> : <GalleyApp />}
        </div>
      </div>
    </ToastProvider>
  );
}

export default AppSwitcher;

