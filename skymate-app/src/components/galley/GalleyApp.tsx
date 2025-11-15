import { useState } from 'react';
import { UtensilsCrossed, Coffee, Package } from 'lucide-react';
import MealQueue from './MealQueue';
import BeverageQueue from './BeverageQueue';
import InventoryPanelFirebase from './InventoryPanelFirebase';

function GalleyApp() {
  const [activeTab, setActiveTab] = useState<'meals' | 'beverages' | 'inventory'>('inventory');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
      {/* Header */}
      <header className="p-6 text-center border-b border-white/20">
        <h1 className="text-3xl font-bold text-white">GALLEY</h1>
        <p className="text-teal-200 text-sm">Service Preparation Hub</p>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'meals' && <MealQueue />}
        {activeTab === 'beverages' && <BeverageQueue />}
        {activeTab === 'inventory' && <InventoryPanelFirebase />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20">
        <div className="flex justify-around p-4">
          <button
            onClick={() => setActiveTab('meals')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'meals' ? 'text-white' : 'text-white/50'
            }`}
          >
            <UtensilsCrossed size={24} />
            <span className="text-xs">Meals</span>
          </button>
          <button
            onClick={() => setActiveTab('beverages')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'beverages' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Coffee size={24} />
            <span className="text-xs">Beverages</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'inventory' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Package size={24} />
            <span className="text-xs">Inventory</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default GalleyApp;

