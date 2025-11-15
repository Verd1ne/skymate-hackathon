/**
 * Context Awareness AI Service for Sky Mate
 * 
 * Analyzes flight tasks and provides intelligent insights to optimize
 * crew operations, inventory management, and passenger service.
 * 
 * @module contextAI
 */

import type { Task, FlightContext } from '../types';

/**
 * Insight types returned by the Context AI
 */
export type InsightType = 
  | 'hot_zone' 
  | 'inventory_warning' 
  | 'forgotten_warning' 
  | 'crew_suggestion'
  | 'pattern_detected'
  | 'efficiency_opportunity';

/**
 * Priority levels for insights
 */
export type InsightPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Structure of an AI-generated insight
 */
export interface Insight {
  type: InsightType;
  message: string;
  priority: InsightPriority;
  action: string;
  data?: any;
  timestamp: number;
}

/**
 * Crew member structure for reallocation suggestions
 */
export interface CrewMember {
  id: string;
  name: string;
  currentTasks: number;
  assignedTasks: string[]; // Task IDs
  zone?: string; // Current zone assignment
}

/**
 * Passenger history for pattern prediction
 */
export interface PassengerHistory {
  seat: string;
  requests: Array<{
    type: Task['type'];
    item?: string;
    timestamp: number;
  }>;
  averageRequestInterval?: number; // minutes
}

/**
 * Zone definition for grouping seats
 */
export interface SeatZone {
  name: string;
  rows: string; // e.g., "1-10", "11-20"
  startRow: number;
  endRow: number;
}

/**
 * Inventory count by type
 */
export interface InventoryCount {
  item: string;
  requested: number;
  available?: number;
  shortage?: boolean;
}

/**
 * ContextualAI - Main class for flight task analysis
 */
export class ContextualAI {
  private readonly ZONE_SIZE = 10; // Rows per zone
  private readonly HOT_ZONE_THRESHOLD = 3; // Minimum tasks for hot zone
  private readonly FORGOTTEN_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  private readonly INVENTORY_WARNING_THRESHOLD = 0.2; // 20% of requests

  /**
   * Analyze overall flight state and return all relevant insights
   * 
   * @param tasks - Array of all flight tasks
   * @param flightContext - Current flight context (phase, time, etc.)
   * @returns Array of insights with recommendations
   */
  analyzeFlightState(tasks: Task[], flightContext?: FlightContext): Insight[] {
    const insights: Insight[] = [];
    const activeTasks = tasks.filter(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );

    try {
      // Detect hot zones
      const hotZones = this.detectHotZones(activeTasks);
      insights.push(...hotZones);

      // Check for forgotten tasks
      const forgotten = this.findForgottenTasks(activeTasks);
      insights.push(...forgotten);

      // Predict inventory shortages
      if (flightContext?.phase === 'meal_service' || flightContext?.phase === 'cruise') {
        const inventoryWarnings = this.predictInventoryShortage(activeTasks);
        insights.push(...inventoryWarnings);
      }

      // Detect efficiency opportunities
      const efficiency = this.detectEfficiencyOpportunities(activeTasks, flightContext);
      insights.push(...efficiency);

    } catch (error) {
      console.error('Error analyzing flight state:', error);
    }

    return insights.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Detect hot zones - areas with high activity (3+ requests)
   * 
   * @param tasks - Array of active tasks
   * @returns Array of hot zone insights
   */
  detectHotZones(tasks: Task[]): Insight[] {
    const insights: Insight[] = [];
    const zones = this.groupTasksByZone(tasks);
    
    for (const [zoneName, zoneTasks] of Object.entries(zones)) {
      if (zoneTasks.length >= this.HOT_ZONE_THRESHOLD) {
        const seatNumbers = zoneTasks.map(t => t.seat).join(', ');
        const priority = zoneTasks.length >= 5 ? 'urgent' : 
                        zoneTasks.length >= 4 ? 'high' : 'medium';
        
        insights.push({
          type: 'hot_zone',
          message: `High activity detected in ${zoneName}: ${zoneTasks.length} active requests`,
          priority: priority as InsightPriority,
          action: `Assign additional crew member to ${zoneName} or prioritize tasks in rows ${this.getZoneRows(zoneName)}`,
          data: {
            zone: zoneName,
            taskCount: zoneTasks.length,
            seats: seatNumbers,
            tasks: zoneTasks.map(t => ({ id: t.id, seat: t.seat, type: t.type }))
          },
          timestamp: Date.now()
        });
      }
    }

    return insights;
  }

  /**
   * Predict inventory shortages based on request patterns
   * 
   * @param tasks - Array of active tasks
   * @returns Array of inventory warning insights
   */
  predictInventoryShortage(tasks: Task[]): Insight[] {
    const insights: Insight[] = [];
    const itemCounts = this.countItemsByType(tasks);
    const totalRequests = tasks.length;

    for (const [item, count] of Object.entries(itemCounts)) {
      const percentage = totalRequests > 0 ? (count / totalRequests) : 0;
      
      // If a single item represents >20% of requests, warn about potential shortage
      if (percentage > this.INVENTORY_WARNING_THRESHOLD && count >= 3) {
        const priority = percentage > 0.4 ? 'urgent' : 
                        percentage > 0.3 ? 'high' : 'medium';
        
        insights.push({
          type: 'inventory_warning',
          message: `High demand for ${item}: ${count} requests (${(percentage * 100).toFixed(0)}% of total)`,
          priority: priority as InsightPriority,
          action: `Check inventory levels for ${item} and prepare additional stock if needed`,
          data: {
            item,
            requested: count,
            percentage: percentage * 100,
            tasks: tasks.filter(t => t.item === item).map(t => ({ id: t.id, seat: t.seat }))
          },
          timestamp: Date.now()
        });
      }
    }

    // Check for meal type imbalances
    const mealTypes = this.countMealTypes(tasks);
    if (Object.keys(mealTypes).length > 0) {
      const maxMeal = Math.max(...Object.values(mealTypes));
      const minMeal = Math.min(...Object.values(mealTypes));
      
      if (maxMeal > 0 && minMeal > 0 && (maxMeal / minMeal) > 3) {
        const dominantType = Object.entries(mealTypes).find(([_, count]) => count === maxMeal)?.[0];
        insights.push({
          type: 'inventory_warning',
          message: `Significant imbalance in meal requests: ${dominantType} is ${(maxMeal / minMeal).toFixed(1)}x more requested`,
          priority: 'medium',
          action: `Consider preparing more ${dominantType} meals or offering alternatives`,
          data: { mealTypes, imbalance: maxMeal / minMeal },
          timestamp: Date.now()
        });
      }
    }

    return insights;
  }

  /**
   * Find tasks that have been pending for >10 minutes
   * 
   * @param tasks - Array of active tasks
   * @returns Array of forgotten task warnings
   */
  findForgottenTasks(tasks: Task[]): Insight[] {
    const insights: Insight[] = [];
    const now = Date.now();

    const forgotten = tasks.filter(task => {
      const age = now - task.timestamp;
      return age > this.FORGOTTEN_THRESHOLD_MS && task.status === 'pending';
    });

    if (forgotten.length > 0) {
      // Group by time ranges
      const critical = forgotten.filter(t => (now - t.timestamp) > 20 * 60 * 1000); // >20 min
      const warning = forgotten.filter(t => (now - t.timestamp) <= 20 * 60 * 1000); // 10-20 min

      if (critical.length > 0) {
        insights.push({
          type: 'forgotten_warning',
          message: `🚨 ${critical.length} task(s) pending for over 20 minutes!`,
          priority: 'urgent',
          action: 'Immediately address these tasks to prevent passenger dissatisfaction',
          data: {
            tasks: critical.map(t => ({
              id: t.id,
              seat: t.seat,
              request: t.request,
              ageMinutes: Math.floor((now - t.timestamp) / 60000)
            }))
          },
          timestamp: Date.now()
        });
      }

      if (warning.length > 0) {
        insights.push({
          type: 'forgotten_warning',
          message: `⚠️ ${warning.length} task(s) pending for 10-20 minutes`,
          priority: 'high',
          action: 'Review and prioritize these tasks soon',
          data: {
            tasks: warning.map(t => ({
              id: t.id,
              seat: t.seat,
              request: t.request,
              ageMinutes: Math.floor((now - t.timestamp) / 60000)
            }))
          },
          timestamp: Date.now()
        });
      }
    }

    return insights;
  }

  /**
   * Suggest crew reallocation based on task distribution
   * 
   * @param tasks - Array of active tasks
   * @param crewMembers - Array of crew members with current assignments
   * @returns Array of crew reallocation suggestions
   */
  suggestCrewReallocation(tasks: Task[], crewMembers: CrewMember[]): Insight[] {
    const insights: Insight[] = [];
    
    if (crewMembers.length === 0) {
      return insights;
    }

    try {
      const zones = this.groupTasksByZone(tasks);
      const zoneTaskCounts = Object.entries(zones).map(([zone, tasks]) => ({
        zone,
        count: tasks.length
      })).sort((a, b) => b.count - a.count);

      // Calculate average tasks per crew member
      const totalTasks = tasks.length;
      const avgTasksPerCrew = totalTasks / crewMembers.length;

      // Find overloaded and underloaded crew members
      const overloaded = crewMembers.filter(c => c.currentTasks > avgTasksPerCrew * 1.5);
      const underloaded = crewMembers.filter(c => c.currentTasks < avgTasksPerCrew * 0.5);

      // Find zones that need more help
      const highLoadZones = zoneTaskCounts.filter(z => z.count >= this.HOT_ZONE_THRESHOLD);

      if (overloaded.length > 0 && underloaded.length > 0 && highLoadZones.length > 0) {
        const mostOverloaded = overloaded.sort((a, b) => b.currentTasks - a.currentTasks)[0];
        const mostUnderloaded = underloaded.sort((a, b) => a.currentTasks - b.currentTasks)[0];
        const busiestZone = highLoadZones[0];

        insights.push({
          type: 'crew_suggestion',
          message: `Crew reallocation recommended: ${mostOverloaded.name} has ${mostOverloaded.currentTasks} tasks while ${mostUnderloaded.name} has ${mostUnderloaded.currentTasks}`,
          priority: highLoadZones.length > 1 ? 'high' : 'medium',
          action: `Consider reassigning ${mostUnderloaded.name} to assist in ${busiestZone.zone} (${busiestZone.count} tasks)`,
          data: {
            from: {
              id: mostOverloaded.id,
              name: mostOverloaded.name,
              tasks: mostOverloaded.currentTasks
            },
            to: {
              id: mostUnderloaded.id,
              name: mostUnderloaded.name,
              tasks: mostUnderloaded.currentTasks
            },
            targetZone: busiestZone.zone,
            zoneTaskCount: busiestZone.count
          },
          timestamp: Date.now()
        });
      }

      // Suggest zone assignments for unassigned crew
      const unassignedCrew = crewMembers.filter(c => !c.zone && c.currentTasks === 0);
      if (unassignedCrew.length > 0 && highLoadZones.length > 0) {
        highLoadZones.forEach(zone => {
          insights.push({
            type: 'crew_suggestion',
            message: `${zone.zone} needs attention: ${zone.count} active tasks`,
            priority: zone.count >= 5 ? 'high' : 'medium',
            action: `Assign ${unassignedCrew[0].name} to ${zone.zone}`,
            data: {
              crewMember: unassignedCrew[0],
              zone: zone.zone,
              taskCount: zone.count
            },
            timestamp: Date.now()
          });
        });
      }

    } catch (error) {
      console.error('Error suggesting crew reallocation:', error);
    }

    return insights;
  }

  /**
   * Predict next request based on passenger history
   * 
   * @param passengerHistory - History of passenger requests
   * @returns Prediction insight or null
   */
  predictNextRequest(passengerHistory: PassengerHistory[]): Insight | null {
    try {
      // Find passengers with patterns
      const patterns = passengerHistory
        .filter(p => p.requests.length >= 2)
        .map(p => {
          const intervals = this.calculateRequestIntervals(p.requests);
          const avgInterval = intervals.length > 0 
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
            : null;
          
          return {
            seat: p.seat,
            avgInterval,
            lastRequest: p.requests[p.requests.length - 1],
            requestCount: p.requests.length
          };
        })
        .filter(p => p.avgInterval !== null && p.avgInterval < 60); // Patterns within 1 hour

      if (patterns.length === 0) {
        return null;
      }

      // Find passengers likely to request again soon
      const now = Date.now();
      const upcoming = patterns
        .map(p => {
          const timeSinceLast = (now - p.lastRequest.timestamp) / 60000; // minutes
          const timeUntilNext = (p.avgInterval || 0) - timeSinceLast;
          return { ...p, timeUntilNext };
        })
        .filter(p => p.timeUntilNext > 0 && p.timeUntilNext < 15) // Next 15 minutes
        .sort((a, b) => a.timeUntilNext - b.timeUntilNext);

      if (upcoming.length > 0) {
        const mostLikely = upcoming[0];
        return {
          type: 'pattern_detected',
          message: `Passenger ${mostLikely.seat} may request ${this.predictItemType(mostLikely.lastRequest)} soon (pattern detected)`,
          priority: 'low',
          action: `Prepare for potential request from seat ${mostLikely.seat} in ~${Math.round(mostLikely.timeUntilNext)} minutes`,
          data: {
            seat: mostLikely.seat,
            predictedItem: this.predictItemType(mostLikely.lastRequest),
            timeUntilNext: Math.round(mostLikely.timeUntilNext),
            confidence: this.calculatePatternConfidence(mostLikely)
          },
          timestamp: Date.now()
        };
      }

    } catch (error) {
      console.error('Error predicting next request:', error);
    }

    return null;
  }

  /**
   * Detect efficiency opportunities based on task patterns
   * 
   * @param tasks - Array of active tasks
   * @param flightContext - Current flight context
   * @returns Array of efficiency insights
   */
  private detectEfficiencyOpportunities(tasks: Task[], flightContext?: FlightContext): Insight[] {
    const insights: Insight[] = [];

    try {
      // Batch processing opportunities
      const zones = this.groupTasksByZone(tasks);
      for (const [zone, zoneTasks] of Object.entries(zones)) {
        if (zoneTasks.length >= 2) {
          const sameTypeTasks = this.groupByType(zoneTasks);
          for (const [type, typeTasks] of Object.entries(sameTypeTasks)) {
            if (typeTasks.length >= 3) {
              insights.push({
                type: 'efficiency_opportunity',
                message: `${typeTasks.length} ${type} tasks in ${zone} - consider batch processing`,
                priority: 'low',
                action: `Process all ${type} requests in ${zone} together to save time`,
                data: {
                  zone,
                  type,
                  count: typeTasks.length,
                  seats: typeTasks.map(t => t.seat)
                },
                timestamp: Date.now()
              });
            }
          }
        }
      }

      // Time-based efficiency (e.g., meal service timing)
      if (flightContext?.phase === 'meal_service' && tasks.length > 10) {
        const pendingMeals = tasks.filter(t => t.type === 'meal' && t.status === 'pending').length;
        if (pendingMeals > 5) {
          insights.push({
            type: 'efficiency_opportunity',
            message: `${pendingMeals} meal requests pending - consider cart service`,
            priority: 'medium',
            action: 'Use meal cart to serve multiple passengers efficiently',
            data: { pendingMeals, totalTasks: tasks.length },
            timestamp: Date.now()
          });
        }
      }

    } catch (error) {
      console.error('Error detecting efficiency opportunities:', error);
    }

    return insights;
  }

  // ==================== Helper Functions ====================

  /**
   * Group tasks by seat zones (rows 1-10, 11-20, etc.)
   * 
   * @param tasks - Array of tasks
   * @returns Object mapping zone names to task arrays
   */
  private groupTasksByZone(tasks: Task[]): Record<string, Task[]> {
    const zones: Record<string, Task[]> = {};

    for (const task of tasks) {
      const zone = this.getZoneForSeat(task.seat);
      if (!zones[zone]) {
        zones[zone] = [];
      }
      zones[zone].push(task);
    }

    return zones;
  }

  /**
   * Get zone name for a given seat
   * 
   * @param seat - Seat number (e.g., "16A", "32B")
   * @returns Zone name (e.g., "Rows 11-20")
   */
  private getZoneForSeat(seat: string): string {
    const match = seat.match(/(\d+)/);
    if (!match) return 'Unknown';
    
    const row = parseInt(match[1]);
    const zoneStart = Math.floor((row - 1) / this.ZONE_SIZE) * this.ZONE_SIZE + 1;
    const zoneEnd = zoneStart + this.ZONE_SIZE - 1;
    
    return `Rows ${zoneStart}-${zoneEnd}`;
  }

  /**
   * Get row numbers for a zone name
   * 
   * @param zoneName - Zone name (e.g., "Rows 11-20")
   * @returns Row range string
   */
  private getZoneRows(zoneName: string): string {
    const match = zoneName.match(/(\d+)-(\d+)/);
    return match ? match[0] : zoneName;
  }

  /**
   * Count items by type across all tasks
   * 
   * @param tasks - Array of tasks
   * @returns Object mapping item names to counts
   */
  private countItemsByType(tasks: Task[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const task of tasks) {
      if (task.item) {
        const item = task.item.toLowerCase();
        counts[item] = (counts[item] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Count meal types
   * 
   * @param tasks - Array of tasks
   * @returns Object mapping meal types to counts
   */
  private countMealTypes(tasks: Task[]): Record<string, number> {
    const mealTasks = tasks.filter(t => t.type === 'meal' && t.item);
    const counts: Record<string, number> = {};

    for (const task of mealTasks) {
      const item = (task.item || '').toLowerCase();
      // Extract meal type (chicken, beef, vegetarian, etc.)
      const mealType = item.split(' ')[0];
      if (mealType) {
        counts[mealType] = (counts[mealType] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Group tasks by type
   * 
   * @param tasks - Array of tasks
   * @returns Object mapping task types to task arrays
   */
  private groupByType(tasks: Task[]): Record<string, Task[]> {
    const grouped: Record<string, Task[]> = {};

    for (const task of tasks) {
      if (!grouped[task.type]) {
        grouped[task.type] = [];
      }
      grouped[task.type].push(task);
    }

    return grouped;
  }

  /**
   * Calculate time differences between requests
   * 
   * @param requests - Array of request timestamps
   * @returns Array of intervals in minutes
   */
  private calculateRequestIntervals(requests: Array<{ timestamp: number }>): number[] {
    const intervals: number[] = [];

    for (let i = 1; i < requests.length; i++) {
      const interval = (requests[i].timestamp - requests[i - 1].timestamp) / 60000; // minutes
      intervals.push(interval);
    }

    return intervals;
  }

  /**
   * Predict item type based on last request
   * 
   * @param lastRequest - Last request object
   * @returns Predicted item type
   */
  private predictItemType(lastRequest: { type: Task['type']; item?: string }): string {
    if (lastRequest.item) {
      return lastRequest.item;
    }
    return lastRequest.type;
  }

  /**
   * Calculate confidence score for pattern prediction
   * 
   * @param pattern - Pattern data
   * @returns Confidence score (0-1)
   */
  private calculatePatternConfidence(pattern: {
    requestCount: number;
    avgInterval: number | null;
  }): number {
    let confidence = 0.5; // Base confidence

    // More requests = higher confidence
    if (pattern.requestCount >= 3) confidence += 0.2;
    if (pattern.requestCount >= 4) confidence += 0.1;

    // Consistent intervals = higher confidence
    if (pattern.avgInterval && pattern.avgInterval < 30) confidence += 0.2;

    return Math.min(1.0, confidence);
  }

  /**
   * Get priority weight for sorting
   * 
   * @param priority - Priority level
   * @returns Numeric weight
   */
  private getPriorityWeight(priority: InsightPriority): number {
    const weights = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };
    return weights[priority] || 0;
  }
}

/**
 * Create a singleton instance of ContextualAI
 */
export const contextAI = new ContextualAI();

/**
 * Helper function to calculate time difference in minutes
 * 
 * @param timestamp1 - First timestamp (ms)
 * @param timestamp2 - Second timestamp (ms), defaults to now
 * @returns Time difference in minutes
 */
export function calculateTimeDifference(timestamp1: number, timestamp2: number = Date.now()): number {
  return Math.floor((timestamp2 - timestamp1) / 60000);
}

/**
 * Helper function to format time duration
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "15 minutes", "1 hour")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Helper function to extract row number from seat
 * 
 * @param seat - Seat identifier (e.g., "16A", "32B")
 * @returns Row number or null
 */
export function extractRowNumber(seat: string): number | null {
  const match = seat.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Helper function to check if seat is in a specific zone
 * 
 * @param seat - Seat identifier
 * @param zoneStart - Starting row of zone
 * @param zoneEnd - Ending row of zone
 * @returns True if seat is in zone
 */
export function isSeatInZone(seat: string, zoneStart: number, zoneEnd: number): boolean {
  const row = extractRowNumber(seat);
  return row !== null && row >= zoneStart && row <= zoneEnd;
}

