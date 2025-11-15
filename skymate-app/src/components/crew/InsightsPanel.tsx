/**
 * Insights Panel Component
 *
 * Displays AI-generated insights including hot zones, inventory warnings,
 * forgotten tasks, and efficiency opportunities.
 *
 * @module InsightsPanel
 */

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  MapPin,
  Package,
  Clock,
  Users,
  Zap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { contextAI, type Insight } from "../../lib/contextAI";
import { useTasks } from "../../hooks/useTasks";
import type { FlightContext } from "../../types";

/**
 * Insights Panel Component
 */
export default function InsightsPanel() {
  const { tasks, loading: tasksLoading } = useTasks();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Flight context (can be made dynamic later)
  const [flightContext] = useState<FlightContext>({
    phase: "cruise",
    timeToDestination: 120,
    turbulence: false,
    seatbeltSign: false,
  });

  // Load insights
  const loadInsights = useCallback(async () => {
    if (tasksLoading) return;

    setLoading(true);
    try {
      const newInsights = contextAI.analyzeFlightState(tasks, flightContext);
      setInsights(newInsights);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  }, [tasks, flightContext, tasksLoading]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (tasksLoading) return;

    loadInsights();
    const interval = setInterval(loadInsights, 30000);
    return () => clearInterval(interval);
  }, [loadInsights, tasksLoading]);

  // Group insights by type
  const hotZones = insights.filter((i) => i.type === "hot_zone");
  const inventoryWarnings = insights.filter(
    (i) => i.type === "inventory_warning"
  );
  const forgottenTasks = insights.filter((i) => i.type === "forgotten_warning");
  const crewSuggestions = insights.filter((i) => i.type === "crew_suggestion");
  const efficiencyOps = insights.filter(
    (i) => i.type === "efficiency_opportunity"
  );

  if (tasksLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Insights</h2>
          <p className="text-sky-200 text-sm">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Hot Zones */}
      {hotZones.length > 0 && (
        <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-orange-400" size={24} />
            <h3 className="text-xl font-bold text-white">Hot Zones</h3>
            <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {hotZones.length}
            </span>
          </div>
          <div className="space-y-3">
            {hotZones.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  insight.priority === "urgent"
                    ? "bg-red-500/20 border-red-500"
                    : "bg-orange-500/20 border-orange-500"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-white font-semibold mb-1">
                      {insight.message}
                    </p>
                    <p className="text-white/80 text-sm mb-2">
                      {insight.action}
                    </p>
                    {insight.data && (
                      <div className="text-xs text-white/70 space-y-1">
                        {insight.data.zone && (
                          <div>📍 Zone: {insight.data.zone}</div>
                        )}
                        {insight.data.taskCount && (
                          <div>📊 Active Tasks: {insight.data.taskCount}</div>
                        )}
                        {insight.data.seats && (
                          <div>🪑 Seats: {insight.data.seats}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      insight.priority === "urgent"
                        ? "bg-red-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {insight.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inventory Warnings */}
      {inventoryWarnings.length > 0 && (
        <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-yellow-400" size={24} />
            <h3 className="text-xl font-bold text-white">Inventory Warnings</h3>
            <span className="ml-auto bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {inventoryWarnings.length}
            </span>
          </div>
          <div className="space-y-3">
            {inventoryWarnings.map((insight, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-500/20"
              >
                <p className="text-white font-semibold mb-1">
                  {insight.message}
                </p>
                <p className="text-white/80 text-sm mb-2">{insight.action}</p>
                {insight.data && (
                  <div className="text-xs text-white/70">
                    {insight.data.item && (
                      <div>📦 Item: {insight.data.item}</div>
                    )}
                    {insight.data.requested && (
                      <div>📊 Requested: {insight.data.requested} times</div>
                    )}
                    {insight.data.percentage && (
                      <div>
                        📈 {insight.data.percentage.toFixed(0)}% of total
                        requests
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Forgotten Tasks */}
      {forgottenTasks.length > 0 && (
        <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-red-400" size={24} />
            <h3 className="text-xl font-bold text-white">Forgotten Tasks</h3>
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {forgottenTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {forgottenTasks.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  insight.priority === "urgent"
                    ? "bg-red-500/30 border-red-500"
                    : "bg-orange-500/20 border-orange-500"
                }`}
              >
                <p className="text-white font-semibold mb-1">
                  {insight.message}
                </p>
                <p className="text-white/80 text-sm mb-2">{insight.action}</p>
                {insight.data?.tasks && (
                  <div className="space-y-2 mt-3">
                    {insight.data.tasks.map((task: any, taskIdx: number) => (
                      <div
                        key={taskIdx}
                        className="bg-white/10 rounded p-2 text-xs text-white/90"
                      >
                        <div className="font-semibold">Seat {task.seat}</div>
                        <div className="text-white/70">{task.request}</div>
                        <div className="text-white/60 mt-1">
                          ⏰ Pending for {task.ageMinutes} minutes
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Crew Suggestions */}
      {crewSuggestions.length > 0 && (
        <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-blue-400" size={24} />
            <h3 className="text-xl font-bold text-white">Crew Suggestions</h3>
            <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {crewSuggestions.length}
            </span>
          </div>
          <div className="space-y-3">
            {crewSuggestions.map((insight, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border-2 border-blue-500 bg-blue-500/20"
              >
                <p className="text-white font-semibold mb-1">
                  {insight.message}
                </p>
                <p className="text-white/80 text-sm">{insight.action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Efficiency Opportunities */}
      {efficiencyOps.length > 0 && (
        <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-purple-400" size={24} />
            <h3 className="text-xl font-bold text-white">
              Efficiency Opportunities
            </h3>
            <span className="ml-auto bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {efficiencyOps.length}
            </span>
          </div>
          <div className="space-y-3">
            {efficiencyOps.map((insight, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border-2 border-purple-500 bg-purple-500/20"
              >
                <p className="text-white font-semibold mb-1">
                  {insight.message}
                </p>
                <p className="text-white/80 text-sm">{insight.action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {insights.length === 0 && !loading && (
        <div className="text-center py-12">
          <TrendingUp className="text-white/50 mx-auto mb-4" size={48} />
          <p className="text-white/70 text-lg">No insights at this time</p>
          <p className="text-white/50 text-sm mt-2">
            AI will generate insights as tasks are created
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="text-white animate-spin" size={32} />
          <span className="text-white ml-3">Analyzing tasks...</span>
        </div>
      )}
    </div>
  );
}
