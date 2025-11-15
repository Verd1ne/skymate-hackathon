export interface Seat {
  row: number;
  side: string; // e.g., 'A', 'B', 'C', etc.
}

export interface FAState {
  seat: Seat;
  section_id: string;
  trolley_blocked: boolean;
}

export interface Task {
  id: string;
  seat: string;
  request: string;
  type: 'meal' | 'beverage' | 'comfort' | 'assistance' | 'medical' | 'information';
  item?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  assignedTo?: string;
  timestamp: number;
  completedAt?: number;
  specialRequirements?: string[];
  // PUP scoring fields (optional for backward compatibility)
  sla_s?: number; // SLA in seconds
  created_s?: number; // creation timestamp in seconds
  passenger_flags?: string[]; // e.g., 'allergy', 'language_match'
  phase?: string; // flight phase for phase multiplier
}

export interface FlightContext {
  phase: 'boarding' | 'takeoff' | 'meal_service' | 'cruise' | 'landing';
  timeToDestination: number; // minutes
  turbulence: boolean;
  seatbeltSign: boolean;
}

export interface Analytics {
  tasksCreated: number;
  tasksCompleted: number;
  tasksForgotten: number;
  avgResponseTime: number;
  errorCount: number;
  forgottenRate: number;
  errorRate: number;
}

