import OpenAI from 'openai';
import { config } from './config';
import { calculatePriority } from './priorityEngine';
import type { FlightContext } from '../types';

const openai = new OpenAI({
  apiKey: config.openai,
  dangerouslyAllowBrowser: true, // Only for demo!
});

export interface ParsedIntent {
  seat: string;
  type: 'meal' | 'beverage' | 'comfort' | 'assistance' | 'medical' | 'information';
  item?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  specialRequirements?: string[];
  suggestedResponse?: string;
  priorityConfidence?: number; // Confidence score from priority engine
  priorityFactors?: string[]; // Reasons for priority assignment
}

// Cache for parsed requests to avoid repeated AI calls
const parseCache = new Map<string, { result: ParsedIntent; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Performance tracking
interface ParsePerformance {
  method: 'cache' | 'fast' | 'ai';
  duration: number;
  timestamp: number;
}

const performanceLog: ParsePerformance[] = [];

function logPerformance(method: 'cache' | 'fast' | 'ai', duration: number) {
  performanceLog.push({ method, duration, timestamp: Date.now() });
  
  // Keep only last 100 entries
  if (performanceLog.length > 100) {
    performanceLog.shift();
  }
  
  // Log performance stats every 10 requests
  if (performanceLog.length % 10 === 0) {
    const recent = performanceLog.slice(-10);
    const avgDuration = recent.reduce((sum, p) => sum + p.duration, 0) / recent.length;
    const methodCounts = recent.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 AI Parsing Performance (last 10 requests):', {
      averageDuration: `${Math.round(avgDuration)}ms`,
      methods: methodCounts,
      cacheHitRate: `${Math.round((methodCounts.cache || 0) / 10 * 100)}%`,
      fastParseRate: `${Math.round((methodCounts.fast || 0) / 10 * 100)}%`,
    });
  }
}

// Fast pattern matching for common request patterns
function tryFastParse(transcript: string): ParsedIntent | null {
  const text = transcript.toLowerCase().trim();
  
  // Extract seat number
  const seatMatch = transcript.match(/\b(\d{1,2}[A-F])\b/i);
  const seat = seatMatch ? seatMatch[1].toUpperCase() : 'unknown';
  
  // Fast patterns for common requests
  const patterns = [
    // Beverages
    { regex: /\b(water|coffee|tea|juice|soda|coke|pepsi|sprite|beer|wine)\b/i, type: 'beverage' as const },
    // Meals
    { regex: /\b(chicken|beef|fish|vegetarian|meal|food|dinner|lunch|breakfast)\b/i, type: 'meal' as const },
    // Comfort
    { regex: /\b(blanket|pillow|headphones|earbuds)\b/i, type: 'comfort' as const },
    // Medical (urgent priority)
    { regex: /\b(sick|nausea|pain|medical|emergency|help|doctor|nurse)\b/i, type: 'medical' as const, priority: 'urgent' as const },
    // Assistance
    { regex: /\b(help|assist|need|bathroom|restroom|toilet)\b/i, type: 'assistance' as const },
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const item = match[1];
      return {
        seat,
        type: pattern.type,
        item,
        priority: pattern.priority || 'normal',
        specialRequirements: [], // Always provide empty array instead of undefined
        suggestedResponse: `I'll help you with ${item} right away.`,
      };
    }
  }
  
  return null;
}

export async function parseRequest(
  transcript: string,
  flightContext?: FlightContext
): Promise<ParsedIntent> {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = transcript.toLowerCase().trim();
  const cached = parseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const duration = Date.now() - startTime;
    logPerformance('cache', duration);
    console.log('🚀 Using cached parse result');
    return cached.result;
  }
  
  // Try fast pattern matching first (covers 80% of common requests)
  const fastResult = tryFastParse(transcript);
  if (fastResult) {
    console.log('⚡ Fast parse successful');
    
    // Still run priority calculation in parallel
    const taskForPriority = {
      id: '',
      seat: fastResult.seat,
      request: transcript,
      type: fastResult.type,
      item: fastResult.item,
      priority: fastResult.priority,
      status: 'pending' as const,
      timestamp: Date.now(),
      specialRequirements: fastResult.specialRequirements,
    };
    
    const priorityResult = calculatePriority(taskForPriority, flightContext);
    
    const result = {
      ...fastResult,
      priority: priorityResult.priority,
      priorityConfidence: priorityResult.confidence,
      priorityFactors: priorityResult.factors,
    };
    
    // Cache the result
    parseCache.set(cacheKey, { result, timestamp: Date.now() });
    
    const duration = Date.now() - startTime;
    logPerformance('fast', duration);
    return result;
  }
  
  // Fall back to AI for complex requests
  console.log('🤖 Using AI for complex parsing');
  
  // Optimized prompt - shorter and more direct
  const prompt = `Parse: "${transcript}"

Extract JSON:
{
  "seat": "32B", // seat number or "unknown"
  "type": "meal|beverage|comfort|assistance|medical|information",
  "item": "specific item",
  "priority": "urgent|high|normal|low",
  "specialRequirements": ["any special needs"],
  "suggestedResponse": "brief crew response"
}`;

  try {
    // Use faster model for simple parsing
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Lower temperature for more consistent results
      max_tokens: 200, // Limit tokens for faster response
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}') as ParsedIntent;
    
    // Ensure all required fields have proper values
    const cleanedParsed = {
      ...parsed,
      seat: parsed.seat || 'unknown',
      type: parsed.type || 'assistance',
      priority: parsed.priority || 'normal',
      specialRequirements: Array.isArray(parsed.specialRequirements) ? parsed.specialRequirements : [],
      suggestedResponse: parsed.suggestedResponse || 'I\'ll assist you right away.',
    } as ParsedIntent;
    
    // Run priority calculation in parallel (don't await immediately)
    const taskForPriority = {
      id: '',
      seat: cleanedParsed.seat,
      request: transcript,
      type: cleanedParsed.type,
      item: cleanedParsed.item,
      priority: cleanedParsed.priority,
      status: 'pending' as const,
      timestamp: Date.now(),
      specialRequirements: cleanedParsed.specialRequirements,
    };
    
    const priorityResult = calculatePriority(taskForPriority, flightContext);
    
    const result = {
      ...cleanedParsed,
      priority: priorityResult.priority,
      priorityConfidence: priorityResult.confidence,
      priorityFactors: priorityResult.factors,
    };
    
    // Cache the result
    parseCache.set(cacheKey, { result, timestamp: Date.now() });
    
    const duration = Date.now() - startTime;
    logPerformance('ai', duration);
    return result;
    
  } catch (error: any) {
    console.error('Failed to parse intent:', error);
    
    // Check for 429 rate limit error (multiple possible error formats)
    const isRateLimit = 
      error?.status === 429 ||
      error?.response?.status === 429 ||
      error?.statusCode === 429 ||
      (error?.message && error.message.includes('429')) ||
      (error?.message && error.message.includes('rate limit'));
    
    if (isRateLimit) {
      // Extract retry-after header if available
      const retryAfter = 
        error?.response?.headers?.['retry-after'] || 
        error?.headers?.['retry-after'] ||
        error?.response?.headers?.['Retry-After'] ||
        error?.headers?.['Retry-After'] ||
        '60';
      
      const retrySeconds = Math.min(parseInt(String(retryAfter), 10) || 60, 60);
      
      // Try once more after a delay (max 60 seconds)
      console.log(`⏳ Rate limited. Retrying after ${retrySeconds} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
        
        const parsed = JSON.parse(response.choices[0].message.content || '{}') as ParsedIntent;
        
        // Ensure all required fields have proper values (same as above)
        const cleanedParsed = {
          ...parsed,
          seat: parsed.seat || 'unknown',
          type: parsed.type || 'assistance',
          priority: parsed.priority || 'normal',
          specialRequirements: Array.isArray(parsed.specialRequirements) ? parsed.specialRequirements : [],
          suggestedResponse: parsed.suggestedResponse || 'I\'ll assist you right away.',
        } as ParsedIntent;
        
        console.log('✅ Retry successful');
        return cleanedParsed;
      } catch (retryError: any) {
        // If retry also fails, throw with user-friendly message
        throw new Error(
          `OpenAI API rate limit exceeded. Please wait ${retrySeconds} seconds before trying again. ` +
          `If this persists, check your OpenAI API usage limits at https://platform.openai.com/usage.`
        );
      }
    }
    
    // Re-throw other errors so they can be handled by the caller
    if (error?.message) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    
    // Fallback: basic parsing for unknown errors
    console.warn('Using fallback parsing due to error');
    const fallbackSeat = extractSeat(transcript) || 'unknown';
    const fallbackTask = {
      id: '',
      seat: fallbackSeat,
      request: transcript,
      type: 'assistance' as const,
      priority: 'normal' as const,
      status: 'pending' as const,
      timestamp: Date.now(),
    };
    
    const priorityResult = calculatePriority(fallbackTask, flightContext);
    
    return {
      seat: fallbackSeat,
      type: 'assistance',
      priority: priorityResult.priority,
      specialRequirements: [], // Always provide empty array
      suggestedResponse: 'I\'ll assist you right away.',
      priorityConfidence: priorityResult.confidence,
      priorityFactors: priorityResult.factors,
    };
  }
}

function extractSeat(text: string): string | null {
  const match = text.match(/\b\d{1,2}[A-F]\b/i);
  return match ? match[0].toUpperCase() : null;
}

// Export performance stats for debugging
export function getParsePerformanceStats() {
  if (performanceLog.length === 0) {
    return { message: 'No parsing requests yet' };
  }
  
  const recent = performanceLog.slice(-20); // Last 20 requests
  const avgDuration = recent.reduce((sum, p) => sum + p.duration, 0) / recent.length;
  const methodCounts = recent.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const fastMethods = (methodCounts.cache || 0) + (methodCounts.fast || 0);
  const speedupRate = Math.round((fastMethods / recent.length) * 100);
  
  return {
    totalRequests: performanceLog.length,
    recentRequests: recent.length,
    averageDuration: `${Math.round(avgDuration)}ms`,
    methods: methodCounts,
    cacheHitRate: `${Math.round((methodCounts.cache || 0) / recent.length * 100)}%`,
    fastParseRate: `${Math.round((methodCounts.fast || 0) / recent.length * 100)}%`,
    speedupRate: `${speedupRate}%`, // Percentage of requests using fast methods
    estimatedSpeedup: speedupRate > 50 ? `${Math.round((1234 * (100 - speedupRate)) / 100)}ms` : 'Not enough fast requests yet'
  };
}
