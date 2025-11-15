/**
 * CrewApp with Proactive Alerts Integration Example
 * 
 * This is an example showing how to integrate the proactive alerts system
 * into the CrewApp component.
 */

import { useState } from 'react';
import { Mic, List } from 'lucide-react';
import VoiceInput from './VoiceInput';
import TaskList from './TaskList';
import { useTasks } from '../../hooks/useTasks';
import { useProactiveAlerts } from '../../hooks/useProactiveAlerts';
import AlertNotification from '../shared/AlertNotification';

function CrewAppWithAlerts() {
  const [activeTab, setActiveTab] = useState<'voice' | 'tasks'>('voice');
  const { tasks } = useTasks();
  
  // Initialize proactive alerts
  const { alerts, dismissAlert, alertCount, hasUrgent } = useProactiveAlerts(tasks, {
    analysisInterval: 30000, // Run analysis every 30 seconds
    autoDismissDelay: 30000, // Auto-dismiss low priority after 30 seconds
    enableSound: true, // Enable sound notifications
    // flightContext: { ... } // Optional: provide flight context
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="p-6 text-center border-b border-white/20 relative">
        <h1 className="text-3xl font-bold text-white">SKY MATE</h1>
        <p className="text-sky-200 text-sm">Your AI Flight Assistant</p>
        
        {/* Alert count badge */}
        {alertCount > 0 && (
          <div className={`
            absolute top-4 right-4 
            ${hasUrgent ? 'bg-red-500' : 'bg-orange-500'} 
            text-white 
            text-xs 
            font-bold 
            px-3 
            py-1 
            rounded-full 
            animate-pulse
          `}>
            {alertCount} Alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'voice' ? <VoiceInput /> : <TaskList />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20">
        <div className="flex justify-around p-4">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'voice' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Mic size={24} />
            <span className="text-xs">Voice</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'tasks' ? 'text-white' : 'text-white/50'
            }`}
          >
            <List size={24} />
            <span className="text-xs">Tasks</span>
          </button>
        </div>
      </nav>

      {/* Proactive Alerts */}
      <AlertNotification
        alerts={alerts}
        onDismiss={dismissAlert}
        position="bottom-right"
        maxAlerts={5}
      />
    </div>
  );
}

export default CrewAppWithAlerts;

