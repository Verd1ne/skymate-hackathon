import { useState } from 'react';
import { Mic, List, TrendingUp, Bell, BellOff } from 'lucide-react';
import VoiceInput from './VoiceInput';
import TaskList from './TaskList';
import InsightsPanel from './InsightsPanel';
import { useTasks } from '../../hooks/useTasks';
import { useProactiveAlerts } from '../../hooks/useProactiveAlerts';
import { usePriorityEscalation } from '../../hooks/usePriorityEscalation';
import AlertNotification from '../shared/AlertNotification';

function CrewApp() {
  const [activeTab, setActiveTab] = useState<'voice' | 'tasks' | 'insights'>('voice');
  const [alertsEnabled, setAlertsEnabled] = useState(true); // Toggle for proactive alerts
  const { tasks } = useTasks();
  
  // Proactive alerts system - REDUCED frequency to be less intrusive
  const { alerts, dismissAlert, alertCount, hasUrgent } = useProactiveAlerts(tasks, {
    analysisInterval: alertsEnabled ? 120000 : 0, // 2 minutes (was 30 seconds) - much less intrusive, or disabled
    autoDismissDelay: 60000, // 1 minute auto-dismiss
    enableSound: false, // Disable sound to be less intrusive
  });

  // Priority escalation system
  usePriorityEscalation(tasks, {
    enabled: true,
    onEscalate: (task, oldPriority, newPriority) => {
      console.log(`🚨 Priority escalation: Seat ${task.seat} ${oldPriority} → ${newPriority}`);
    },
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
            ${hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} 
            text-white 
            text-xs 
            font-bold 
            px-3 
            py-1.5 
            rounded-full 
            flex items-center gap-2
            shadow-lg
          `}>
            <Bell size={14} />
            {alertCount} Alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'voice' && <VoiceInput />}
        {activeTab === 'tasks' && <TaskList />}
        {activeTab === 'insights' && <InsightsPanel />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/20">
        <div className="flex justify-around p-4">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'voice' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Mic size={24} />
            <span className="text-xs">Voice</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'tasks' ? 'text-white' : 'text-white/50'
            }`}
          >
            <List size={24} />
            <span className="text-xs">Tasks</span>
            {tasks.filter(t => t.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {tasks.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'insights' ? 'text-white' : 'text-white/50'
            }`}
          >
            <TrendingUp size={24} />
            <span className="text-xs">Insights</span>
            {alertCount > 0 && (
              <span className={`absolute -top-1 -right-1 ${
                hasUrgent ? 'bg-red-500' : 'bg-orange-500'
              } text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center`}>
                {alertCount}
              </span>
            )}
          </button>
          
          {/* Alert Toggle */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={`flex flex-col items-center gap-1 transition ${
              alertsEnabled ? 'text-yellow-400' : 'text-white/50'
            }`}
            title={alertsEnabled ? 'Disable Alerts' : 'Enable Alerts'}
          >
            {alertsEnabled ? <Bell size={24} /> : <BellOff size={24} />}
            <span className="text-xs">Alerts</span>
          </button>
        </div>
      </nav>

      {/* Proactive Alerts - Only show when enabled */}
      {alertsEnabled && (
        <AlertNotification
          alerts={alerts}
          onDismiss={dismissAlert}
          position="bottom-right"
          maxAlerts={2}
        />
      )}
    </div>
  );
}

export default CrewApp;

