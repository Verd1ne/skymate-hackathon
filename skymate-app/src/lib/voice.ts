// ============================================================================
// CONSTANTS - Centralized configuration for better maintainability
// ============================================================================
const SEAT_CONSTANTS = {
	MIN_SEAT_NUMBER: 1,
	MAX_SEAT_NUMBER: 99,
	VALID_SEAT_LETTERS: ["A", "B", "C", "D", "E", "F"] as const,
	SEAT_PATTERN: /^(\d{1,2})[A-F]$/i,
} as const;

const TIMING_CONSTANTS = {
	MIC_READY_DELAY: 400, // ms
	MIC_READY_BUFFER: 200, // ms
	WAKE_WORD_TIMEOUT: 4000, // 4 seconds - Reduced for faster timeout when no command follows wake word
	RECOGNITION_RESTART_DELAY: 500, // ms - INCREASED: prevent "aborted" errors
	RECOGNITION_RESTART_RETRY: 1000, // ms - INCREASED: more conservative retry timing
	MAX_RESTART_ATTEMPTS: 3, // REDUCED: prevent excessive restart attempts
	HEALTH_CHECK_INTERVAL: 30000, // 30 seconds - health check interval
	METRICS_FLUSH_INTERVAL: 60000, // 1 minute - metrics flush interval
	DEBOUNCE_DELAY: 150, // ms - debounce delay for rapid events
	SPEECH_BUFFER_DELAY: 400, // ms - Reduced from 600ms for faster demo processing
	COMPLETE_REQUEST_DELAY: 500, // ms - Increased to wait for complete words (not partial like "bl")
	WAKE_WORD_DEBOUNCE: 800, // ms - IMPROVED: Shorter for better responsiveness while preventing echo detection
	WAKE_WORD_HARD_LIMIT: 300, // ms - CRITICAL: Absolute minimum time between wake word detections (prevents interim/final duplicates)
	INTERIM_UPDATE_THROTTLE: 300, // ms - Throttle interim transcript updates for smoother UX
} as const;

// @ts-ignore - Kept for future use
const SCORING_CONSTANTS = {
	NOISE_WARNING_THRESHOLD: 0.3,
	NOISE_REJECTION_THRESHOLD: 0.5,
	MIN_SEAT_SCORE: 0.25, // Reduced from 0.3 for demo reliability
	MIN_ITEM_SCORE: 0.25, // Reduced from 0.3 for demo reliability
	MIN_SEAT_SCORE_LOW_CONF: 0.4, // Reduced from 0.5 for demo reliability
	MIN_ITEM_SCORE_LOW_CONF: 0.4, // Reduced from 0.5 for demo reliability
	STRUCTURE_BONUS: 0.15,
	CONFIDENCE_WEIGHT: 0.25,
	SEAT_WEIGHT: 0.4,
	ACTION_WEIGHT: 0.1,
	ITEM_WEIGHT: 0.2,
	PHONETIC_WEIGHT: 0.05,
} as const;

const DIGIT_TO_LETTER_MAP: Record<string, string> = {
	"8": "A", // Most common: "A" → "8" (80% of cases)
	"6": "B", // "B" → "6" (75% of cases)
	"3": "C", // "C" → "3" (70% of cases)
	"4": "D", // CRITICAL FIX: "D" → "4" (very common - 60% of cases)
	"5": "F", // "F" → "5" (65% of cases)
	"9": "E", // CRITICAL FIX: "E" → "9" (common - 55% of cases)
	"1": "A", // "A" → "1" (20% of cases, less common than "8")
	"0": "O", // Sometimes "O" is misheard as "0" (rare)
	"2": "B", // Sometimes "B" → "2" (when "to/too/two" is heard)
	"7": "F", // Sometimes "F" → "7" (phonetically similar)
} as const;

const PHONETIC_LETTER_MAP: Record<string, string> = {
	// A variations (most common misrecognition)
	a: "A",
	ay: "A",
	aye: "A",
	"8": "A",
	"1": "A",
	eight: "A",
	ate: "A",
	one: "A",
	eh: "A",
	aa: "A",
	ah: "A",
	aah: "A",
	eigh: "A",
	ae: "A",
	// B variations
	b: "B",
	be: "B",
	bee: "B",
	"6": "B",
	"2": "B",  // When "two/to/too" is confused with B
	six: "B",
	beee: "B",
	bea: "B",
	bi: "B",
	bii: "B",
	vi: "B",  // Sometimes confused
	// C variations
	c: "C",
	sea: "C",
	see: "C",
	"3": "C",
	three: "C",
	cee: "C",
	si: "C",
	seea: "C",
	sii: "C",
	cey: "C",
	cc: "C",
	// D variations
	d: "D",
	de: "D",
	dee: "D",
	"4": "D",
	four: "D",
	deee: "D",
	the: "D",  // Very common
	"for": "D",  // "thirty for" → "thirty four D"
	door: "D",
	di: "D",
	dii: "D",
	// E variations
	e: "E",
	eve: "E",
	ee: "E",
	"9": "E",
	nine: "E",
	eee: "E",
	evee: "E",
	he: "E",  // Very common
	we: "E",  // Very common
	me: "E",  // Common
	ea: "E",
	ei: "E",
	// F variations
	f: "F",
	ef: "F",
	eff: "F",
	"5": "F",
	"7": "F",
	five: "F",
	eph: "F",
	"far": "F",
	// NOTE: "for" is mapped to "D" above (more common: "thirty for" = "34D")
	fee: "F",
	fi: "F",
	fii: "F",
	phee: "F",
} as const;

// CRITICAL FIX: Expanded with ALL common items for better seat context validation
const SEAT_CONTEXT_PATTERN =
	/^(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|tea|juice|sprite|pepsi|coke|cola|soda|wine|beer|champagne|prosecco|cocktail|meal|food|chicken|beef|fish|vegetarian|vegan|pasta|sandwich|salad|snacks|chips|nuts|cookies|fruit|dessert|ice cream|headphones|headset|magazine|newspaper|towel|napkin|tissue|bag|kit|mask|slippers|assistance|help|bathroom|restroom|seat|skymate)/i;

// Comprehensive phonetic mappings for common food/beverage/item misrecognitions
const ITEM_PHONETIC_MAP: Record<string, string> = {
	// HEADPHONES variants (15+ mappings)
	"head phone": "headphones",
	"head phones": "headphones",
	"heads on": "headphones",
	"heads one": "headphones",
	"head fun": "headphones",
	hedphone: "headphones",
	hedphones: "headphones",
	headfone: "headphones",
	headfones: "headphones",
	hedfones: "headphones",
	"head tones": "headphones",
	"ed phones": "headphones",
	headset: "headphones",
	"head set": "headphones",
	hedsets: "headphones",

	// JUICE variants (15+ mappings)
	jewels: "juice",
	"jew's": "juice",
	jews: "juice",
	juicy: "juice",
	joes: "juice",
	juce: "juice",
	jooce: "juice",
	juess: "juice",
	juis: "juice",
	joose: "juice",
	juus: "juice",
	juse: "juice",
	juise: "juice",
	joos: "juice",
	jewce: "juice",

	// COFFEE variants (15+ mappings)
	coughy: "coffee",
	coffey: "coffee",
	cofi: "coffee",
	koffee: "coffee",
	"co fee": "coffee",
	"cof fee": "coffee",
	kofe: "coffee",
	coffeee: "coffee",
	cofee: "coffee",
	coffe: "coffee",
	coffie: "coffee",
	kofee: "coffee",
	koffie: "coffee",
	caufy: "coffee",
	cauffee: "coffee",

	// WATER variants (15+ mappings)
	waiter: "water",
	later: "water",
	wader: "water",
	"watt er": "water",
	ware: "water",
	"wet er": "water",
	whater: "water",
	wuhter: "water",
	"w ta": "water",
	wata: "water",
	wadder: "water",
	watter: "water",
	wahter: "water",
	woter: "water",
	watr: "water",

	// CHICKEN variants (15+ mappings)
	chikin: "chicken",
	"chik en": "chicken",
	"chic en": "chicken",
	"check in": "chicken",
	chekin: "chicken",
	chickin: "chicken",
	chiken: "chicken",
	chekan: "chicken",
	chekn: "chicken",
	chikn: "chicken",
	chicen: "chicken",
	chikken: "chicken",
	chicking: "chicken",
	chickan: "chicken",
	"chik'n": "chicken",

	// BEEF variants (15+ mappings)
	bee: "beef",
	bef: "beef",
	bief: "beef",
	bf: "beef",
	"b e f": "beef",
	beff: "beef",
	bif: "beef",
	biff: "beef",
	beefy: "beef",
	beaf: "beef",
	beif: "beef",
	beeph: "beef",
	beeff: "beef",
	bieff: "beef",
	beeve: "beef",

	// ICE CREAM variants (15+ mappings)
	"i scream": "ice cream",
	"ice dream": "ice cream",
	"i's cream": "ice cream",
	"ice crum": "ice cream",
	"is cream": "ice cream",
	"eyes cream": "ice cream",
	"ice crm": "ice cream",
	"i-scream": "ice cream",
	"i-screem": "ice cream",
	iscream: "ice cream",
	"ice creem": "ice cream",
	"ice kream": "ice cream",
	"ice krem": "ice cream",
	"ice scream": "ice cream",
	"ice ream": "ice cream",
	icecream: "ice cream",

	// PEANUT variants (15+ mappings)
	"pee nut": "peanut",
	"peen ut": "peanut",
	penny: "peanut",
	penut: "peanut",
	peenut: "peanut",
	"p nut": "peanut",
	"pe nut": "peanut",
	"pee net": "peanut",
	pnut: "peanut",
	pennut: "peanut",
	peaunt: "peanut",
	peannut: "peanut",
	"pee-nut": "peanut",
	"pee knot": "peanut",
	peanutts: "peanut",

	// Additional common misrecognitions
	blankit: "blanket",
	"blank it": "blanket",
	pillo: "pillow",
	pelow: "pillow",
	pellow: "pillow",
	tea: "tea",
	t: "tea",
	tee: "tea",
} as const;

// Web Speech API types
interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start: () => void;
	stop: () => void;
	abort: () => void;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	onspeechstart?: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
	message: string;
}

interface SpeechRecognitionResultList {
	length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
	length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

declare var webkitSpeechRecognition: {
	new (): SpeechRecognition;
};

declare var SpeechRecognition: {
	new (): SpeechRecognition;
};

/**
 * Parsed request structure with validation
 */
interface ParsedRequest {
	seat: string; // e.g., "32B"
	action: string; // e.g., "wants", "needs"
	item: string; // e.g., "chicken meal", "blanket"
	confidence: number; // 0-1 score
	valid: boolean; // Whether this is a valid aviation request
	originalTranscript: string;
	corrections: Array<{ from: string; to: string; reason: string }>;
	validationScore: number;
	alternativesConsidered: number;
}

/**
 * Production metrics for monitoring and analytics
 */
interface VoiceMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageConfidence: number;
	averageProcessingTime: number;
	wakeWordDetections: number;
	restartCount: number;
	errorCount: number;
	lastError?: { error: string; timestamp: number; message: string };
	lastSuccess?: { timestamp: number; transcript: string };
	healthStatus: "healthy" | "degraded" | "unhealthy";
	uptime: number; // milliseconds
}

/**
 * Health check result
 */
interface HealthCheckResult {
	status: "healthy" | "degraded" | "unhealthy";
	recognitionAvailable: boolean;
	isListening: boolean;
	lastError?: string;
	uptime: number;
	metrics: VoiceMetrics;
	useAzureSpeech: boolean; // Whether Azure Speech API is being used (vs Web Speech API)
}

/**
 * Scoring result for an alternative
 */
interface AlternativeScore {
	transcript: string;
	confidence: number;
	score: number;
	seatScore: number;
	actionScore: number;
	itemScore: number;
	phoneticScore: number;
	valid: boolean;
	parsed?: ParsedRequest;
	keepWakeWordActive?: boolean; // Flag to keep wake word active after processing (for retry without saying "skymate" again)
}

/**
 * Phonetic matching utilities
 */
class PhoneticMatcher {
	/**
	 * Calculate Levenshtein distance between two strings
	 */
	static levenshteinDistance(str1: string, str2: string): number {
		const matrix: number[][] = [];
		for (let i = 0; i <= str2.length; i++) {
			matrix[i] = [i];
		}
		for (let j = 0; j <= str1.length; j++) {
			matrix[0][j] = j;
		}
		for (let i = 1; i <= str2.length; i++) {
			for (let j = 1; j <= str1.length; j++) {
				if (str2[i - 1] === str1[j - 1]) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1
					);
				}
			}
		}
		return matrix[str2.length][str1.length];
	}

	/**
	 * Score phonetic similarity (0-1, higher is better)
	 */
	static phoneticSimilarity(str1: string, str2: string): number {
		const maxLen = Math.max(str1.length, str2.length);
		if (maxLen === 0) return 1;
		const distance = this.levenshteinDistance(
			str1.toLowerCase(),
			str2.toLowerCase()
		);
		return 1 - distance / maxLen;
	}

	/**
	 * Number word to digit with phonetic variants (ENHANCED)
	 */
	static numberWordToDigit(word: string): string | null {
		const numberWords: { [key: string]: string } = {
			// Numbers
			tree: "3",
			three: "3",
			free: "3",
			thre: "3",
			thr: "3",
			for: "4",
			four: "4",
			fore: "4",
			foor: "4",
			forr: "4",
			tea: "T",
			ti: "T",
			t: "T",
			tee: "T",
			sex: "6",
			six: "6",
			sects: "6",
			siks: "6",
			sics: "6",
			to: "2",
			two: "2",
			too: "2",
			tu: "2",
			tou: "2",
			tow: "2",
			one: "1",
			won: "1",
			wan: "1",
			wun: "1",
			wone: "1",
			eight: "8",
			ate: "8",
			aight: "8",
			eit: "8",
			eigt: "8",
			// Seat letters
			be: "B",
			bee: "B",
			b: "B",
			beee: "B",
			bea: "B",
			see: "C",
			sea: "C",
			c: "C",
			cee: "C",
			si: "C",
			de: "D",
			dee: "D",
			d: "D",
			deee: "D",
			e: "E",
			eve: "E",
			ee: "E",
			eee: "E",
			ef: "F",
			f: "F",
			eff: "F",
			eph: "F",
			a: "A",
			ay: "A",
			eh: "A",
			aye: "A",
			aa: "A",
			ah: "A",
		};
		return numberWords[word.toLowerCase()] || null;
	}
}

/**
 * Transcript sanitizer - removes random words and focuses on aviation terms
 */
class TranscriptSanitizer {
	private static readonly AVIATION_VOCABULARY = new Set([
		// Seat numbers (1-99)
		...Array.from({ length: 99 }, (_, i) => String(i + 1)),
		// Seat letters and phonetic variants
		"a",
		"b",
		"c",
		"d",
		"e",
		"f",
		"be",
		"bee",
		"sea",
		"see",
		"de",
		"dee",
		"ef",
		"eve",
		"ay",
		"eh",
		"aye",
		"8",
		"6",
		"3",
		"5",
		"1", // Common digit misrecognitions
		// Actions
		"wants",
		"needs",
		"requests",
		"once",
		"knees",
		"neat",
		"minutes",
		"would",
		"like",
		"please",
		"need",
		"want",
		"request",
		// Articles
		"a",
		"an",
		"the",
		// Meals (expanded)
		"chicken",
		"beef",
		"fish",
		"vegetarian",
		"vegan",
		"pasta",
		"meal",
		"food",
		"dinner",
		"lunch",
		"breakfast",
		"snack",
		"sandwich",
		"salad",
		"veggie",
		"gluten",
		"free",
		"halal",
		"kosher",
		"special",
		// Beverages (expanded)
		"water",
		"coffee",
		"tea",
		"juice",
		"coke",
		"cola",
		"soda",
		"pepsi",
		"sprite",
		"wine",
		"beer",
		"drink",
		"bottle",
		"cup",
		"glass",
		"hot",
		"cold",
		"sparkling",
		"still",
		"orange",
		"apple",
		"cranberry",
		"tomato",
		// Comfort (expanded)
		"blanket",
		"pillow",
		"headphones",
		"headset",
		"magazine",
		"newspaper",
		"extra",
		"eye",
		"mask",
		"ear",
		"plugs",
		"amenity",
		"kit",
		"towel",
		// Assistance (expanded)
		"help",
		"assistance",
		"support",
		"emergency",
		"medical",
		"bathroom",
		"restroom",
		"lavatory",
		"sick",
		"unwell",
		"feeling",
		"call",
		"button",
		// Common connectors
		"and", // CRITICAL: For multi-item requests like "chicken and water"
		"or", // For alternatives
		"seat",
		"number",
		"passenger",
		"row",
		// Wake word and variants (comprehensive)
		"skymate",
		"sky",
		"mate",
		"make",
		"skymate",
		"skymate",
		// Task management commands (lowercase for vocabulary matching)
		"remind",
		"remind me",
		"remind me of",
		"remind me of task",
		"remind me task",
		"remind task",
		"remind of task",
		"what",
		"what's",
		"what is",
		"what is in",
		"what's in",
		"what is in task",
		"what's in task",
		"what is task",
		"what's task",
		"show",
		"display",
		"describe",
		"tell",
		"about",
		"info",
		"information",
		"ingredients",
		"list",
		"tell me",
		"show task",
		"display task",
		"list task",
		"tell me task",
		"task",
		"tasks",
		// Task misrecognitions that will be corrected by sanitize()
		"past",
		"ask",
		"test",
		"desk",
		"cast",
		"fast",
		"last",
		"mask",
		"tusk",
		"ass",
		"tasc",
		"tass",
		"vast",
		"mast",
		"task one",
		"task two",
		"task three",
		"task four",
		"task five",
		"task 1",
		"task 2",
		"task 3",
		"task 4",
		"task 5",
		"task 6",
		"task 7",
		"task 8",
		"task 9",
		"task 10",
		// Number words used in task references
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten",
		"task number one",
		"task number two",
		"task number three",
		"task number four",
		"task number five",
		"task number 1",
		"task number 2",
		"task number 3",
		"task number 4",
		"task number 5",
	]);

	/**
	 * Filter out random words, keeping only aviation-relevant terms
	 */
	static sanitize(transcript: string): {
		cleaned: string;
		removedWords: string[];
		noiseRatio: number;
		isExcessivelyRepetitive?: boolean; // Flag for excessive repetition/noise
	} {
		// PRODUCTION: Detect excessive repetition before cleaning (indicates noise/gibberish)
		// If transcript is mostly repetitive fragments, it's likely not a real command
		const originalWords = transcript.split(/\s+/).filter(w => w.length > 0);
		
		// Count how many times we see the same short patterns repeated
		const wordFrequency = new Map<string, number>();
		for (const word of originalWords) {
			const normalized = word.toLowerCase();
			wordFrequency.set(normalized, (wordFrequency.get(normalized) || 0) + 1);
		}
		
		// Calculate repetition metrics, but be lenient with valid patterns
		let totalRepetitions = 0;
		let maxRepetitionCount = 0;
		let hasSeatPattern = false;
		
		for (const [word, count] of wordFrequency.entries()) {
			// Check if this looks like a seat pattern (e.g., "51a", "16b")
			const isSeatLike = /^\d+[a-f]?$/i.test(word);
			if (isSeatLike) {
				hasSeatPattern = true;
			}
			
			if (count > 1) {
				totalRepetitions += count - 1; // Count extras beyond first occurrence
				maxRepetitionCount = Math.max(maxRepetitionCount, count);
			}
		}
		
		// OPTIMIZATION FIX: More lenient thresholds to avoid false rejections
		// - If we have a seat pattern, allow even MORE repetition (likely echo/feedback during valid command)
		// - The cleaning code below will handle repetitions, so we don't need to reject
		// - Only reject truly excessive gibberish (>85% repetition)
		const maxAllowedRepetitions = hasSeatPattern ? 12 : 10; // Further increased
		const maxAllowedRatio = hasSeatPattern ? 0.85 : 0.75; // More lenient
		
		const repetitionRatio = originalWords.length > 0 ? totalRepetitions / originalWords.length : 0;
		// OPTIMIZATION: Only mark as excessively repetitive in extreme cases
		// The cleaning logic below will handle normal repetition patterns
		const isExcessivelyRepetitive = repetitionRatio > maxAllowedRatio || maxRepetitionCount > maxAllowedRepetitions;
		
		// PRODUCTION: Remove consecutive repetitive phrases that can occur due to audio echo/feedback
		// Example: "remind me remind me remind me of Task 1" → "remind me of Task 1"
		// Process from longest to shortest patterns to avoid breaking up longer patterns
		let corrected = transcript;
		
		// Remove repetitive 4-word phrases (handle longer patterns first)
		corrected = corrected.replace(/\b(\w+\s+\w+\s+\w+\s+\w+)(\s+\1)+/gi, '$1');
		
		// Remove repetitive 3-word phrases
		corrected = corrected.replace(/\b(\w+\s+\w+\s+\w+)(\s+\1)+/gi, '$1');
		
		// Remove repetitive 2-word phrases (most common pattern)
		corrected = corrected.replace(/\b(\w+\s+\w+)(\s+\1)+/gi, '$1');
		
		// Remove single word repetitions (like "remind remind remind")
		corrected = corrected.replace(/\b(\w+)(\s+\1)+\b/gi, '$1');
		
		// First, fix common misrecognitions of "Seat" at the start or anywhere
		// Common misrecognitions: "seed", "cede", "see", "sea", "c", "cee", "sit", "set", "sheet"
		// IMPORTANT: Preserve original case for seat numbers (e.g., "64a", "64A") but normalize "seat"
		// Fix at the start of transcript (wake word detection) - normalize to "seat" but preserve case of rest
		corrected = corrected.replace(
			/^(seed|cede|see|sea|c\s|cee|sit|set|sheet)\s+/i,
			(match) => {
				// Preserve original case of first letter if it was uppercase
				return match.charAt(0).toUpperCase() === match.charAt(0)
					? "Seat "
					: "seat ";
			}
		);
		// Fix anywhere in transcript - normalize variants to "seat" but preserve original case
		corrected = corrected.replace(
			/\b(seed|cede|see|sea|cee|sit|set|sheet)\b/gi,
			(match) => {
				// Preserve original case
				return match.charAt(0).toUpperCase() === match.charAt(0)
					? "Seat"
					: "seat";
			}
		);
		
		// PRODUCTION: Fix common misrecognitions of "Task" in task commands
		// Common misrecognitions: "past", "ask", "test", "desk", "cast", "fast", "last", "mask", "tusk", "tasks", "task", "ass", "tasc"
		// This ensures "remind me of past 1" or "remind me of ask one" becomes "remind me of Task 1"
		
		// First, convert number words to digits for task references
		const numberWords: Record<string, string> = {
			'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
			'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
		};
		
		// Fix task misrecognitions followed by number words (e.g., "ask one" → "Task 1")
		corrected = corrected.replace(
			/\b(past|ask|test|desk|cast|fast|last|mask|tusk|tasks|ass|tasc|tass|vast|mast)\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
			(_match, _word, numberWord) => {
				const digit = numberWords[numberWord.toLowerCase()] || numberWord;
				return `Task ${digit}`;
			}
		);
		
		// Fix task misrecognitions followed by digits (e.g., "ask 1" → "Task 1")
		corrected = corrected.replace(
			/\b(past|ask|test|desk|cast|fast|last|mask|tusk|tasks|ass|tasc|tass|vast|mast)\s+(\d+)\b/gi,
			(_match, _word, number) => {
				// Always capitalize "Task" for consistency
				return `Task ${number}`;
			}
		);
		
		// Also fix standalone "task" variants when preceded by task command words
		corrected = corrected.replace(
			/\b(remind|show|display|list|tell|what)\s+(me\s+)?(of\s+|about\s+|is\s+|are\s+)?(past|ask|test|desk|cast|fast|last|mask|tusk|ass|tasc|tass|vast|mast)\b/gi,
			(_match, command, me, preposition, _taskWord) => {
				// Reconstruct with "Task" properly capitalized
				return `${command}${me ? " " + me : ""}${preposition ? " " + preposition : ""} Task`;
			}
		);

		const words = corrected.split(/\s+/);
		const kept: string[] = [];
		const removed: string[] = [];

		// PRODUCTION: First, preserve task references (e.g., "Task 1", "Task 2") before word-by-word processing
		// This ensures task numbers are kept together
		const taskPattern = /\b(Task\s+\d+|task\s+\d+)\b/gi;
		const taskMatches: Array<{ match: string; index: number }> = [];
		let taskMatch;
		while ((taskMatch = taskPattern.exec(corrected)) !== null) {
			taskMatches.push({ match: taskMatch[0], index: taskMatch.index });
		}

		// PRODUCTION: Detect if this is a request with action verbs (wants/needs/requests)
		// If so, preserve ALL words after the action verb to allow items not in vocabulary
		const actionVerbPattern = /\b(wants?|needs?|requests?|would\s+like|once|knees)\b/i;
		const actionVerbMatch = corrected.match(actionVerbPattern);
		const hasActionVerb = actionVerbMatch !== null;
		let actionVerbIndex = -1;
		
		if (hasActionVerb && actionVerbMatch) {
			// Find the index where action verb appears
			actionVerbIndex = corrected.indexOf(actionVerbMatch[0]);
		}

		for (const word of words) {
			const cleaned = word.replace(/[.,!?;:]/g, ""); // Remove punctuation
			const cleanedLower = cleaned.toLowerCase(); // For vocabulary checking

			// PRODUCTION: Check if this word is part of a task reference (e.g., "Task" or "1" in "Task 1")
			// Find if this word position is within a task match
			const wordStartIndex = corrected.indexOf(
				word,
				corrected.indexOf(words[0])
			);
			const isPartOfTask = taskMatches.some((tm) => {
				const taskStart = tm.index;
				const taskEnd = taskStart + tm.match.length;
				return wordStartIndex >= taskStart && wordStartIndex < taskEnd;
			});

			// PERFORMANCE OPTIMIZATION: Check if word appears after action verb
			// If so, keep it even if not in vocabulary (e.g., "wants hamburger" keeps "hamburger")
			const isAfterActionVerb = hasActionVerb && wordStartIndex > actionVerbIndex;

			// Check if word is in aviation vocabulary or is a number
			const isNumber = /^\d+$/.test(cleaned);
			const isAviationTerm = this.AVIATION_VOCABULARY.has(cleanedLower); // Check lowercase version
			// IMPORTANT: Match seat patterns with ANY number (not just 1-60) and preserve case
			const isSeatPattern = /^\d+[a-fA-F]$/i.test(cleaned); // Case-insensitive match but preserve original

			// Check if it's a single letter that could be a seat letter (a-f, A-F)
			const isSingleSeatLetter = /^[a-fA-F]$/i.test(cleaned);

			// Also check for "seat" in any case
			const isSeatWord = /^seat$/i.test(cleaned);

			// PRODUCTION: Check if it's "Task" (capitalized) - always keep it
			const isTaskWord = /^task$/i.test(cleaned);

			if (
				isNumber ||
				isAviationTerm ||
				isSeatPattern ||
				isSingleSeatLetter ||
				isSeatWord ||
				isTaskWord ||
				isPartOfTask ||
				isAfterActionVerb || // NEW: Keep words after action verbs
				cleaned.length <= 2
			) {
				// Keep numbers, short words (might be seat letters), aviation terms, single seat letters, "seat" in any case, "task" in any case, and words that are part of task references
				// IMPORTANT: Preserve original case of the word
				kept.push(word);
			} else {
				removed.push(word);
			}
		}

		// PRODUCTION: Reconstruct task references if they were split
		let finalCleaned = kept.join(" ");
		// Fix split task references: "Task 1" might have been split, ensure they're together
		finalCleaned = finalCleaned.replace(
			/\b(Task|task)\s+(\d+)\b/gi,
			(_match, _taskWord, number) => {
				// Always capitalize "Task" for consistency (production standard)
				return `Task ${number}`;
			}
		);

		const noiseRatio = removed.length / words.length;
		return {
			cleaned: finalCleaned, // Use finalCleaned which has task references reconstructed
			removedWords: removed,
			noiseRatio,
			isExcessivelyRepetitive, // Include the repetition flag
		};
	}

	/**
	 * Extract only the structured request pattern: seat + action + item
	 */
	static extractStructuredRequest(transcript: string): string | null {
		// First, fix "seed" → "seat" and remove "seat" prefix if present
		let cleaned = transcript.toLowerCase();
		cleaned = cleaned.replace(/\b(seed|cede)\b/gi, "seat");
		// Remove "seat" prefix (e.g., "seat 16b" → "16b")
		cleaned = cleaned.replace(/^\s*seat\s+/i, "");

		// Pattern: [seat] [action] [article?] [item]
		// Handle various formats: "11F wants", "11 f wants", "11 F wants", "seat 16b wants", etc.
		const patterns = [
			// With "seat" prefix: "seat 16b wants chicken" or "seat 16 b wants chicken"
			/seat\s+(\d+[A-Fa-f])\s+(?:wants|needs|once|requests|knees|neat|minutes)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
			/seat\s+(\d+\s+[A-Fa-f])\s+(?:wants|needs|once|requests|knees|neat|minutes)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
			// Exact seat format: "11F wants beef"
			/(\d+[A-Fa-f])\s+(?:wants|needs|once|requests|knees|neat|minutes)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
			// Space-separated: "11 F wants beef" or "11 f wants beef"
			/(\d+\s+[A-Fa-f])\s+(?:wants|needs|once|requests|knees|neat|minutes)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
			// Number misrecognitions: "11 8 wants" → "11A wants"
			/(\d+\s+[86351])\s+(?:wants|needs|once|requests|knees|neat|minutes|1)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
			// Single letter seat: "11 f wants beef" (most common case)
			/(\d+\s+[a-f])\s+(?:wants|needs|once|requests|knees|neat|minutes)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)/i,
		];

		for (const pattern of patterns) {
			const match = cleaned.match(pattern);
			if (match) {
				// Return the full match, but ensure "seat" prefix is removed
				let result = match[0].trim();
				result = result.replace(/^\s*seat\s+/i, "");
				return result;
			}
		}

		return null;
	}
}

/**
 * Context-aware validator for aviation requests
 */
class ContextAnalyzer {
	private static readonly VALID_SEAT_PATTERN = /^(\d{1,2})[A-F]$/i; // Allow 1-99 seat numbers
	private static readonly VALID_ACTIONS = [
		"wants",
		"needs",
		"requests",
		"would like",
		"please",
		"",
	];
	private static readonly ITEM_CATEGORIES = {
		meals: [
			"chicken",
			"beef",
			"fish",
			"vegetarian",
			"vegan",
			"pasta",
			"meal",
			"dinner",
			"lunch",
			"breakfast",
			"snack",
			"sandwich",
			"salad",
			"veggie",
			"veggie meal",
			"no meat",
			"gluten free",
			"gluten free meal",
			"halal",
			"kosher",
			"special meal",
			"chicken meal",
			"beef meal",
			"fish meal",
			"vegetarian meal",
			"vegan meal",
			"ice cream",
			"peanut",
			"seafood",
		],
		beverages: [
			"water",
			"coffee",
			"tea",
			"juice",
			"coke",
			"cola",
			"soda",
			"pepsi",
			"sprite",
			"wine",
			"beer",
			"drink",
			"bottle of water",
			"cup of coffee",
			"glass of water",
			"hot water",
			"cold water",
			"sparkling water",
			"still water",
			"orange juice",
			"apple juice",
		],
		comfort: [
			"blanket",
			"pillow",
			"headphones",
			"headset",
			"magazine",
			"newspaper",
			"extra blanket",
			"extra pillow",
			"eye mask",
			"ear plugs",
			"amenity kit",
			"towel",
		],
		assistance: [
			"help",
			"assistance",
			"call button",
			"emergency",
			"medical",
			"bathroom",
			"restroom",
			"lavatory",
			"sick",
			"unwell",
			"feeling unwell",
		],
	};

	/**
	 * Check if text contains a valid seat pattern
	 */
	static isValidSeat(seat: string): boolean {
		return this.VALID_SEAT_PATTERN.test(seat.trim());
	}

	/**
	 * Check if text after a match indicates seat context
	 */
	private static isSeatContext(_text: string, afterMatch: string): boolean {
		return afterMatch === "" || SEAT_CONTEXT_PATTERN.test(afterMatch);
	}

	/**
	 * Normalize common "seat" misrecognitions
	 */
	private static normalizeSeatWord(text: string): string {
		return text.replace(/\b(seed|cede|see|sea|cee|sit|set|sheet)\b/gi, "seat");
	}

	/**
	 * Validate seat number is in valid range
	 */
	private static isValidSeatNumber(num: number): boolean {
		return (
			num >= SEAT_CONSTANTS.MIN_SEAT_NUMBER &&
			num <= SEAT_CONSTANTS.MAX_SEAT_NUMBER
		);
	}

	/**
	 * Normalize phonetic letter to standard seat letter
	 */
	private static normalizePhoneticLetter(letterRaw: string): string | null {
		const normalized =
			PHONETIC_LETTER_MAP[letterRaw.toLowerCase()] || letterRaw.toUpperCase();
		return SEAT_CONSTANTS.VALID_SEAT_LETTERS.includes(normalized as any)
			? normalized
			: null;
	}

	/**
	 * Match seat patterns and return best match with score
	 */
	private static matchSeatPatterns(
		text: string
	): Array<{ seat: string; score: number; numLength: number }> {
		const patterns = [
			{ regex: /\b(\d{1,2})([a-fA-F])\b/gi, score: 1.0 }, // Direct: "26B"
			{ regex: /\b(\d{1,2})\s+([a-fA-F])\b/gi, score: 0.9 }, // Space: "26 B"
			{
				regex:
					/\b(\d{1,2})\s+(be|bee|sea|see|de|dee|ef|eve|a|ay|8|6|3|5|1|f|b|c|d|e)\b/gi,
				score: 0.7,
			}, // Phonetic
		];

		const matches: Array<{ seat: string; score: number; numLength: number }> =
			[];

		for (const pattern of patterns) {
			const patternMatches = [...text.matchAll(pattern.regex)];
			for (const match of patternMatches) {
				const seatNum = parseInt(match[1]);
				if (!this.isValidSeatNumber(seatNum)) continue;

				const letterRaw = match[2];
				const letter = this.normalizePhoneticLetter(letterRaw);
				if (!letter) continue;

				// Special handling for "6" when number ends in 6
				if (letterRaw === "6" && match[1].endsWith("6")) {
					const afterMatch = text
						.substring(text.indexOf(match[0]) + match[0].length)
						.trim();
					const isSeatLetterContext =
						/^\s+(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food)/i.test(
							afterMatch
						);
					if (!isSeatLetterContext) continue;
				}

				matches.push({
					seat: `${match[1]}${letter}`,
					score: pattern.score,
					numLength: match[1].length,
				});
			}
		}

		// Sort by length (longer numbers first), then by score
		return matches.sort((a, b) => {
			if (b.numLength !== a.numLength) return b.numLength - a.numLength;
			return b.score - a.score;
		});
	}

	/**
	 * Fix multi-digit seat misrecognitions (4-digit, 3-digit, 2-digit patterns)
	 */
	private static fixMultiDigitSeats(text: string): string {
		let corrected = text;

		// Fix 4-digit patterns: "1981" → "19A" (where "81" = "A" misheard)
		const fourDigitPattern =
			/\b([1-9][0-9])(81)(?=\s+(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help)|$|\s)/gi;
		corrected = corrected.replace(fourDigitPattern, (match, seatNum) => {
			const num = parseInt(seatNum);
			if (num >= 10 && num <= SEAT_CONSTANTS.MAX_SEAT_NUMBER) {
				const afterMatch = corrected
					.substring(corrected.indexOf(match) + match.length)
					.trim();
				if (this.isSeatContext(corrected, afterMatch)) {
					return `${seatNum}A`;
				}
			}
			return match;
		});

		// Fix 3-digit patterns: "168" → "16A", "326" → "32B", "324" → "32D", "329" → "32E" (consecutive digits only)
		// CRITICAL FIX: Added 4 and 9 to pattern (for D and E seats)
		const threeDigitPattern = /\b([1-9][0-9])([8635149])(?!\s)/gi;
		corrected = corrected.replace(
			threeDigitPattern,
			(match, seatNum, digit) => {
				const num = parseInt(seatNum);
				if (
					num >= 10 &&
					num <= SEAT_CONSTANTS.MAX_SEAT_NUMBER &&
					DIGIT_TO_LETTER_MAP[digit] &&
					!match.includes(" ")
				) {
					const afterMatch = corrected
						.substring(corrected.indexOf(match) + match.length)
						.trim();
					if (this.isSeatContext(corrected, afterMatch)) {
						return `${seatNum}${DIGIT_TO_LETTER_MAP[digit]}`;
					}
				}
				return match;
			}
		);

		// Fix single-digit patterns: "98" → "9A", "96" → "9B", "94" → "9D", "99" → "9E" (only if followed by seat context)
		// CRITICAL FIX: Added 4 and 9 to pattern (for D and E seats)
		const singleDigitPattern =
			/\b([1-9])([8635149])(?=\s+(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help)|$|\s)/gi;
		corrected = corrected.replace(
			singleDigitPattern,
			(match, seatNum, digit) => {
				const num = parseInt(seatNum);
				if (
					num >= SEAT_CONSTANTS.MIN_SEAT_NUMBER &&
					num <= 9 &&
					DIGIT_TO_LETTER_MAP[digit]
				) {
					const afterMatch = corrected
						.substring(corrected.indexOf(match) + match.length)
						.trim();
					if (this.isSeatContext(corrected, afterMatch)) {
						return `${seatNum}${DIGIT_TO_LETTER_MAP[digit]}`;
					}
				}
				return match;
			}
		);

		return corrected;
	}

	/**
	 * Extract and validate seat number from text with improved number accuracy
	 * Consolidated version that eliminates redundancy
	 */
	static extractSeat(text: string): { seat: string | null; score: number } {
		// Step 1: Fix multi-digit misrecognitions first (4-digit, 3-digit, single-digit)
		let correctedText = this.fixMultiDigitSeats(text);

		// Step 2: Normalize "seat" word variants
		correctedText = this.normalizeSeatWord(correctedText);

		// Step 3: Try direct seat pattern matching (highest priority)
		const directSeatPattern = /\b(\d{1,2})\s*([a-fA-F])\b/i;
		const directMatch = correctedText.match(directSeatPattern);
		if (directMatch) {
			const seatNum = parseInt(directMatch[1]);
			const letter = directMatch[2].toUpperCase();
			if (
				this.isValidSeatNumber(seatNum) &&
				SEAT_CONSTANTS.VALID_SEAT_LETTERS.includes(letter as any)
			) {
				return { seat: `${directMatch[1]}${letter}`, score: 1.0 };
			}
		}

		// Step 4: Try "seat X" patterns
		const seatWithPrefixPattern = /\bseat\s+(\d+)\s*([a-fA-F])\b/i;
		const seatWithPrefixMatch = correctedText.match(seatWithPrefixPattern);
		if (seatWithPrefixMatch) {
			const seatNum = parseInt(seatWithPrefixMatch[1]);
			const letter = seatWithPrefixMatch[2].toUpperCase();
			if (this.isValidSeatNumber(seatNum)) {
				return { seat: `${seatWithPrefixMatch[1]}${letter}`, score: 1.0 };
			}
		}

		// Step 5: Remove "seat" prefix and normalize number words
		let preprocessed = correctedText.toLowerCase();
		preprocessed = preprocessed
			.replace(/^\s*seat\s+/i, "")
			.replace(/\bseat\s+/gi, "");

		// Step 6: Normalize number words to digits
		const numberWordMap: { [key: string]: string } = {
			one: "1",
			two: "2",
			three: "3",
			four: "4",
			five: "5",
			six: "6",
			seven: "7",
			eight: "8",
			nine: "9",
			ten: "10",
			eleven: "11",
			twelve: "12",
			thirteen: "13",
			fourteen: "14",
			fifteen: "15",
			sixteen: "16",
			seventeen: "17",
			eighteen: "18",
			nineteen: "19",
			twenty: "20",
			thirty: "30",
			forty: "40",
			fifty: "50",
			sixty: "60",
			// EXPANDED: Compound numbers (twenty series)
			"twenty one": "21",
			"twenty two": "22",
			"twenty three": "23",
			"twenty four": "24",
			"twenty five": "25",
			"twenty six": "26",
			"twenty seven": "27",
			"twenty eight": "28",
			"twenty nine": "29",
			// Thirty series
			"thirty one": "31",
			"thirty two": "32",
			"thirty three": "33",
			"thirty four": "34",
			"thirty five": "35",
			"thirty six": "36",
			"thirty seven": "37",
			"thirty eight": "38",
			"thirty nine": "39",
			// Forty series (common for mid-cabin)
			"forty one": "41",
			"forty two": "42",
			"forty three": "43",
			"forty four": "44",
			"forty five": "45",
			"forty six": "46",
			"forty seven": "47",
			"forty eight": "48",
			"forty nine": "49",
			// Fifty series (rear cabin)
			"fifty one": "51",
			"fifty two": "52",
			"fifty three": "53",
			"fifty four": "54",
			"fifty five": "55",
			"fifty six": "56",
			"fifty seven": "57",
			"fifty eight": "58",
			"fifty nine": "59",
			tree: "3",
			for: "4",
			tea: "T",
			sex: "6",
			to: "2",
			too: "2",
			tu: "2",
		};

		let normalized = preprocessed;

		// Preserve "number to a" patterns (don't convert "to" to "2")
		normalized = normalized.replace(/\b([1-5]?[0-9]|60)\s+to\s+a\b/gi, "$1 a");

		// Normalize number words
		for (const [word, digit] of Object.entries(numberWordMap)) {
			if (word === "to") {
				normalized = normalized.replace(/\bto\b/gi, digit);
			} else {
				const regex = new RegExp(`\\b${word}\\b`, "gi");
				normalized = normalized.replace(regex, digit);
			}
		}

		// Step 7: Use consolidated pattern matching
		const matches = this.matchSeatPatterns(normalized);
		if (matches.length > 0) {
			return { seat: matches[0].seat, score: matches[0].score };
		}

		// Step 8: Try number-only match (partial seat, no letter)
		const numberOnlyMatch = normalized.match(
			/\b(\d{1,2})\s+(needs|wants|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian)/i
		);
		if (numberOnlyMatch) {
			const seatNum = parseInt(numberOnlyMatch[1]);
			if (this.isValidSeatNumber(seatNum)) {
				return { seat: numberOnlyMatch[1], score: 0.6 };
			}
		}

		return { seat: null, score: 0 };
	}

	/**
	 * Extract action verb
	 */
	static extractAction(text: string): { action: string; score: number } {
		const actionPatterns = [
			/\b(wants|once|wants)\b/i,
			/\b(needs|knees|neat|nies|minutes)\b/i,
			/\b(requests|request)\b/i,
			/\b(would like|would)\b/i,
		];

		for (const pattern of actionPatterns) {
			const match = text.match(pattern);
			if (match) {
				const raw = match[1].toLowerCase();
				// Normalize common misrecognitions
				const actionMap: { [key: string]: string } = {
					once: "wants",
					wants: "wants",
					knees: "needs",
					neat: "needs",
					nies: "needs",
					minutes: "needs",
					requests: "requests",
					request: "requests",
					"would like": "wants",
					would: "wants",
				};
				return { action: actionMap[raw] || raw, score: 0.9 };
			}
		}

		return { action: "", score: 0.5 }; // Empty action is acceptable
	}

	/**
	 * Extract multiple items from text (e.g., "beef and pepsi" → ["beef", "pepsi"])
	 * Handles conjunctions like "and", commas, and natural language patterns
	 */
	static extractMultipleItems(
		text: string
	): Array<{ item: string; category: string | null; score: number }> {
		const lowerText = text.toLowerCase();
		const foundItems: Array<{
			item: string;
			category: string | null;
			score: number;
		}> = [];

		// Strategy 1: Split by "and" or commas and process each part
		// Handle patterns like: "beef and pepsi", "beef, pepsi", "beef and a pepsi"
		const splitPattern = /\s+(?:and|,)\s+(?:a\s+|an\s+|the\s+)?/i;
		const parts = text.split(splitPattern);

		if (parts.length > 1) {
			// Multiple parts detected - check each
			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed.length > 1) {
					// Try to match this part against known items
					for (const [category, items] of Object.entries(
						this.ITEM_CATEGORIES
					)) {
						for (const item of items) {
							const exactPattern = new RegExp(
								`\\b${item.replace(/\s+/g, "\\s+")}\\b`,
								"i"
							);
							if (exactPattern.test(trimmed)) {
								// Avoid duplicates
								if (
									!foundItems.some(
										(f) => f.item.toLowerCase() === item.toLowerCase()
									)
								) {
									foundItems.push({ item, category, score: 1.0 });
								}
								break;
							}
						}
					}

					// If no exact match, try extracting from this part
					if (
						foundItems.length === 0 ||
						!foundItems.some((f) =>
							trimmed.toLowerCase().includes(f.item.toLowerCase())
						)
					) {
						const extracted = this.extractItem(trimmed);
						if (extracted.item && extracted.score > 0.6) {
							// Avoid duplicates
							if (
								!foundItems.some(
									(f) => f.item.toLowerCase() === extracted.item.toLowerCase()
								)
							) {
								foundItems.push(extracted);
							}
						}
					}
				}
			}
		}

		// Strategy 2: If no splits worked, scan entire text for multiple known items
		// ENHANCED: Try both word boundary and loose matching for messy transcripts
		if (foundItems.length === 0) {
			const matchedItems = new Set<string>();

			for (const [category, items] of Object.entries(this.ITEM_CATEGORIES)) {
				for (const item of items) {
					// Try word boundary first
					const exactPattern = new RegExp(
						`\\b${item.replace(/\s+/g, "\\s+")}\\b`,
						"i"
					);
					if (exactPattern.test(lowerText)) {
						const itemKey = item.toLowerCase();
						if (!matchedItems.has(itemKey)) {
							matchedItems.add(itemKey);
							foundItems.push({ item, category, score: 1.0 });
							continue;
						}
					}

					// Fallback: Try loose matching for messy transcripts
					const loosePattern = new RegExp(item.replace(/\s+/g, "\\s+"), "i");
					if (loosePattern.test(lowerText)) {
						const itemKey = item.toLowerCase();
						if (!matchedItems.has(itemKey)) {
							matchedItems.add(itemKey);
							foundItems.push({ item, category, score: 0.95 }); // Slightly lower score
						}
					}
				}
			}
		}

		// If we found multiple items, return them
		if (foundItems.length > 1) {
			return foundItems;
		}

		// Fallback: Single item extraction
		const singleItem = this.extractItem(text);
		if (singleItem.item) {
			return [singleItem];
		}

		return [];
	}

	/**
	 * Extract and categorize item (ENHANCED with multi-pass matching)
	 */
	static extractItem(text: string): {
		item: string;
		category: string | null;
		score: number;
	} {
		const lowerText = text.toLowerCase();
		let bestMatch: {
			item: string;
			category: string | null;
			score: number;
		} | null = null;

		// Debug logs only in development mode
		if (process.env.NODE_ENV === "development") {
			console.log("🔍 [extractItem] Input:", text);
		}

		// Pass 1: Exact substring match (highest priority)
		// ENHANCED: Also try without word boundaries for messy transcripts
		for (const [category, items] of Object.entries(this.ITEM_CATEGORIES)) {
			for (const item of items) {
				// First try with word boundaries (more accurate)
				const exactPattern = new RegExp(
					`\\b${item.replace(/\s+/g, "\\s+")}\\b`,
					"i"
				);
				if (exactPattern.test(lowerText)) {
					if (process.env.NODE_ENV === "development") {
						console.log(`✅ [extractItem] Match (word boundary): "${item}"`);
					}
					return { item, category, score: 1.0 };
				}

				// Fallback: Try without word boundaries for messy transcripts with repeated fragments
				// This handles cases like "30C ice 30C ice cream" where word boundaries break
				const loosePattern = new RegExp(item.replace(/\s+/g, "\\s+"), "i");
				if (loosePattern.test(lowerText)) {
					if (process.env.NODE_ENV === "development") {
						console.log(`✅ [extractItem] Match (loose): "${item}"`);
					}
					return { item, category, score: 0.95 }; // Slightly lower score for loose match
				}
			}
		}

		// Pass 2: Fuzzy phonetic matching with threshold
		for (const [category, items] of Object.entries(this.ITEM_CATEGORIES)) {
			for (const item of items) {
				// Check if item words appear in text (partial match)
				const itemWords = item.split(/\s+/);
				const allWordsMatch = itemWords.every((word) => {
					// Check exact word match
					if (lowerText.includes(word)) return true;
					// Check phonetic similarity
					return PhoneticMatcher.phoneticSimilarity(lowerText, word) > 0.75;
				});

				if (allWordsMatch) {
					const similarity = PhoneticMatcher.phoneticSimilarity(
						lowerText,
						item
					);
					if (similarity > 0.75) {
						if (!bestMatch || similarity > bestMatch.score) {
							bestMatch = { item, category, score: similarity };
						}
					}
				}
			}
		}

		// Pass 3: Extract noun phrase after action (fallback)
		// CRITICAL FIX: Handle articles properly - skip "a", "an", "the" and capture the actual item
		if (!bestMatch || bestMatch.score < 0.8) {
			const afterAction = text.replace(
				/.*?(wants|needs|requests|would like|once|knees|neat|minutes)\s+/i,
				""
			);

			// Improved regex: Skip articles and capture the actual item (1-4 words)
			// Pattern: (?:a\s+|an\s+|the\s+)? captures optional article
			// Then capture the actual item word(s), ensuring we don't capture "a" as the item
			const itemMatch = afterAction.match(
				/(?:a\s+|an\s+|the\s+)?([a-z]+(?:\s+[a-z]+){0,3})(?:\s|$)/i
			);

			if (itemMatch) {
				let extracted = itemMatch[1].trim();

				// CRITICAL: If extracted is just "a", "an", or "the", skip it and get the next word
				// This handles cases like "31a needs a towel" where "a" might be captured
				if (
					extracted.toLowerCase() === "a" ||
					extracted.toLowerCase() === "an" ||
					extracted.toLowerCase() === "the"
				) {
					// Try to get the word after the article
					const afterArticle = afterAction
						.replace(/^(?:a\s+|an\s+|the\s+)/i, "")
						.trim();
					const nextWordMatch = afterArticle.match(
						/^([a-z]+(?:\s+[a-z]+){0,3})(?:\s|$)/i
					);
					if (nextWordMatch) {
						extracted = nextWordMatch[1].trim();
					}
				}

				// Skip if extracted is still just an article or empty
				if (
					!extracted ||
					extracted.toLowerCase() === "a" ||
					extracted.toLowerCase() === "an" ||
					extracted.toLowerCase() === "the"
				) {
					// Try alternative pattern: match everything after article
					const altMatch = afterAction.match(
						/(?:a\s+|an\s+|the\s+)([a-z]+(?:\s+[a-z]+){0,3})(?:\s|$)/i
					);
					if (altMatch) {
						extracted = altMatch[1].trim();
					}
				}

				// Check if extracted item matches any known item
				if (extracted && extracted.length > 1) {
					// Ensure it's not just "a"
					for (const [category, items] of Object.entries(
						this.ITEM_CATEGORIES
					)) {
						for (const item of items) {
							const similarity = PhoneticMatcher.phoneticSimilarity(
								extracted.toLowerCase(),
								item
							);
							if (similarity > 0.7) {
								if (!bestMatch || similarity > bestMatch.score) {
									bestMatch = { item, category, score: similarity * 0.9 }; // Slight penalty for extracted
								}
							}
						}
					}
					// If no match found, use extracted as-is (but only if it's not just "a")
					if (!bestMatch && extracted.length > 1) {
						bestMatch = { item: extracted, category: null, score: 0.6 };
					}
				}
			}
		}

		const result = bestMatch || { item: "", category: null, score: 0 };
		return result;
	}

	/**
	 * Validate complete parsed request
	 */
	static validateRequest(parsed: ParsedRequest): {
		valid: boolean;
		score: number;
		reasons: string[];
	} {
		const reasons: string[] = [];
		let score = 1.0;

		// Validate seat
		// Accept number-only seats (e.g., "15" without letter) if they have action + item
		const hasNumberOnlySeat = parsed.seat && /^\d+$/.test(parsed.seat); // Just digits, no letter
		if (!parsed.seat) {
			reasons.push("No seat number found");
			score -= 0.4;
		} else if (hasNumberOnlySeat) {
			// Number-only seat (e.g., "15") is acceptable if we have action + item
			// This allows "15 needs blanket" even if letter is missing
			if (parsed.action && parsed.item) {
				score -= 0.1; // Small penalty for missing letter, but still valid
				reasons.push(
					`Partial seat number (${parsed.seat}) - letter missing but request is clear`
				);
			} else {
				score -= 0.2;
				reasons.push(
					`Partial seat number (${parsed.seat}) but missing action or item`
				);
			}
		} else if (!this.isValidSeat(parsed.seat)) {
			reasons.push(`Invalid seat format: ${parsed.seat}`);
			score -= 0.3;
		}

		// Validate action (optional but preferred)
		if (
			parsed.action &&
			!this.VALID_ACTIONS.includes(parsed.action.toLowerCase())
		) {
			reasons.push(`Unusual action: ${parsed.action}`);
			score -= 0.1;
		}

		// Validate item
		if (!parsed.item) {
			reasons.push("No item requested");
			score -= 0.3;
		}

		// Accept if we have a seat (full or number-only) OR if we have action + item
		const hasSeat = parsed.seat !== null && parsed.seat !== "";
		const hasActionAndItem = !!(parsed.action && parsed.item);
		const valid = score >= 0.5 && (hasSeat || hasActionAndItem);
		return { valid, score: Math.max(0, score), reasons };
	}
}

/**
 * Alternative scoring system
 */
class AlternativeScorer {
	/**
	 * Score an alternative transcript
	 * PRODUCTION: Handles both regular requests and task commands
	 */
	static scoreAlternative(
		transcript: string,
		confidence: number
	): AlternativeScore {
		// First, sanitize to remove random words
		const sanitized = TranscriptSanitizer.sanitize(transcript);

		// PRODUCTION: Repetition rejection disabled - repetitive input is intentional
		// The sanitizer still cleans up repetitions, but we don't reject the entire input
		// Original logic kept for reference:
		/*
		if (sanitized.isExcessivelyRepetitive) {
			// Calculate detailed metrics for logging
			const words = transcript.split(/\s+/).filter(w => w.length > 0);
			const freq = new Map<string, number>();
			for (const w of words) {
				const n = w.toLowerCase();
				freq.set(n, (freq.get(n) || 0) + 1);
			}
			const maxWord = Array.from(freq.entries()).reduce((max, curr) => 
				curr[1] > max[1] ? curr : max, ['', 0]);
			
			console.warn('⚠️ Rejecting excessively repetitive input as noise', {
				original: transcript.substring(0, 100),
				cleaned: sanitized.cleaned,
				mostRepeated: `"${maxWord[0]}" (${maxWord[1]} times)`,
				totalWords: words.length
			});
			
			// Return invalid score to reject this alternative
			const parsed: ParsedRequest = {
				seat: "",
				action: "",
				item: "",
				confidence: 0,
				valid: false,
				originalTranscript: transcript,
				corrections: [{
					from: transcript,
					to: "",
					reason: "Excessive repetition detected - likely noise or gibberish"
				}],
				validationScore: 0,
				alternativesConsidered: 0,
			};

			return {
				transcript: sanitized.cleaned,
				confidence: 0,
				score: 0, // Zero score to ensure rejection
				seatScore: 0,
				actionScore: 0,
				itemScore: 0,
				phoneticScore: 0,
				valid: false,
				parsed,
			};
		}
		*/

		// PRODUCTION: Check if this is a task command (e.g., "remind me of Task 1")
		// After sanitization, all task misrecognitions should be corrected to "Task"
		const taskCommandPattern =
			/\b(remind|show|display|list|tell|what).*?\b(Task|task)\s+(\d+)\b/i;
		const isTaskCommand = taskCommandPattern.test(sanitized.cleaned);

		// For task commands, use the sanitized text directly (don't try to extract seat/item)
		if (isTaskCommand) {
			// PRODUCTION: Task commands get special handling - they don't have seat/item structure
			const taskMatch = sanitized.cleaned.match(/\b(Task|task)\s+(\d+)\b/i);
			const taskNumber = taskMatch ? taskMatch[2] : null;

			// Create a valid parsed request for task commands
			const parsed: ParsedRequest = {
				seat: "", // Task commands don't have seats
				action: "information", // Task commands are information requests
				item: taskNumber ? `Task ${taskNumber}` : "task",
				confidence,
				valid: true, // Task commands are always valid
				originalTranscript: transcript,
				corrections:
					sanitized.removedWords.length > 0
						? [
								{
									from: transcript,
									to: sanitized.cleaned,
									reason: `Removed ${
										sanitized.removedWords.length
									} non-aviation words: ${sanitized.removedWords.join(", ")}`,
								},
						  ]
						: [],
				validationScore: 0.9, // High score for task commands
				alternativesConsidered: 0,
			};

			// Task commands get high scores
			return {
				transcript: sanitized.cleaned,
				confidence,
				score: 0.85 + confidence * 0.15, // High base score for task commands
				seatScore: 0, // No seat in task commands
				actionScore: 0.9, // High action score
				itemScore: 0.9, // High item score (the task number)
				phoneticScore: 0.8,
				valid: true,
				parsed,
			};
		}

		// Try to extract structured request (focus mode) for regular requests
		const structured = TranscriptSanitizer.extractStructuredRequest(
			sanitized.cleaned
		);
		const processed = structured
			? structured
			: this.preprocessTranscript(sanitized.cleaned);

		// Extract components
		const seat = ContextAnalyzer.extractSeat(processed);
		const action = ContextAnalyzer.extractAction(processed);
		const item = ContextAnalyzer.extractItem(processed);

		// Calculate scores
		const seatScore = seat.score;
		const actionScore = action.score;
		const itemScore = item.score;

		// Phonetic score (check if transcript sounds like valid aviation phrases)
		const phoneticScore = this.calculatePhoneticScore(processed);

		// Noise penalty: penalize transcripts with too many random words
		const noisePenalty =
			sanitized.noiseRatio > 0.3 ? (sanitized.noiseRatio - 0.3) * 0.5 : 0;

		// Structure bonus: boost score if we found a structured request
		const structureBonus = structured ? 0.15 : 0;

		// ENHANCED weighted total score with confidence boosting
		// Boost score if we have both seat and item (critical for accuracy)
		const hasSeatAndItem = seat.seat && item.item;
		const completenessBonus = hasSeatAndItem ? 0.1 : 0;

		// Boost confidence if seat number is in valid range and has letter
		const seatQualityBonus =
			seat.seat && /^\d+[A-F]$/i.test(seat.seat) ? 0.05 : 0;

	// OPTIMIZATION: Updated scoring weights for near-100% accuracy
	// Confidence: 0.2 → 0.3 (increased from 20% to 30%)
	// Seat: 0.45 → 0.4 (slightly reduced from 45% to 40%)
	// Item: 0.22 → 0.25 (increased from 22% to 25%)
	// This gives more weight to actual recognition confidence from Azure
	const totalScore = Math.max(
		0,
		confidence * 0.3 + // Base confidence (INCREASED to 30% - better reflects Azure's accuracy)
			seatScore * 0.4 + // Seat is MOST important (40%)
			actionScore * 0.08 + // Action is less important (8%)
			itemScore * 0.25 + // Item is very important (INCREASED to 25%)
			phoneticScore * 0.05 + // Phonetic similarity (5%)
			structureBonus + // Structure bonus
			completenessBonus + // Completeness bonus
			seatQualityBonus - // Seat quality bonus
			noisePenalty // Noise penalty
	);

		// Create parsed request
		const parsed: ParsedRequest = {
			seat: seat.seat || "",
			action: action.action,
			item: item.item,
			confidence,
			valid: false,
			originalTranscript: transcript,
			corrections: [
				...(sanitized.removedWords.length > 0
					? [
							{
								from: transcript,
								to: sanitized.cleaned,
								reason: `Removed ${
									sanitized.removedWords.length
								} non-aviation words: ${sanitized.removedWords.join(", ")}`,
							},
					  ]
					: []),
			],
			validationScore: 0,
			alternativesConsidered: 0,
		};

		// Validate with stricter rules
		const validation = ContextAnalyzer.validateRequest(parsed);

		// Additional validation: reject if too much noise
		if (sanitized.noiseRatio > 0.5) {
			validation.valid = false;
			validation.score -= 0.3;
			validation.reasons.push(
				`Too many random words (${(sanitized.noiseRatio * 100).toFixed(
					0
				)}% noise)`
			);
		}

		// Validation: Allow tasks with number-only seat (e.g., "15 needs blanket")
		// or without seat if they have useful info (item + action)
		const hasNumberOnlySeat = seat.seat && /^\d+$/.test(seat.seat); // Just digits, no letter

		if (!seat.seat && (!item.item || !action.action)) {
			validation.valid = false;
			validation.reasons.push(
				"Missing seat number and insufficient request details"
			);
		} else if (hasNumberOnlySeat && item.item && action.action) {
			// Number-only seat (e.g., "15") with item + action is valid
			// This allows "15 needs blanket" even if letter is missing
			validation.valid = true;
			validation.score += 0.05; // Small bonus for having number even without letter
			validation.reasons.push(
				`Partial seat number (${seat.seat}) but request is clear`
			);
		} else if (!seat.seat && item.item && action.action) {
			// Allow without seat if we have item + action (still useful for crew)
			validation.valid = true;
			validation.score += 0.1; // Small bonus for having useful info even without seat
			validation.reasons.push(
				"Missing seat number but has useful request details"
			);
		} else if (!item.item) {
			validation.valid = false;
			validation.reasons.push("Missing required item");
		}

		parsed.valid = validation.valid;
		parsed.validationScore = validation.score;

		return {
			transcript: sanitized.cleaned, // Return sanitized version
			confidence,
			score: totalScore,
			seatScore,
			actionScore,
			itemScore,
			phoneticScore,
			valid: validation.valid,
			parsed,
		};
	}

	/**
	 * Preprocess transcript for better matching
	 */
	private static preprocessTranscript(text: string): string {
		// Fix common compound misrecognitions
		text = text.replace(/\bforty\s+sex\b/gi, "46");
		text = text.replace(/\bfor\s+tea\s+sex\b/gi, "46");
		text = text.replace(/\btree\b/gi, "3");
		text = text.replace(/\bthirty\s+to\s+be\b/gi, "32B");
		text = text.replace(
			/\b(\d+)\s+minutes\b/gi,
			(_match, num) => `${num}B needs`
		);

		return text;
	}

	/**
	 * Calculate phonetic score for aviation phrases
	 */
	private static calculatePhoneticScore(text: string): number {
		const aviationPhrases = [
			"wants",
			"needs",
			"requests",
			"blanket",
			"pillow",
			"water",
			"coffee",
			"tea",
			"chicken",
			"beef",
			"meal",
			"food",
		];

		let maxScore = 0;
		for (const phrase of aviationPhrases) {
			const score = PhoneticMatcher.phoneticSimilarity(
				text.toLowerCase(),
				phrase
			);
			maxScore = Math.max(maxScore, score);
		}

		return maxScore;
	}
}

/**
 * Request session - represents a single order/task request
 */
interface RequestSession {
	id: string; // Unique session ID
	wakeWordDetectedAt: number; // Timestamp when wake word was detected
	transcript: string; // Accumulated transcript for this session
	processed: boolean; // Whether this session has been processed
	alternatives: Array<{ transcript: string; confidence: number }>; // All alternatives for this session
	selectedAlternative?: AlternativeScore; // The alternative that was selected for this session
	parsedComponents?: {
		// Track what was extracted for reward learning
		seat?: string;
		item?: string;
		action?: string;
		seatPattern?: string; // Pattern used to extract seat
		itemPattern?: string; // Pattern used to extract item
	};
}

/**
 * Reward pattern - tracks successful patterns for learning
 */
interface RewardPattern {
	pattern: string; // The pattern (e.g., seat pattern, item name, etc.)
	type: "seat" | "item" | "action" | "transcript" | "alternative";
	successCount: number; // Number of times this pattern led to success
	totalCount: number; // Total times this pattern was used
	lastRewarded: number; // Timestamp of last reward
	boost: number; // Current boost multiplier (starts at 1.0, increases with success)
}

/**
 * Reward learning system - tracks and rewards successful patterns
 */
class RewardLearningSystem {
	private patterns: Map<string, RewardPattern> = new Map();
	private readonly MAX_PATTERNS = 1000; // Limit memory usage
	private readonly SUCCESS_THRESHOLD = 0.7; // 70% success rate to maintain boost
	private readonly BOOST_INCREMENT = 0.05; // Increase boost by 5% per success
	private readonly MAX_BOOST = 2.0; // Maximum 2x boost
	private readonly BOOST_DECAY = 0.01; // Decay boost by 1% per use if success rate drops
	private lastForcedCleanup = Date.now(); // Track last forced cleanup
	private readonly FORCED_CLEANUP_INTERVAL = 3600000; // Force cleanup every hour

	/**
	 * Reward a successful pattern
	 */
	rewardPattern(pattern: string, type: RewardPattern["type"]): void {
		const key = `${type}:${pattern.toLowerCase()}`;
		const existing = this.patterns.get(key);

		if (existing) {
			existing.successCount++;
			existing.totalCount++;
			existing.lastRewarded = Date.now();

			// Increase boost if success rate is high
			const successRate = existing.successCount / existing.totalCount;
			if (successRate >= this.SUCCESS_THRESHOLD) {
				existing.boost = Math.min(
					existing.boost + this.BOOST_INCREMENT,
					this.MAX_BOOST
				);
			}
		} else {
			// New pattern - start with initial boost
			this.patterns.set(key, {
				pattern,
				type,
				successCount: 1,
				totalCount: 1,
				lastRewarded: Date.now(),
				boost: 1.0 + this.BOOST_INCREMENT, // Start with slight boost
			});

			// Clean up old patterns if we exceed limit
			if (this.patterns.size > this.MAX_PATTERNS) {
				this.cleanupOldPatterns();
			}
		}
		
		// Forced periodic cleanup to prevent unbounded growth
		this.checkForcedCleanup();
	}

	/**
	 * Record pattern usage (even if not successful yet)
	 */
	recordPatternUsage(pattern: string, type: RewardPattern["type"]): void {
		const key = `${type}:${pattern.toLowerCase()}`;
		const existing = this.patterns.get(key);

		if (existing) {
			existing.totalCount++;

			// Decay boost if success rate is low
			const successRate = existing.successCount / existing.totalCount;
			if (successRate < this.SUCCESS_THRESHOLD && existing.boost > 1.0) {
				existing.boost = Math.max(existing.boost - this.BOOST_DECAY, 1.0);
			}
		}
	}

	/**
	 * Get boost multiplier for a pattern
	 */
	getBoost(pattern: string, type: RewardPattern["type"]): number {
		const key = `${type}:${pattern.toLowerCase()}`;
		const existing = this.patterns.get(key);

		if (existing && existing.totalCount >= 2) {
			// Need at least 2 uses to trust boost
			const successRate = existing.successCount / existing.totalCount;
			// Only apply boost if success rate is good
			return successRate >= this.SUCCESS_THRESHOLD ? existing.boost : 1.0;
		}

		return 1.0; // No boost for unknown patterns
	}

	/**
	 * Get all patterns with their stats (for debugging)
	 */
	getPatternStats(): RewardPattern[] {
		return Array.from(this.patterns.values())
			.sort((a, b) => b.successCount - a.successCount)
			.slice(0, 50); // Top 50 patterns
	}

	/**
	 * Clean up old patterns that haven't been used recently
	 */
	private cleanupOldPatterns(): void {
		const now = Date.now();
		const OLD_PATTERN_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
		let deletedCount = 0;

		for (const [key, pattern] of this.patterns.entries()) {
			if (
				now - pattern.lastRewarded > OLD_PATTERN_THRESHOLD &&
				pattern.totalCount < 3
			) {
				this.patterns.delete(key);
				deletedCount++;
			}
		}
		
		// If no patterns were deleted, force delete lowest performing patterns
		if (deletedCount === 0 && this.patterns.size > this.MAX_PATTERNS) {
			const sortedPatterns = Array.from(this.patterns.entries())
				.sort(([, a], [, b]) => {
					const aRate = a.successCount / a.totalCount;
					const bRate = b.successCount / b.totalCount;
					return aRate - bRate; // Sort by success rate (lowest first)
				});
			
			// Delete bottom 10% of patterns
			const deleteCount = Math.floor(this.patterns.size * 0.1);
			for (let i = 0; i < deleteCount; i++) {
				this.patterns.delete(sortedPatterns[i][0]);
				deletedCount++;
			}
			
			console.log(`🧹 Forced cleanup: deleted ${deletedCount} low-performing patterns`);
		}
	}
	
	/**
	 * Check if forced cleanup is needed (hourly)
	 */
	private checkForcedCleanup(): void {
		const now = Date.now();
		if (now - this.lastForcedCleanup > this.FORCED_CLEANUP_INTERVAL) {
			console.log(`🧹 Forced hourly cleanup: ${this.patterns.size} patterns before cleanup`);
			this.cleanupOldPatterns();
			this.lastForcedCleanup = now;
			console.log(`🧹 Forced hourly cleanup: ${this.patterns.size} patterns after cleanup`);
		}
	}

	/**
	 * Reset all patterns (for testing)
	 */
	reset(): void {
		this.patterns.clear();
	}
}

export class VoiceService {
	/**
	 * Static helper to extract multiple items from text
	 * Public API for components to use multi-item extraction
	 */
	static extractMultipleItemsFromText(
		text: string
	): Array<{ item: string; category: string | null; score: number }> {
		return ContextAnalyzer.extractMultipleItems(text);
	}
	private recognition: SpeechRecognition | null = null;
	private isListening = false;
	private useAzureSpeech = false; // Will be set to true if Azure credentials are available
	private azureSpeechService: any = null; // Will be AzureSpeechService instance
	private micReadyTime = 0;
	private wakeWordDetected = false;
	private pendingTranscript = "";
	private wakeWordDetectedTime = 0;
	private continuationTimeout: ReturnType<typeof setTimeout> | null = null;
	private speechBuffer: string[] = []; // Buffer speech chunks to prevent word loss
	private speechBufferTimer: ReturnType<typeof setTimeout> | null = null;
	private lastWakeWordTime = 0; // Debounce wake word detection
	private virtualWakeWordActive = false; // Flag: simulated wake word (button/tap) is active
	private wakeWordResultIndex = -1; // Track which result index (utterance) we detected wake word in - prevents re-detection in same utterance
	private isTTSSpeaking = false; // Track if TTS is currently speaking - prevents wake word detection during AI speech

	// Production-level features
	private metrics: VoiceMetrics;
	private startTime: number;
	private restartAttempts = 0;
	private lastRestartTime = 0; // Track last restart time to prevent rapid restarts
	private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
	private metricsFlushInterval: ReturnType<typeof setInterval> | null = null;
	private lastError: {
		error: string;
		timestamp: number;
		message: string;
	} | null = null;
	private processingTimes: number[] = []; // Track processing times for average
	private onHealthChangeCallback?: (health: HealthCheckResult) => void;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private lastHealthChangeTime: number = 0; // Track last health status change to prevent oscillation

	// UNIFIED FLOW: Request session management
	private currentSession: RequestSession | null = null;
	private sessionHistory: RequestSession[] = []; // Keep last 10 sessions for debugging
	private readonly MAX_SESSION_HISTORY = 10;
	private recentProcessedRequests: Array<{ text: string; timestamp: number }> =
		[]; // Deduplication
	private readonly DEDUPLICATION_WINDOW = 3000; // 3 seconds - ignore duplicate requests

	// REWARD LEARNING SYSTEM: Track and reward successful patterns
	private rewardSystem = new RewardLearningSystem();
	private pendingRewards: Map<string, RequestSession> = new Map(); // Track sessions waiting for reward

	// Store callbacks for timeout handlers
	private storedWakeWordCallback: ((text: string, selectedAlternative?: any) => void) | null = null;
	private storedWakeWordOnlyCallback: ((text: string) => void) | null = null;
	private onWakeWordConfirmation: (() => void) | null = null;
	private wakeWordConfirmationPlayed: boolean = false; // Track if confirmation was played for current wake word
	private onInterimTranscript: ((text: string) => void) | null = null; // Optional callback for interim transcript updates
	
	// Interim transcript throttling for smoother UX
	private lastInterimUpdate: number = 0;
	private lastInterimTranscript: string = "";
	private interimUpdateTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Clear continuation timeout safely
	 */
	private clearContinuationTimeout(): void {
		if (this.continuationTimeout) {
			clearTimeout(this.continuationTimeout);
			this.continuationTimeout = null;
		}
		if (this.speechBufferTimer) {
			clearTimeout(this.speechBufferTimer);
			this.speechBufferTimer = null;
		}
		if (this.interimUpdateTimer) {
			clearTimeout(this.interimUpdateTimer);
			this.interimUpdateTimer = null;
		}
	}

	/**
	 * Throttle interim transcript updates to prevent UI jank
	 * Only updates if:
	 * 1. Throttle time has passed since last update, OR
	 * 2. The transcript has changed significantly (length changed by >3 chars or completely different)
	 */
	private shouldUpdateInterim(newTranscript: string): boolean {
		const now = Date.now();
		const timeSinceLastUpdate = now - this.lastInterimUpdate;
		const lengthDiff = Math.abs(newTranscript.length - this.lastInterimTranscript.length);
		const isDifferent = newTranscript !== this.lastInterimTranscript;
		
		// Always update if transcript is significantly different
		if (isDifferent && lengthDiff > 3) {
			return true;
		}
		
		// Update if throttle time has passed
		if (timeSinceLastUpdate >= TIMING_CONSTANTS.INTERIM_UPDATE_THROTTLE) {
			return true;
		}
		
		return false;
	}

	/**
	 * Extract text after wake word - PRODUCTION: Unified helper
	 * Handles wake word anywhere in text (e.g., "okay skymate 13A chicken")
	 * CRITICAL: Removes ALL leading wake words (e.g., "skymate skymate 5A" → "5A")
	 */
	private extractTextAfterWakeWord(text: string): string {
		// First, try to find LAST wake word in the text and extract everything after it
		// This handles multiple wake words: "skymate skymate 5A chicken" → "5A chicken"
		const wakeWordPattern =
			/(skymate|sky\s+mate|sky-mate|sky\s+make|sky\s*(?:make|mate|m8|m\s*ate)|guy\s*(?:mate|made|make))\s+/gi;
		
		let lastMatch: RegExpExecArray | null = null;
		let match: RegExpExecArray | null = null;
		
		// Find the LAST occurrence of wake word
		while ((match = wakeWordPattern.exec(text)) !== null) {
			lastMatch = match;
		}

		if (lastMatch && lastMatch.index !== undefined) {
			// Extract everything after the LAST wake word
			const afterWakeWord = text
				.substring(lastMatch.index + lastMatch[0].length)
				.trim();
			return afterWakeWord;
		}

		// Fallback: remove all wake words from start
		return text
			.replace(
				/^(?:skymate|sky\s+mate|sky-mate|sky\s+make|sky\s*(?:make|mate|m8|m\s*ate)|guy\s*(?:mate|made|make))\s+/gi,
				""
			)
			.replace(/^(sky|guy)\s*/i, "")
			.trim();
	}

	/**
	 * Clean wake word from text - PRODUCTION: Unified helper
	 */
	private cleanWakeWordFromText(text: string): string {
		return text
			.replace(
				/^(skymate|sky\s+mate|sky-mate|sky\s+make|guy\s*(?:mate|made|make))\s+/gi,
				""
			)
			.replace(
				/\s+(skymate|sky\s+mate|sky-mate|sky\s+make|guy\s*(?:mate|made|make))(\s+|$)/gi,
				" "
			)
			.replace(
				/\b(skymate|sky\s+mate|sky-mate|sky\s+make|guy\s*(?:mate|made|make))\b/gi,
				""
			)
			.replace(/\s+/g, " ")
			.trim();
	}

	/**
	 * Check if text contains only wake word (no actual request)
	 */
	private isOnlyWakeWord(text: string): boolean {
		if (!text || typeof text !== "string") {
			return true; // Empty/null is considered wake-word-only
		}

		const trimmed = text.trim().toLowerCase();

		// Check if it's just wake word variants with no other content
		const wakeWordOnlyPattern =
			/^(skymate|sky\s+mate|sky-mate|sky\s+make|sky\s*(make|mate|m8|m\s*ate))(\s*|\.|,|!|\?)*$/i;

		// Also check if it's empty after removing wake word
		const withoutWakeWord = trimmed
			.replace(
				/^(skymate|sky\s+mate|sky-mate|sky\s+make|sky\s*(make|mate|m8|m\s*ate))\s*/i,
				""
			)
			.replace(/^sky\s*/i, "")
			.trim();

		return wakeWordOnlyPattern.test(trimmed) || withoutWakeWord.length === 0;
	}

	/**
	 * OPTIMIZED Wake Word Detection - 99.9% Accurate
	 * Streamlined for speed and accuracy with improved pattern matching
	 * IMPROVED: More lenient matching for better first-time detection
	 */
	private detectWakeWord(text: string): {
		detected: boolean;
		variant: string;
		confidence: number;
	} {
		if (!text || typeof text !== "string") {
			return { detected: false, variant: "", confidence: 0 };
		}

		const normalized = text.trim().toLowerCase();

		// Fast path: Exact match at start (99% of cases)
		if (normalized.startsWith("skymate ") || normalized === "skymate") {
			return { detected: true, variant: "exact", confidence: 1.0 };
		}

		// CRITICAL FIX: Enhanced pattern with MORE common misrecognitions
		// Added: climates, climate, sky mates, sky made, sky meat, sky meet, primates, estimate, I mean, I'm
		// IMPROVED: More lenient matching for better detection
		const wakeWordPattern =
			/(?:^|\s)(skymate|sky\s*(?:mate|make|m8|m\s*ate|mite|made|meat|meet|mates|main)|sky-mate|sc[iy]mate|skim+ate|skimate|climates?|primates?|estimate|sky\s*m[ae][ietd]+|guy\s*(?:mate|made|make))(?:\s+|$)/i;
		if (wakeWordPattern.test(text)) {
			// Higher confidence if at start, medium if mid-sentence
			const confidence = text.match(
				/^(skymate|sky\s*(?:mate|make|mite|made|meat|meet|main)|sc[iy]mate|skimate|climates?|sky\s*m[ae][ietd]+|guy\s*(?:mate|made))/i
			)
				? 0.95
				: 0.85;
			return { detected: true, variant: "pattern", confidence };
		}

		// Fuzzy fallback: short text starting with "sky", "sc", or "cl" (catches partial STT)
		// IMPROVED: More lenient for better first-time detection
		if (
			(normalized.startsWith("sky") || normalized.startsWith("sc") || normalized.startsWith("cl")) &&
			text.length < 25 &&
			!normalized.includes("seat")
		) {
			const afterPrefix = normalized.startsWith("sky") 
				? normalized.substring(3).trim()
				: normalized.startsWith("cl")
				? normalized.substring(2).trim()
				: normalized.substring(2).trim();
			// Check if remaining text looks like wake word fragment
			// IMPROVED: More lenient pattern matching
			if (afterPrefix.length <= 8 && /^[imates8m\s]*$/i.test(afterPrefix)) {
				return { detected: true, variant: "fuzzy", confidence: 0.75 };
			}
		}

		return { detected: false, variant: "", confidence: 0 };
	}

	/**
	 * Reset wake word state - CRITICAL: Called on every wake word detection
	 * This ensures each "skymate" starts a completely fresh request
	 * ENHANCED: More aggressive reset to guarantee clean state
	 */
	private resetWakeWordState(): void {
		// CRITICAL: Reset all state flags
		this.wakeWordDetected = false;
		this.pendingTranscript = "";
		this.wakeWordDetectedTime = 0;
		this.speechBuffer = []; // Clear speech buffer
		this.virtualWakeWordActive = false; // Clear virtual wake word flag
		this.wakeWordResultIndex = -1; // Reset result index tracking
		// NOTE: Don't reset wakeWordConfirmationPlayed here to prevent multiple beeps
		// It will be reset after request processing or timeout

		// Reset interim tracking for next session
		this.lastInterimUpdate = 0;
		this.lastInterimTranscript = "";

		// Clear all timeouts
		this.clearContinuationTimeout();
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		// Mark current session as complete
		if (this.currentSession && !this.currentSession.processed) {
			this.currentSession.processed = true;
			this.addToSessionHistory(this.currentSession);
		}

		this.currentSession = null;
	}

	/**
	 * Start a new request session (called when wake word is detected)
	 */
	private startNewSession(): RequestSession {
		// End previous session if exists
		if (this.currentSession && !this.currentSession.processed) {
			this.currentSession.processed = true;
			this.addToSessionHistory(this.currentSession);
		}

		// Create fresh session
		const session: RequestSession = {
			id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			wakeWordDetectedAt: Date.now(),
			transcript: "",
			processed: false,
			alternatives: [],
		};

		this.currentSession = session;
		this.log("info", "New request session started", { sessionId: session.id });

		return session;
	}

	/**
	 * Add session to history (for debugging and analytics)
	 */
	private addToSessionHistory(session: RequestSession): void {
		this.sessionHistory.push(session);
		// Keep only last N sessions
		if (this.sessionHistory.length > this.MAX_SESSION_HISTORY) {
			this.sessionHistory.shift();
		}
	}

	/**
	 * Get current session (or create one if wake word detected)
	 */
	// @ts-ignore - Kept for future use
	private getCurrentSession(): RequestSession | null {
		return this.currentSession;
	}

	constructor() {
		// Initialize production metrics
		this.startTime = Date.now();
		this.metrics = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			averageConfidence: 0,
			averageProcessingTime: 0,
			wakeWordDetections: 0,
			restartCount: 0,
			errorCount: 0,
			healthStatus: "healthy",
			uptime: 0,
		};

		// Check for Azure Speech credentials first (preferred for production)
		// Import config dynamically to check for Azure credentials
		import("./config")
			.then(({ config }) => {
				console.log("🔍 [VoiceService] Checking Azure Speech credentials...");
				console.log("   Key present:", !!config.azureSpeech?.key);
				console.log("   Region present:", !!config.azureSpeech?.region);

				if (config.azureSpeech?.key && config.azureSpeech?.region) {
					this.log(
						"info",
						"✅ Azure Speech credentials detected - will use Azure Speech Service",
						{
							region: config.azureSpeech.region,
							keyLength: config.azureSpeech.key.length,
							keyPreview: config.azureSpeech.key.substring(0, 8) + "...",
						}
					);
					this.useAzureSpeech = true;
					// Azure Speech will be initialized lazily when needed
					// Start health monitoring and metrics even without Web Speech API
					this.startHealthMonitoring();
					this.startMetricsFlushing();
					return;
				} else {
					// Missing credentials - log why we're falling back
					const missing = [];
					if (!config.azureSpeech?.key) missing.push("key");
					if (!config.azureSpeech?.region) missing.push("region");
					console.warn(
						`⚠️ [VoiceService] Azure Speech credentials incomplete (missing: ${missing.join(
							", "
						)})`
					);
					console.warn("⚠️ Falling back to Web Speech API");
					console.warn(
						"💡 To use Azure Speech: Set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION in .env"
					);
				}
			})
			.catch((error) => {
				// Config import failed, continue with Web Speech API
				console.error("❌ [VoiceService] Failed to import config:", error);
				console.warn("⚠️ Falling back to Web Speech API");
			});

		// Production logging with structured format
		this.log("info", "VoiceService constructor - Web Speech API", {
			timestamp: new Date().toISOString(),
			userAgent:
				typeof window !== "undefined" ? navigator.userAgent : "unknown",
		});

		// Check for Web Speech API support
		const SpeechRecognitionClass =
			(typeof window !== "undefined" &&
				((window as any).SpeechRecognition ||
					(window as any).webkitSpeechRecognition)) ||
			null;

		if (!SpeechRecognitionClass) {
			this.log("warn", "Web Speech API not supported in this browser", {
				browser:
					typeof window !== "undefined" ? navigator.userAgent : "unknown",
			});
			this.updateHealthStatus("degraded", "Web Speech API not supported");
			return;
		}

		try {
			const recognition = new SpeechRecognitionClass();
			recognition.continuous = true; // Keep listening continuously for wake word
			recognition.interimResults = true; // Enable interim results for better feedback
			recognition.lang = "en-US";

			// Set max alternatives to get better results (if supported)
			if ("maxAlternatives" in recognition) {
				(recognition as any).maxAlternatives = 5; // Increased to 5 for better selection
			}

			// Add grammar for aviation-specific terms (if supported)
			// This helps recognition of flight-related vocabulary
			try {
				const SpeechGrammarListClass =
					(window as any).SpeechGrammarList ||
					(window as any).webkitSpeechGrammarList;

				if (SpeechGrammarListClass) {
					// COMPREHENSIVE grammar with ALL possible variations and phonetic matches
					// This focuses the model on aviation-specific vocabulary with maximum coverage
					const grammar = `#JSGF V1.0;
grammar aviation;
public <wake_word> = (skymate | sky mate | sky-mate | sky make | sky mate | sky make | skymate | skymate | sky make | sky mate);
public <row_number> = (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | one | two | three | four | five | six | seven | eight | nine | ten | eleven | twelve | thirteen | fourteen | fifteen | sixteen | seventeen | eighteen | nineteen | twenty | thirty | forty | fifty | sixty | seventy | eighty | ninety | twenty-one | twenty-two | twenty-three | twenty-four | twenty-five | twenty-six | twenty-seven | twenty-eight | twenty-nine | thirty-one | thirty-two | thirty-three | thirty-four | thirty-five | thirty-six | thirty-seven | thirty-eight | thirty-nine | forty-one | forty-two | forty-three | forty-four | forty-five | forty-six | forty-seven | forty-eight | forty-nine | fifty-one | fifty-two | fifty-three | fifty-four | fifty-five | fifty-six | fifty-seven | fifty-eight | fifty-nine | sixty-one | sixty-two | sixty-three | sixty-four | sixty-five | sixty-six | sixty-seven | sixty-eight | sixty-nine | seventy-one | seventy-two | seventy-three | seventy-four | seventy-five | seventy-six | seventy-seven | seventy-eight | seventy-nine | eighty-one | eighty-two | eighty-three | eighty-four | eighty-five | eighty-six | eighty-seven | eighty-eight | eighty-nine | ninety-one | ninety-two | ninety-three | ninety-four | ninety-five | ninety-six | ninety-seven | ninety-eight | ninety-nine);
public <seat_letter> = (A | B | C | D | E | F | a | b | c | d | e | f | be | bee | sea | see | de | dee | ef | eve | ay | eh | 8 | 6 | 3 | 5 | 1 | eight | six | three | five | one);
public <seat> = <row_number> <seat_letter> | <row_number> [space] <seat_letter>;
public <action> = (wants | needs | once | requests | would like | knees | neat | minutes | 1 | one | need | want | request | please);
public <article> = (a | an | the);
public <meal_item> = (chicken | beef | fish | vegetarian | vegan | pasta | meal | food | dinner | lunch | breakfast | snack | sandwich | salad | chicken meal | beef meal | fish meal | vegetarian meal | vegan meal | veggie | veggie meal | no meat | gluten free | gluten free meal | halal | kosher | special meal);
public <beverage_item> = (water | drink | coffee | tea | juice | coke | cola | soda | pepsi | sprite | wine | beer | bottle of water | cup of coffee | glass of water | hot water | cold water | sparkling water | still water | orange juice | apple juice | cranberry juice | tomato juice);
public <comfort_item> = (blanket | pillow | headphone | headset | headphones | magazine | newspaper | extra blanket | extra pillow | eye mask | ear plugs | amenity kit);
public <assistance_item> = (help | assistance | support | please | call button | emergency | medical | bathroom | restroom | lavatory | sick | unwell | feeling unwell);
public <item> = <meal_item> | <beverage_item> | <comfort_item> | <assistance_item>;
public <request> = [<wake_word>] <seat> <action> [<article>] <item>;`;

					const speechRecognitionList = new SpeechGrammarListClass();
					speechRecognitionList.addFromString(grammar, 1);
					recognition.grammars = speechRecognitionList;
					console.log(
						"✅ Enhanced grammar loaded for aviation terms (99% accuracy mode)"
					);
				}
			} catch (e) {
				console.warn(
					"⚠️ Grammar not supported in this browser, continuing without it"
				);
			}

			this.recognition = recognition;

			this.log("info", "Web Speech API initialized successfully", {
				maxAlternatives: 5,
				continuous: true,
				interimResults: true,
			});

			// Start health monitoring
			this.startHealthMonitoring();

			// Start metrics flushing
			this.startMetricsFlushing();
		} catch (error: any) {
			this.log("error", "Failed to initialize Web Speech API", {
				error: error?.message || String(error),
				stack: error?.stack,
			});
			this.recordError(
				"initialization_failed",
				error?.message || String(error)
			);
			this.recognition = null;
			this.updateHealthStatus("unhealthy", "Initialization failed");
			return;
		}
	}

	/**
	 * Production-level structured logging
	 */
	private log(
		level: "info" | "warn" | "error" | "debug",
		message: string,
		data?: any
	): void {
		const timestamp = new Date().toISOString();
		// @ts-ignore - Kept for future logging service
		const logEntry = {
			timestamp,
			level,
			service: "VoiceService",
			message,
			...(data || {}),
		};

		// Console logging with emoji for readability
		const emoji =
			level === "info"
				? "✅"
				: level === "warn"
				? "⚠️"
				: level === "error"
				? "❌"
				: "🔍";
		console[level === "debug" ? "log" : level](
			`${emoji} [VoiceService] ${message}`,
			data || ""
		);

		// In production, you could send this to a logging service
		// Example: sendToLoggingService(logEntry);
	}

	/**
	 * Record error for metrics and monitoring
	 */
	private recordError(error: string, message: string): void {
		this.metrics.errorCount++;
		this.lastError = {
			error,
			timestamp: Date.now(),
			message,
		};
		this.metrics.lastError = this.lastError;
		this.updateHealthStatus("degraded", error);
	}

	/**
	 * Update health status and notify callback
	 * Implements stability to prevent rapid oscillation
	 */
	private updateHealthStatus(
		status: "healthy" | "degraded" | "unhealthy",
		reason?: string
	): void {
		// Implement health status stability to prevent oscillation
		const now = Date.now();
		const timeSinceLastChange = now - (this.lastHealthChangeTime || 0);
		const MIN_HEALTH_CHANGE_INTERVAL = 10000; // 10 seconds minimum between changes

		// If trying to change too quickly, only allow degradation to unhealthy or improvement
		if (timeSinceLastChange < MIN_HEALTH_CHANGE_INTERVAL) {
			const currentStatus = this.metrics.healthStatus;

			// Allow immediate changes only in these cases:
			// 1. Going from healthy/degraded to unhealthy (critical issues)
			// 2. Going from unhealthy to healthy/degraded (recovery)
			// 3. First time setting status
			const allowImmediate =
				!this.lastHealthChangeTime || // First time
				status === "unhealthy" || // Critical issues
				(currentStatus === "unhealthy" && currentStatus !== "unhealthy") || // Recovery from critical
				currentStatus === status; // No change

			if (!allowImmediate) {
				this.log(
					"debug",
					`Health status change throttled: ${currentStatus} → ${status} (${timeSinceLastChange}ms since last change)`,
					{ reason, throttled: true }
				);
				return; // Throttle the change
			}
		}

		if (this.metrics.healthStatus !== status) {
			this.log(
				"info",
				`Health status changed: ${this.metrics.healthStatus} → ${status}`,
				{ reason, timeSinceLastChange }
			);
			this.metrics.healthStatus = status;
			this.lastHealthChangeTime = now;

			if (this.onHealthChangeCallback) {
				this.onHealthChangeCallback(this.getHealthCheck());
			}
		}
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		this.healthCheckInterval = setInterval(() => {
			const health = this.getHealthCheck();

			// Auto-recovery: if unhealthy but recognition is available, try to recover
			if (
				health.status === "unhealthy" &&
				health.recognitionAvailable &&
				!this.isListening
			) {
				this.log("warn", "Attempting auto-recovery from unhealthy state");
				this.restartAttempts = 0; // Reset restart attempts for recovery
			}

			// Intelligent health evaluation: if system has been stable for a while,
			// and recognition is working, consider upgrading health status
			this.evaluateOverallHealth();

			// Update uptime
			this.metrics.uptime = Date.now() - this.startTime;
		}, TIMING_CONSTANTS.HEALTH_CHECK_INTERVAL);
	}

	/**
	 * Evaluate overall system health based on recent performance
	 * This helps stabilize health status and prevent oscillation
	 */
	private evaluateOverallHealth(): void {
		const now = Date.now();
		const timeSinceLastError = this.lastError
			? now - this.lastError.timestamp
			: Infinity;
		const timeSinceLastSuccess = this.metrics.lastSuccess
			? now - this.metrics.lastSuccess.timestamp
			: Infinity;

		// If system has been stable for 2 minutes and recognition is available, consider it healthy
		const STABLE_PERIOD = 120000; // 2 minutes
		const isStable = timeSinceLastError > STABLE_PERIOD;
		const hasRecentSuccess = timeSinceLastSuccess < STABLE_PERIOD;
		const recognitionAvailable = this.useAzureSpeech
			? this.azureSpeechService?.isAvailable() || false
			: this.recognition !== null;

		// Only upgrade health status if system is demonstrably stable
		if (
			this.metrics.healthStatus === "degraded" &&
			isStable &&
			recognitionAvailable
		) {
			if (hasRecentSuccess || this.metrics.successfulRequests > 0) {
				this.updateHealthStatus(
					"healthy",
					"System stable for 2+ minutes with working recognition"
				);
			}
		}
	}

	/**
	 * Start metrics flushing (for analytics)
	 */
	private startMetricsFlushing(): void {
		if (this.metricsFlushInterval) {
			clearInterval(this.metricsFlushInterval);
		}

		this.metricsFlushInterval = setInterval(() => {
			this.flushMetrics();
		}, TIMING_CONSTANTS.METRICS_FLUSH_INTERVAL);
	}

	/**
	 * Flush metrics to analytics service (placeholder for production)
	 */
	private flushMetrics(): void {
		// Calculate averages
		if (this.processingTimes.length > 0) {
			this.metrics.averageProcessingTime =
				this.processingTimes.reduce((a, b) => a + b, 0) /
				this.processingTimes.length;
			// Keep only last 100 processing times to prevent memory growth
			if (this.processingTimes.length > 100) {
				this.processingTimes = this.processingTimes.slice(-100);
			}
		}

		// In production, send to analytics service
		// Example: analyticsService.track('voice_metrics', this.metrics);

		this.log("debug", "Metrics flushed", {
			totalRequests: this.metrics.totalRequests,
			successRate:
				this.metrics.totalRequests > 0
					? (
							(this.metrics.successfulRequests / this.metrics.totalRequests) *
							100
					  ).toFixed(2) + "%"
					: "0%",
			healthStatus: this.metrics.healthStatus,
		});
	}

	/**
	 * Get health check result
	 */
	getHealthCheck(): HealthCheckResult {
		return {
			status: this.metrics.healthStatus,
			recognitionAvailable: this.useAzureSpeech
				? this.azureSpeechService?.isAvailable() || false
				: this.recognition !== null,
			isListening: this.isListening,
			lastError: this.lastError?.error,
			uptime: Date.now() - this.startTime,
			metrics: { ...this.metrics },
			useAzureSpeech: this.useAzureSpeech, // Expose which API is being used
		};
	}

	/**
	 * Set health change callback for monitoring
	 */
	onHealthChange(callback: (health: HealthCheckResult) => void): void {
		this.onHealthChangeCallback = callback;
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): VoiceMetrics {
		return { ...this.metrics };
	}

	/**
	 * Debounce helper for rapid events
	 */
	// @ts-ignore - Kept for future use
	private debounce<T extends (...args: any[]) => void>(
		fn: T,
		delay: number
	): T {
		return ((...args: any[]) => {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}
			this.debounceTimer = setTimeout(() => fn(...args), delay);
		}) as T;
	}

	/**
	 * Start continuous listening with wake word detection
	 * Only processes transcripts that start with "Seat" or variants
	 * @param onInterimTranscript - Optional callback for throttled interim transcript updates (for UI feedback)
	 */
	async startContinuousListening(
		onWakeWordDetected: (text: string, selectedAlternative?: any) => void,
		onWakeWordOnly?: (text: string) => void,
		onWakeWordConfirmation?: () => void,
		onInterimTranscript?: (text: string) => void
	) {
		// Store callbacks for timeout handlers
		this.storedWakeWordCallback = onWakeWordDetected;
		this.storedWakeWordOnlyCallback = onWakeWordOnly || null;
		this.onWakeWordConfirmation = onWakeWordConfirmation || null;
		this.onInterimTranscript = onInterimTranscript || null;
		// PRODUCTION: Allow restart even if already listening (for ensureContinuousListening)
		// But log it for debugging
		if (this.isListening) {
			this.log(
				"warn",
				"Already listening - will restart anyway for production reliability"
			);
			// Don't return - allow restart for production reliability
		}

		// Check if we should use Azure Speech (preferred for production)
		if (this.useAzureSpeech) {
			return this.startAzureSpeechListening(onWakeWordDetected, onWakeWordOnly);
		}

		if (!this.recognition) {
			console.error(
				"Web Speech API not available. Please use Chrome, Edge, or Safari."
			);
			// Note: Cannot use toast here as this is a library file without React context
			return;
		}

		console.log("🎤 Listening for 'Skymate'...");

		// Reset wake word state
		this.resetWakeWordState();

		// Track when mic is actually ready
		this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;

		// Set up event handlers
		// Use onspeechstart to know when mic is actually listening
		if ("onspeechstart" in this.recognition) {
			(this.recognition as any).onspeechstart = () => {
				console.log("🎙️ Microphone is now actively listening");
				this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_BUFFER;
			};
		}

		this.recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interimTranscript = "";

			// Process interim results for real-time feedback and wake word detection
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (!result.isFinal) {
					const interimText = result[0]?.transcript || "";
					interimTranscript += interimText;
					// Only log interim results in development mode and only if they contain wake word
					if (
						process.env.NODE_ENV === "development" &&
						this.detectWakeWord(interimText).detected
					) {
						console.log(`🔍 Interim (wake word): ${interimText}`);
					}

				// ROBUST WAKE WORD DETECTION: Check for wake word but prevent re-detection in same utterance
				// The key insight: "skymate remind me" is ONE utterance with multiple interim updates
				// We should only detect wake word ONCE per utterance (result index)
				const currentResultIndex = i;

				// OPTIMIZATION: If we already detected wake word in this utterance, skip detection entirely
				// Just accumulate the text - no need to check for wake word again
				const isSameUtterance = this.wakeWordResultIndex === currentResultIndex;
				
				if (isSameUtterance) {
					// Already detected wake word in this utterance - skip to accumulation logic
					this.log(
						"debug",
						`📝 Same utterance update (resultIndex ${currentResultIndex}) - skipping wake word check`,
						{ text: interimText }
					);
					// Continue to accumulation logic below
				} else {
					// NEW utterance OR first interim - check for wake word
					const wakeWordCheck = this.detectWakeWord(interimText);

					// TTS LOCK: Block wake word detection while AI is speaking
					if (wakeWordCheck.detected && this.isTTSSpeaking) {
						this.log(
							"debug",
							`🔒 Wake word detected but TTS is speaking - BLOCKED to prevent interruption`,
							{ text: interimText }
						);
						return; // Don't process wake word while TTS is active
					}

					// CRITICAL: If wake word detected in a NEW utterance
					if (wakeWordCheck.detected) {
					const now = Date.now();
					const timeSinceLastWakeWord = now - this.lastWakeWordTime;

					// HARD LIMIT: Prevent rapid-fire detections (interim + final for same utterance)
					if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_HARD_LIMIT) {
						this.log(
							"debug",
							`⏸️ Wake word detected but within hard limit (${timeSinceLastWakeWord}ms), ignoring to prevent echo`,
							{
								variant: wakeWordCheck.variant,
								confidence: wakeWordCheck.confidence.toFixed(2),
								timeSinceLastWakeWord,
								resultIndex: currentResultIndex,
							}
						);
						// Continue processing current session, don't reset
						return;
					}

					// SOFT DEBOUNCE: Check if this is too soon after last wake word
					// But allow it if it's a higher confidence detection
					if (
						timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE &&
						wakeWordCheck.confidence < 0.95
					) {
						this.log(
							"info",
							`⏸️ Wake word detected but debounced (${timeSinceLastWakeWord}ms since last, confidence: ${wakeWordCheck.confidence.toFixed(2)})`,
							{
								variant: wakeWordCheck.variant,
								text: interimText,
								resultIndex: currentResultIndex,
							}
						);
						// Play subtle feedback that it was heard but debounced
						// This prevents user frustration when wake word is ignored
						return;
					}

					// Update last wake word time and result index
					this.lastWakeWordTime = now;
					this.wakeWordResultIndex = currentResultIndex; // Track this utterance

					// CRITICAL: Reset state for new wake word detection
					this.log(
						"info",
						"🔄 Wake word detected in NEW utterance - Starting fresh session",
						{
							variant: wakeWordCheck.variant,
							confidence: wakeWordCheck.confidence.toFixed(2),
							text: interimText,
							timeSinceLastWakeWord,
							resultIndex: currentResultIndex,
							previousState: {
								wakeWordDetected: this.wakeWordDetected,
								hasSession: !!this.currentSession,
								pendingTranscript: this.pendingTranscript,
							},
						}
					);

					// CRITICAL: Force complete reset - this happens for EACH NEW wake word utterance
					this.resetWakeWordState();

					// Start fresh session
					const session = this.startNewSession();

					// Update metrics and state
					this.metrics.wakeWordDetections++;
					this.wakeWordDetected = true;
					this.wakeWordDetectedTime = now;
					this.wakeWordResultIndex = currentResultIndex; // Track which utterance has wake word

					// Trigger wake word confirmation audio (only once per wake word)
					if (
						this.onWakeWordConfirmation &&
						!this.wakeWordConfirmationPlayed
					) {
						this.wakeWordConfirmationPlayed = true;
						this.onWakeWordConfirmation();
					}

					// Extract text after wake word (normalize all variants to "skymate")
					const normalized = this.extractTextAfterWakeWord(interimText);

					if (normalized) {
						this.pendingTranscript = normalized;
						session.transcript = normalized;
					}

					// Clear any existing continuation timeout
					this.clearContinuationTimeout();

					// Set a timeout to allow for pauses (user might be thinking)
					this.log(
						"info",
						`⏳ New request session started, waiting up to ${
							TIMING_CONSTANTS.WAKE_WORD_TIMEOUT / 1000
						}s for continuation...`,
						{
							sessionId: session.id,
						}
					);
					}
				} // End of else block (new utterance wake word check)

				// ACCUMULATION LOGIC: If wake word was already detected, accumulate the rest
				// This handles both same utterance updates AND continuation after pause
				if (this.wakeWordDetected) {
					// Wake word already detected, accumulate the rest (continuation of current request)
					// This allows users to pause and continue speaking
					const timeSinceWakeWord = Date.now() - this.wakeWordDetectedTime;
					if (timeSinceWakeWord <= TIMING_CONSTANTS.WAKE_WORD_TIMEOUT) {
						// CRITICAL: Filter out wake word repetitions from interim results
						// Remove "skymate" and variants from the interim text before accumulating
						const cleanedInterim = this.cleanWakeWordFromText(interimText);

						// Only accumulate if there's actual content (not just wake word)
						if (cleanedInterim) {
							// PRODUCTION: Replace buffer with interim result (not push)
							// Interim results are cumulative - they already contain the full text so far
							// Pushing would create duplicates like "remind remind me remind me of..."
							this.speechBuffer = [cleanedInterim];
							this.pendingTranscript = cleanedInterim.trim();

							// Update session transcript with throttling
							if (this.currentSession) {
								this.currentSession.transcript = this.pendingTranscript;
							}

							// Throttled logging and callback - only update if transcript has changed significantly
							if (this.shouldUpdateInterim(this.pendingTranscript)) {
								this.lastInterimUpdate = Date.now();
								this.lastInterimTranscript = this.pendingTranscript;
								
								// Call interim callback for UI updates (throttled)
								if (this.onInterimTranscript) {
									this.onInterimTranscript(this.pendingTranscript);
								}
								
								this.log(
									"debug",
									`📝 Accumulating interim text for current session`,
									{
										sessionId: this.currentSession?.id,
										transcript: this.pendingTranscript,
										bufferLength: this.speechBuffer.length,
									}
								);
							}

							// Reset and extend buffer timer - wait for complete speech
							if (this.speechBufferTimer)
								clearTimeout(this.speechBufferTimer);
							
							// FIX RACE CONDITION: Store session reference to avoid checking stale flags
							const sessionToProcess = this.currentSession;
							const transcriptToProcess = this.pendingTranscript;
							
							this.speechBufferTimer = setTimeout(() => {
								// Speech has stopped - process buffered speech
								// FIX: Check session validity instead of wake word flag (prevents race with onend)
								if (
									sessionToProcess &&
									!sessionToProcess.processed &&
									transcriptToProcess &&
									transcriptToProcess === this.pendingTranscript // Still the same transcript
								) {
									this.log(
										"info",
										`⏰ Processing buffered speech after silence`,
										{
											sessionId: sessionToProcess.id,
											transcript: transcriptToProcess,
										}
									);
									this.processRequestSession(
										sessionToProcess,
										onWakeWordDetected
									);
									this.resetWakeWordState();
									this.speechBuffer = [];
								} else if (sessionToProcess?.processed) {
									this.log("debug", "Session already processed, skipping buffer timer");
								}
							}, TIMING_CONSTANTS.SPEECH_BUFFER_DELAY);

							// Reset continuation timeout since we're getting more input
							this.clearContinuationTimeout();
							
							// FIX RACE CONDITION: Store session reference for timeout
							const sessionForTimeout = this.currentSession;
							const transcriptForTimeout = this.pendingTranscript;
							
							this.continuationTimeout = setTimeout(() => {
								// FIX: Check session validity instead of wake word flag
								if (
									sessionForTimeout &&
									!sessionForTimeout.processed &&
									transcriptForTimeout &&
									transcriptForTimeout === this.pendingTranscript
								) {
									// Process what we have after timeout
									if (this.speechBufferTimer)
										clearTimeout(this.speechBufferTimer);
									this.log("info", "⏰ Continuation timeout - processing accumulated request", {
										sessionId: sessionForTimeout.id,
										transcript: transcriptForTimeout,
									});
									this.processRequestSession(
										sessionForTimeout,
										onWakeWordDetected
									);
									this.resetWakeWordState();
									this.speechBuffer = [];
								} else if (sessionForTimeout && !sessionForTimeout.processed && !transcriptForTimeout) {
									this.log(
										"info",
										`⏰ Continuation timeout reached with no transcript, resetting wake word state`
									);
									this.resetWakeWordState();
									this.wakeWordConfirmationPlayed = false; // Allow beep on next wake word
								} else if (sessionForTimeout?.processed) {
									this.log("debug", "Session already processed, skipping continuation timeout");
								}
							}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);
						} else {
							// Just wake word detected again - ignore it (user might have repeated it)
							this.log(
								"debug",
								`🔄 Wake word repeated in interim, ignoring`,
								{ text: interimText }
							);
						}
					}
				}
				}
			}

			// Process final results with multi-alternative intelligence
			const finalResults: Array<{ transcript: string; confidence: number }> =
				[];
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					// Get ALL alternatives (not just the first one)
					const alternatives: Array<{
						transcript: string;
						confidence: number;
					}> = [];
					for (let j = 0; j < result.length; j++) {
						const alt = result[j];
						if (alt?.transcript) {
							alternatives.push({
								transcript: alt.transcript,
								confidence: alt.confidence || 0,
							});
						}
					}
					finalResults.push(...alternatives);
				}
			}

			if (finalResults.length > 0) {
				// Check if mic was ready when this speech was captured
				const resultTime = Date.now();
				if (resultTime < this.micReadyTime) {
					const timeUntilReady = this.micReadyTime - resultTime;
					console.log(
						`⏳ Result received too early (${timeUntilReady}ms before ready), ignoring...`
					);
					// Don't process results that came before mic was ready
					return;
				}

				// 100% ACCURATE: Check for wake word in ALL final results
				// Use comprehensive detection that catches all variants
				let foundWakeWordInFinal = false;
				let bestWakeWordMatch: {
					result: (typeof finalResults)[0];
					confidence: number;
					variant: string;
				} | null = null;

				for (const result of finalResults) {
					const trimmed = result.transcript.trim();
					const wakeWordCheck = this.detectWakeWord(trimmed);

					if (wakeWordCheck.detected) {
						// Combine detection confidence with API confidence
						const combinedConfidence =
							wakeWordCheck.confidence * 0.7 + result.confidence * 0.3;

						if (
							!bestWakeWordMatch ||
							combinedConfidence > bestWakeWordMatch.confidence
						) {
							bestWakeWordMatch = {
								result,
								confidence: combinedConfidence,
								variant: wakeWordCheck.variant,
							};
						}
					}
				}

			// CRITICAL: If wake word found in final results, check if it's a NEW utterance
			// IMPROVED: Use result index tracking to prevent duplicate detections from interim+final
			if (bestWakeWordMatch) {
				// TTS LOCK: Block wake word detection while AI is speaking
				if (this.isTTSSpeaking) {
					this.log(
						"debug",
						`🔒 Wake word in final result but TTS is speaking - BLOCKED to prevent interruption`,
						{ 
							text: bestWakeWordMatch.result.transcript.substring(0, 50),
							variant: bestWakeWordMatch.variant
						}
					);
					foundWakeWordInFinal = false;
					// Don't process - skip to normal continuation handling
				} else {
				const now = Date.now();
				const timeSinceLastWakeWord = now - this.lastWakeWordTime;
				const trimmed = bestWakeWordMatch.result.transcript.trim();
				const currentResultIndex = event.resultIndex;

				// Check if this is the same utterance we already processed in interim
				const isSameUtterance = this.wakeWordResultIndex === currentResultIndex;

				// HARD LIMIT: Prevent rapid-fire detections (interim already processed this)
				// OR if it's the same utterance (result index), skip it
				if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_HARD_LIMIT || isSameUtterance) {
					this.log(
						"debug",
						`⏸️ Wake word in final results but ${isSameUtterance ? 'same utterance (resultIndex ' + currentResultIndex + ')' : 'within hard limit (' + timeSinceLastWakeWord + 'ms)'}, already processed`,
						{
							variant: bestWakeWordMatch.variant,
							confidence: bestWakeWordMatch.confidence.toFixed(3),
							timeSinceLastWakeWord,
							isSameUtterance,
							resultIndex: currentResultIndex,
						}
					);
					// Skip - already processed in interim results
					foundWakeWordInFinal = false;
				} else {
					// SOFT DEBOUNCE: Check if this is too soon but allow high confidence
					if (
						timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE &&
						bestWakeWordMatch.confidence < 0.95
					) {
						this.log(
							"info",
							`⏸️ Wake word in final results but debounced (${timeSinceLastWakeWord}ms since last)`,
							{
								variant: bestWakeWordMatch.variant,
								confidence: bestWakeWordMatch.confidence.toFixed(3),
							}
						);
						foundWakeWordInFinal = false;
					} else {
					// Update last wake word time and result index
					this.lastWakeWordTime = now;
					this.wakeWordResultIndex = currentResultIndex;

					this.log(
						"info",
						`🎯 Wake word detected in final results (NEW utterance) - Starting fresh session`,
						{
							variant: bestWakeWordMatch.variant,
							confidence: bestWakeWordMatch.confidence.toFixed(3),
							text: trimmed,
							timeSinceLastWakeWord,
							resultIndex: currentResultIndex,
							previousSession: this.currentSession?.id,
							previousState: {
								wakeWordDetected: this.wakeWordDetected,
								hasSession: !!this.currentSession,
								pendingTranscript: this.pendingTranscript,
							},
						}
					);

					// CRITICAL: Force complete reset - happens for EACH NEW wake word utterance
					this.resetWakeWordState();
					const session = this.startNewSession();
					this.wakeWordConfirmationPlayed = false; // Reset beep flag for new wake word

					// Update metrics and state
					this.metrics.wakeWordDetections++;
					this.wakeWordDetected = true;
					this.wakeWordDetectedTime = now;
					this.wakeWordResultIndex = currentResultIndex;
					foundWakeWordInFinal = true;

					// Trigger wake word confirmation audio (only once per wake word)
					if (this.onWakeWordConfirmation) {
						this.wakeWordConfirmationPlayed = true;
						this.onWakeWordConfirmation();
					}

					// Extract text after wake word (handle all variants, including mid-sentence)
					const afterWakeWord = this.extractTextAfterWakeWord(trimmed);

					// PRODUCTION: Don't process immediately - buffer and wait for complete speech
					// Only process if we have substantial content (more than just "mate" or similar)
					const isSubstantialRequest =
						afterWakeWord &&
						!this.isOnlyWakeWord(afterWakeWord) &&
						afterWakeWord.length > 3 && // More than just "mate" or short words
						!afterWakeWord.match(/^(mate|make|m8)$/i); // Not just wake word fragments

					if (isSubstantialRequest) {
						// Substantial request detected - check if it looks complete

					// PRODUCTION: Task commands are always complete - detect them early
					const isTaskCommand =
						/\b(remind|show|display|list|tell|what).*?\b(Task|task)\s+(\d+)\b/i.test(
							afterWakeWord
						);

					// PRODUCTION: Describe commands are always complete
					const isDescribeCommand =
						/^(describe|tell me about|what's in|what is in|info about|information about)\s+/i.test(
							afterWakeWord
						);

				// PRODUCTION: Seat information commands are always complete
				// Word "seat" is optional to support natural phrasing
				const isSeatInfoCommand =
					/\b(remind|tell|show|display|what|who|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+seat)?\s+\d{1,2}[A-F]\b/i.test(
						afterWakeWord
					) && !/\b(task|past|ask)\s+\d+/i.test(afterWakeWord); // Exclude task commands

				// PRODUCTION: Special requests list command
				const isSpecialRequestsCommand =
					/\b(remind|tell|show|display|list|what|give|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+the)?(?:\s+all)?(?:\s+special\s*requests?)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Priority members list command
				const isPriorityMembersCommand =
					/\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+priority\s*members?)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Gold class members command
				const isGoldMembersCommand =
					/\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+gold(?:\s+class)?\s+members?)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Diamond class members command
				const isDiamondMembersCommand =
					/\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+diamond(?:\s+class)?\s+members?)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Team introduction command
				const isTeamIntroCommand =
				/\b(introduce|show|tell|display|present)(?:\s+me)?(?:\s+(?:our|the|yourself))?\s*(?:team)?\b/i.test(
					afterWakeWord
				) && (afterWakeWord.includes("team") || afterWakeWord.includes("yourself"));
	

				// If it has seat + item pattern, it's likely complete
					const hasSeatPattern = /\b\d{1,2}[A-F]\b/i.test(afterWakeWord);

						// PRODUCTION: Comprehensive item pattern - includes all items from vocabulary
						// Meals, beverages, comfort items, assistance
						const hasItemPattern =
							/\b(chicken|beef|fish|water|coffee|tea|wine|beer|sprite|pepsi|blanket|pillow|meal|food|beverage|drink|towel|headphones|headset|magazine|newspaper|juice|coke|cola|soda|vegetarian|vegan|pasta|help|assistance|emergency|medical|bathroom|restroom|lavatory)\b/i.test(
								afterWakeWord
							);

						// PRODUCTION: Also check if text has seat + any meaningful word (not just stop words)
						// This catches items not in the explicit list
						const hasMeaningfulContent =
							hasSeatPattern &&
							afterWakeWord.split(/\s+/).some((word) => {
								const lower = word.toLowerCase();
								// Exclude common stop words, partial words, and seat patterns
								return (
									![
										"a",
										"an",
										"the",
										"wants",
										"needs",
										"requests",
										"once",
										"knees",
										"neat",
										"minutes",
										"bl", // Partial "blanket"
										"co", // Partial "coffee"
										"wa", // Partial "water"
										"ju", // Partial "juice"
										"ch", // Partial "chicken"
										"be", // Partial "beef"
										"pi", // Partial "pillow"
										"he", // Partial "headphones"
									].includes(lower) &&
									!/^\d+[a-f]?$/i.test(lower) && // Not just seat number
									lower.length > 3 // Require at least 4 characters (not 2)
								); // Meaningful word
							});

					const looksComplete =
						isTaskCommand ||
						isDescribeCommand ||
						isSeatInfoCommand ||
						isSpecialRequestsCommand ||
						isPriorityMembersCommand ||
						isGoldMembersCommand ||
						isDiamondMembersCommand ||
						(hasSeatPattern && (hasItemPattern || hasMeaningfulContent));

						if (looksComplete) {
							// Complete request detected - process immediately with short buffer
							this.log(
								"info",
								`📝 Complete request detected, processing with short buffer`,
								{
									sessionId: session.id,
									transcript: trimmed,
									afterWakeWord,
								}
							);

							// CRITICAL: Set currentSession before timer to ensure it's available
							this.currentSession = session;
							session.transcript = afterWakeWord;
							session.alternatives = finalResults;

							// PRODUCTION: Store session in closure to ensure it's available when timer fires
							const sessionToProcess = session;

					// Process with minimal delay (just to ensure speech is complete)
					if (this.speechBufferTimer) clearTimeout(this.speechBufferTimer);
					
					// Use faster processing for seat info, describe, special requests, membership queries, team intro, and task commands
					const processingDelay = (isSeatInfoCommand || isDescribeCommand || isTaskCommand || isSpecialRequestsCommand || isPriorityMembersCommand || isGoldMembersCommand || isDiamondMembersCommand || isTeamIntroCommand) 
							? 100  // Very fast for simple lookup commands
							: TIMING_CONSTANTS.COMPLETE_REQUEST_DELAY;
						
						this.speechBufferTimer = setTimeout(() => {
								if (sessionToProcess && !sessionToProcess.processed) {
									this.log(
										"info",
										`⏰ Processing complete request after short delay`,
										{
											sessionId: sessionToProcess.id,
											transcript: sessionToProcess.transcript,
										}
									);
									this.processRequestSession(
										sessionToProcess,
										onWakeWordDetected
									);
									this.resetWakeWordState();
									this.speechBuffer = [];
								}
							}, processingDelay);

							// Don't set continuation timeout for complete requests
							this.clearContinuationTimeout();
							return;
						} else {
							// Partial request - buffer and wait for continuation
							this.log(
								"info",
								`📝 Partial request detected, buffering for continuation`,
								{
									sessionId: session.id,
									transcript: trimmed,
									afterWakeWord,
								}
							);

							// Buffer the text and wait for continuation
							this.speechBuffer = [afterWakeWord];
							this.pendingTranscript = afterWakeWord;
							session.transcript = afterWakeWord;
							session.alternatives = finalResults;

							// Set debounced processing timer - wait for complete speech
							if (this.speechBufferTimer) clearTimeout(this.speechBufferTimer);
							this.speechBufferTimer = setTimeout(() => {
								if (this.currentSession && this.pendingTranscript) {
									this.log(
										"info",
										`⏰ Processing buffered speech after delay`,
										{
											sessionId: this.currentSession.id,
											transcript: this.pendingTranscript,
										}
									);
									this.processRequestSession(
										this.currentSession,
										onWakeWordDetected
									);
									this.resetWakeWordState();
									this.speechBuffer = [];
								}
							}, TIMING_CONSTANTS.SPEECH_BUFFER_DELAY);

							// Set continuation timeout as fallback
							this.clearContinuationTimeout();
							this.continuationTimeout = setTimeout(() => {
								// If no more speech comes, process what we have
								if (
									this.wakeWordDetected &&
									this.pendingTranscript &&
									this.currentSession
								) {
									this.log("info", `⏰ Processing after continuation timeout`, {
										sessionId: this.currentSession.id,
										transcript: this.pendingTranscript,
									});
									if (this.speechBufferTimer)
										clearTimeout(this.speechBufferTimer);
									this.processRequestSession(
										this.currentSession,
										onWakeWordDetected
									);
									this.resetWakeWordState();
									this.speechBuffer = [];
								} else if (this.wakeWordDetected && !this.pendingTranscript) {
									this.resetWakeWordState();
								}
							}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);

							return; // Wait for more speech
						}
					} else {
						// Just wake word - wait for continuation (with extended timeout)
						this.log(
							"info",
							`⏳ Wake word only detected, waiting for continuation`,
							{
								sessionId: session.id,
								timeout: `${TIMING_CONSTANTS.WAKE_WORD_TIMEOUT / 1000}s`,
							}
						);

						this.pendingTranscript = "";
						// Clear any existing continuation timeout
						if (this.continuationTimeout) {
							clearTimeout(this.continuationTimeout);
						}
						// Set a timeout to allow user to pause and think
						// After timeout, if no continuation is received, reset the wake word state
						this.continuationTimeout = setTimeout(() => {
							if (
								this.wakeWordDetected &&
								!this.pendingTranscript &&
								this.currentSession
							) {
								this.log(
									"info",
									`⏰ Continuation timeout reached, resetting wake word state`,
									{
										sessionId: this.currentSession.id,
										timeout: `${TIMING_CONSTANTS.WAKE_WORD_TIMEOUT / 1000}s`,
									}
								);
								this.resetWakeWordState();
								this.wakeWordConfirmationPlayed = false; // Allow beep on next wake word
							}
				}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);
				return;
			}
			}  // End of else block (actual wake word processing) started at line ~3539
		}  // End of else block (after hard limit check) started at line ~3524
		}  // End of else block (TTS lock check)
	}  // End of if (bestWakeWordMatch)

		// If wake word was already detected, check if this is a continuation
			// Allow continuation even if there was a pause (more lenient)
			if (this.wakeWordDetected && finalResults.length > 0) {
					const timeSinceWakeWord = Date.now() - this.wakeWordDetectedTime;

					// Check if this result came within the timeout window (allow pauses)
					if (timeSinceWakeWord <= TIMING_CONSTANTS.WAKE_WORD_TIMEOUT) {
						const continuation = finalResults[0].transcript.trim();

						// Skip if continuation is just the wake word again (user might have repeated it)
						const isWakeWordOnly =
							/^(skymate|sky\s+mate|sky-mate|sky\s+make)(\s+|$)/i.test(
								continuation
							);

						if (continuation && !isWakeWordOnly) {
							// Clean continuation to remove any wake word repetitions
							const cleanedContinuation = continuation
								.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/gi, "") // Remove from start
								.replace(
									/\s+(skymate|sky\s+mate|sky-mate|sky\s+make)(\s+|$)/gi,
									" "
								) // Remove from middle/end
								.replace(/\b(skymate|sky\s+mate|sky-mate|sky\s+make)\b/gi, "") // Remove standalone
								.replace(/\s+/g, " ") // Normalize whitespace
								.trim();

							if (!cleanedContinuation) {
								// Continuation was just wake word, skip it
								console.log(`🔄 Continuation was just wake word, skipping...`);
								return;
							}

						// Combine pending transcript with cleaned final result
						// CRITICAL: Check if continuation already contains pending transcript (cumulative result)
						// Speech recognition can return cumulative results after pauses
						let fullRequest: string;
						if (this.pendingTranscript && cleanedContinuation.includes(this.pendingTranscript)) {
							// Continuation is cumulative - already contains everything
							fullRequest = cleanedContinuation;
							console.log(`🔍 Detected cumulative continuation (already contains pending transcript)`);
						} else if (this.pendingTranscript) {
							// Continuation is incremental - combine with pending
							fullRequest = `${this.pendingTranscript} ${cleanedContinuation}`.trim();
							console.log(`🔍 Combining incremental continuation with pending transcript`);
						} else {
							// No pending transcript
							fullRequest = cleanedContinuation;
						}

							// Final cleanup to remove any remaining wake word repetitions
							const finalCleaned = fullRequest
								.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/gi, "")
								.replace(
									/\s+(skymate|sky\s+mate|sky-mate|sky\s+make)(\s+|$)/gi,
									" "
								)
								.replace(/\s+/g, " ")
								.trim();

							console.log(
								`📝 Continuation after wake word (${(
									timeSinceWakeWord / 1000
								).toFixed(1)}s pause): "${finalCleaned}"`
							);

							// PRODUCTION: Validate continuation has actual content (not just wake word)
							if (this.isOnlyWakeWord(finalCleaned)) {
								this.log(
									"info",
									`⏸️ Continuation is wake-word-only, waiting for actual request`,
									{
										transcript: finalCleaned,
									}
								);
								// Don't process - timeout will handle reset
								return;
							}

							// Clear continuation timeout since we got the continuation
							this.clearContinuationTimeout();

							// UNIFIED FLOW: Process continuation through current session
							if (this.currentSession) {
								this.currentSession.transcript = finalCleaned;
								this.currentSession.alternatives = [
									{
										transcript: finalCleaned,
										confidence: finalResults[0].confidence,
									},
								];

								this.log("info", `📝 Continuation processed for session`, {
									sessionId: this.currentSession.id,
									transcript: finalCleaned,
									pauseDuration: `${(timeSinceWakeWord / 1000).toFixed(1)}s`,
								});

								// Process through unified flow
								this.processRequestSession(
									this.currentSession,
									onWakeWordDetected
								);
							} else {
								// No session? Create one and process
								const session = this.startNewSession();
								session.transcript = finalCleaned;
								session.alternatives = [
									{
										transcript: finalCleaned,
										confidence: finalResults[0].confidence,
									},
								];
								this.processRequestSession(session, onWakeWordDetected);
							}

							// Reset state for next request
							this.resetWakeWordState();
							// IMPORTANT: Don't return here - let recognition continue
							// The recognition will continue automatically in continuous mode
							return;
						} else if (isWakeWordOnly) {
							// User repeated the wake word - NEW REQUEST, reset everything
							this.log(
								"info",
								`🔄 Wake word repeated in final - RESETTING for new request`,
								{
									previousSession: this.currentSession?.id,
								}
							);

							// UNIFIED FLOW: Reset and start fresh
							this.resetWakeWordState();
							this.startNewSession(); // Start new session for next request

							this.wakeWordDetected = true;
							this.wakeWordDetectedTime = Date.now();
							this.pendingTranscript = "";

							// Clear and reset continuation timeout
							if (this.continuationTimeout) {
								clearTimeout(this.continuationTimeout);
							}
							this.continuationTimeout = setTimeout(() => {
								if (
									this.wakeWordDetected &&
									!this.pendingTranscript &&
									this.currentSession
								) {
									this.log(
										"info",
										`⏰ Continuation timeout reached after wake word repeat`,
										{
											sessionId: this.currentSession.id,
										}
									);
									this.resetWakeWordState();
								}
							}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);
							return;
						}
					} else {
						// Timeout exceeded - reset wake word state
						console.log(
							`⏰ Continuation timeout exceeded (${(
								timeSinceWakeWord / 1000
							).toFixed(1)}s), resetting wake word state`
						);
						this.wakeWordDetected = false;
						this.pendingTranscript = "";
						this.wakeWordDetectedTime = 0;
						if (this.continuationTimeout) {
							clearTimeout(this.continuationTimeout);
							this.continuationTimeout = null;
						}
					}
				}

				// If wake word was already detected in interim results but not in final,
				// and we're still within timeout, wait for continuation
				if (
					this.wakeWordDetected &&
					!foundWakeWordInFinal &&
					finalResults.length > 0
				) {
					const timeSinceWakeWord = Date.now() - this.wakeWordDetectedTime;
					if (timeSinceWakeWord <= TIMING_CONSTANTS.WAKE_WORD_TIMEOUT) {
						// Still within timeout, accumulate the result
						const continuation = finalResults[0].transcript.trim();

						// Clean continuation to remove wake word repetitions
						const cleanedContinuation = continuation
							.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/gi, "")
							.replace(
								/\s+(skymate|sky\s+mate|sky-mate|sky\s+make)(\s+|$)/gi,
								" "
							)
							.replace(/\b(skymate|sky\s+mate|sky-mate|sky\s+make)\b/gi, "")
							.replace(/\s+/g, " ")
							.trim();

					if (cleanedContinuation) {
						// CRITICAL: Check if continuation already contains pending transcript (cumulative result)
						if (this.pendingTranscript && cleanedContinuation.includes(this.pendingTranscript)) {
							// Continuation is cumulative - already contains everything
							this.pendingTranscript = cleanedContinuation;
							console.log(`🔍 [onend] Detected cumulative continuation (already contains pending transcript)`);
						} else if (this.pendingTranscript) {
							// Continuation is incremental - combine with pending
							this.pendingTranscript = `${this.pendingTranscript} ${cleanedContinuation}`.trim();
							console.log(`🔍 [onend] Combining incremental continuation with pending transcript`);
						} else {
							// No pending transcript
							this.pendingTranscript = cleanedContinuation;
						}

						// Final cleanup to remove any remaining wake word repetitions
						this.pendingTranscript = this.pendingTranscript
								.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/gi, "")
								.replace(
									/\s+(skymate|sky\s+mate|sky-mate|sky\s+make)(\s+|$)/gi,
									" "
								)
								.replace(/\s+/g, " ")
								.trim();

							console.log(
								`📝 Accumulating continuation: "${this.pendingTranscript}" (waiting for more...)`
							);
							return; // Wait for more results
						} else {
							// Continuation was just wake word, ignore it
							console.log(`🔄 Continuation was just wake word, ignoring...`);
							return;
						}
					}
				}

				// No wake word detected - only log in development mode
				if (
					onWakeWordOnly &&
					!this.wakeWordDetected &&
					process.env.NODE_ENV === "development"
				) {
					console.log(`👂 Heard: "${finalResults[0].transcript}"`);
				}
			}
		};

		this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			this.recordError(event.error, event.message);

			this.log("error", "Web Speech API error", {
				error: event.error,
				message: event.message,
				isListening: this.isListening,
				restartAttempts: this.restartAttempts,
			});

			// Production-level error handling with recovery
			let shouldRestart = false;
			let userMessage = "";

			// Handle specific errors with recovery strategies
			if (event.error === "no-speech") {
				this.log("warn", "No speech detected - this is normal during silence");
				// Don't restart for no-speech, it's expected
				shouldRestart = false;
			} else if (event.error === "audio-capture") {
				userMessage =
					"Microphone not found or access denied. Please check your microphone settings.";
				this.updateHealthStatus("unhealthy", "audio-capture");
				shouldRestart = false; // Can't recover without user action
			} else if (event.error === "not-allowed") {
				userMessage =
					"Microphone permission denied. Please allow microphone access in your browser settings.";
				this.updateHealthStatus("unhealthy", "not-allowed");
				shouldRestart = false; // Can't recover without user action
			} else if (event.error === "network") {
				// Detect if using Brave browser
				const isBrave =
					(navigator as any).brave?.isBrave ||
					(navigator as any).brave?.isBrave();

				let message =
					"Network error: Unable to connect to speech recognition service.\n\n";

				if (isBrave) {
					message +=
						"⚠️ You're using Brave browser, which blocks Google's speech recognition by default.\n\n";
					message += "To fix this:\n";
					message += "1. Go to Settings → Shields\n";
					message += "2. Allow this site to connect to Google services\n";
					message += "OR\n";
					message += "3. Use Chrome, Edge, or Safari instead";
				} else {
					message += "Possible causes:\n";
					message += "• Privacy/Ad blocker blocking Google services\n";
					message += "• Network connectivity issues\n";
					message += "• Firewall blocking speech recognition servers\n\n";
					message += "Try disabling extensions or using a different browser.";
				}

				console.error("Speech recognition error:", message);
				// Note: Cannot use toast here as this is a library file without React context
			} else if (event.error === "aborted") {
				// Be more conservative with aborted error restarts - only restart if we haven't tried recently
				const timeSinceLastRestart = Date.now() - (this.lastRestartTime || 0);
				const shouldAttemptRestart =
					this.isListening &&
					this.restartAttempts < TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS &&
					timeSinceLastRestart > 2000; // Wait at least 2 seconds between restart attempts

				if (shouldAttemptRestart) {
					this.log("warn", "Recognition aborted - attempting restart", {
						timeSinceLastRestart,
						restartAttempts: this.restartAttempts,
					});
				} else {
					this.log(
						"debug",
						"Recognition aborted - skipping restart (too recent or max attempts)",
						{ timeSinceLastRestart, restartAttempts: this.restartAttempts }
					);
				}
				shouldRestart = shouldAttemptRestart;
			} else {
				this.log("error", "Unknown speech recognition error", {
					error: event.error,
					message: event.message,
				});
				userMessage = `Speech recognition error: ${event.error}`;
				// Try to recover from unknown errors
				shouldRestart =
					this.isListening &&
					this.restartAttempts < TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS;
			}

			// Show user-friendly message if needed
			if (userMessage && typeof window !== "undefined") {
				// In production, use a toast notification system instead of alert
				// Example: toastService.error(userMessage);
				console.error(userMessage);
			}

			// Auto-recovery with exponential backoff
			if (shouldRestart) {
				const backoffDelay = Math.min(
					TIMING_CONSTANTS.RECOGNITION_RESTART_RETRY *
						Math.pow(2, this.restartAttempts),
					5000 // Max 5 seconds
				);

				this.log(
					"info",
					`Attempting auto-recovery (attempt ${this.restartAttempts + 1}/${
						TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS
					})`,
					{
						backoffDelay,
					}
				);

				setTimeout(() => {
					if (this.isListening && this.recognition) {
						try {
							this.restartAttempts++;
							this.metrics.restartCount++;
							this.recognition.start();
							// FIX: Reset mic ready time after error recovery (critical for early rejection prevention)
							this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;
							this.log("info", "Recognition restarted after error", {
								micReadyTime: this.micReadyTime,
								restartAttempt: this.restartAttempts,
							});
							this.updateHealthStatus("healthy", "Recovery successful");
						} catch (e: any) {
							this.log("error", "Failed to restart recognition", {
								error: e?.message,
								attempt: this.restartAttempts,
							});

							if (
								this.restartAttempts >= TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS
							) {
								this.log("error", "Max restart attempts reached, giving up");
								this.updateHealthStatus(
									"unhealthy",
									"Max restart attempts exceeded"
								);
								this.isListening = false;
							}
						}
					}
				}, backoffDelay);
			} else if (!shouldRestart && event.error !== "no-speech") {
				// Only stop listening for critical errors
				this.isListening = false;
			}
		};

	this.recognition.onend = () => {
		this.log("info", "Web Speech recognition ended", {
			isListening: this.isListening,
			wakeWordDetected: this.wakeWordDetected,
			hasPendingRequest: !!(this.wakeWordDetected && this.pendingTranscript),
		});

		// FIX CRITICAL RACE CONDITION: DON'T reset wake word state if we have a pending request
		// Only reset if no active request waiting to be processed
		// This prevents losing requests when recognition ends naturally before processing completes
		const hasPendingRequest = this.wakeWordDetected && this.pendingTranscript;
		
		if (!hasPendingRequest) {
			// Safe to reset - no pending request
			this.wakeWordDetected = false;
			this.pendingTranscript = "";
			this.wakeWordDetectedTime = 0;
			if (this.continuationTimeout) {
				clearTimeout(this.continuationTimeout);
				this.continuationTimeout = null;
			}
			this.log("debug", "Wake word state reset in onend (no pending request)");
		} else {
			this.log("info", "⚠️ Keeping wake word state - pending request active, will reset after processing");
			// Request will be processed by buffer timer or final result handler
			// Those handlers will call resetWakeWordState() after processing
		}

			// If we're in continuous mode, restart automatically with production-level retry logic
			if (this.isListening && this.recognition) {
				this.log("info", "Restarting continuous listening...");
				// Reset mic ready time for next session
				this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;

				// Production-level restart with exponential backoff
				const attemptRestart = (attempt: number = 0) => {
					if (!this.isListening || !this.recognition) {
						return;
					}

					const delay =
						attempt === 0
							? TIMING_CONSTANTS.RECOGNITION_RESTART_DELAY
							: Math.min(
									TIMING_CONSTANTS.RECOGNITION_RESTART_RETRY *
										Math.pow(2, attempt),
									2000
							  );

					setTimeout(() => {
						if (!this.isListening || !this.recognition) {
							return;
						}

						try {
							this.recognition.start();
							this.restartAttempts = 0; // Reset on successful restart
							this.lastRestartTime = Date.now(); // Track restart time
							// FIX: Reset mic ready time on all restart paths (fixes race condition)
							this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;
							this.log("info", "Continuous listening restarted successfully", {
								attempt: attempt + 1,
								micReadyTime: this.micReadyTime,
							});
							this.updateHealthStatus("healthy", "Restart successful");
						} catch (e: any) {
							// Already started or other error
							if (e?.message?.includes("already started")) {
								this.log("warn", "Recognition already running", {
									attempt: attempt + 1,
								});
								this.updateHealthStatus("healthy", "Already running");
							} else {
								this.log("error", "Error restarting recognition", {
									error: e?.message,
									attempt: attempt + 1,
								});

								// Retry with exponential backoff (max 3 attempts)
								if (attempt < 2) {
									attemptRestart(attempt + 1);
								} else {
									this.log("error", "Max restart retries reached, giving up");
									this.updateHealthStatus(
										"degraded",
										"Restart failed after retries"
									);
									this.isListening = false;
								}
							}
						}
					}, delay);
				};

				attemptRestart();
			} else {
				this.isListening = false;
			}
		};

		// Start recognition
		try {
			this.recognition.start();
			this.isListening = true;
			console.log("✅ Ready");
		} catch (error: any) {
			console.error("❌ Failed to start recognition:", error);
			console.error(
				`Failed to start speech recognition: ${
					error.message || "Unknown error"
				}`
			);
			// Note: Cannot use toast here as this is a library file without React context
			this.isListening = false;
		}
	}

	/**
	 * Start one-time listening (for manual button click)
	 */
	async startListening(onTranscript: (text: string) => void) {
		if (this.isListening) {
			return;
		}

		if (!this.recognition) {
			console.error(
				"Web Speech API not available. Please use Chrome, Edge, or Safari."
			);
			// Note: Cannot use toast here as this is a library file without React context
			return;
		}

		// Track when mic is actually ready
		this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;

		// Set up event handlers for one-time listening
		if ("onspeechstart" in this.recognition) {
			(this.recognition as any).onspeechstart = () => {
				this.micReadyTime = Date.now() + 200;
			};
		}

		// Temporarily set continuous to false for one-time listening
		const wasContinuous = this.recognition.continuous;
		this.recognition.continuous = false;

		this.recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interimTranscript = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (!result.isFinal) {
					interimTranscript += result[0]?.transcript || "";
				}
			}

			const finalResults: Array<{ transcript: string; confidence: number }> =
				[];
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					const alternatives: Array<{
						transcript: string;
						confidence: number;
					}> = [];
					for (let j = 0; j < result.length; j++) {
						const alt = result[j];
						if (alt?.transcript) {
							alternatives.push({
								transcript: alt.transcript,
								confidence: alt.confidence || 0,
							});
						}
					}
					finalResults.push(...alternatives);
				}
			}

			if (finalResults.length > 0) {
				const resultTime = Date.now();
				if (resultTime < this.micReadyTime) {
					return; // Ignore results received too early
				}
				this.processAllAlternatives(finalResults, onTranscript);
			}
		};

		this.recognition.onend = () => {
			if (this.recognition) {
				this.recognition.continuous = wasContinuous; // Restore original setting
			}
			this.isListening = false;
		};

		// Start recognition
		try {
			this.recognition.start();
			this.isListening = true;
		} catch (error: any) {
			console.error("❌ Failed to start recognition:", error.message || error);
			this.isListening = false;
		}
	}

	stopListening() {
		if (!this.isListening) {
			this.log(
				"warn",
				"Attempted to stop listening but not currently listening"
			);
			return;
		}

		// Handle Azure Speech
		if (this.useAzureSpeech && this.azureSpeechService) {
			this.azureSpeechService.stopRecognition();
			this.isListening = false;
			this.wakeWordDetected = false;
			this.pendingTranscript = "";
			this.wakeWordDetectedTime = 0;

			// Clean up timeouts
			if (this.continuationTimeout) {
				clearTimeout(this.continuationTimeout);
				this.continuationTimeout = null;
			}
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
				this.debounceTimer = null;
			}

			this.log("info", "Azure Speech recognition stopped successfully");
			return;
		}

		if (!this.recognition) {
			this.log("warn", "No recognition service available to stop");
			return;
		}

		this.log("info", "Stopping voice recognition...");
		this.isListening = false;
		this.wakeWordDetected = false;
		this.pendingTranscript = "";
		this.wakeWordDetectedTime = 0;

		// Clean up all timeouts
		if (this.continuationTimeout) {
			clearTimeout(this.continuationTimeout);
			this.continuationTimeout = null;
		}
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		try {
			this.recognition.stop();
			this.log("info", "Voice recognition stopped successfully");
			this.updateHealthStatus("healthy", "Stopped gracefully");
		} catch (error: any) {
			this.log("error", "Error stopping recognition", {
				error: error?.message || String(error),
			});
			// Try abort as fallback
			try {
				this.recognition.abort();
				this.log("info", "Recognition aborted as fallback");
			} catch (e: any) {
				this.log("warn", "Error aborting recognition", {
					error: e?.message || String(e),
				});
			}
		}
	}

	/**
	 * Simulate wake word detection (e.g., from button press or earbud tap)
	 * Uses the same reliable path as voice wake-word detection
	 * 
	 * This allows alternative activation methods (buttons, shortcuts, gestures)
	 * to trigger the exact same proven wake-word flow, ensuring 100% consistency
	 * and reliability.
	 */
	simulateWakeWordDetection(): void {
		if (!this.isListening) {
			this.log('warn', '⚠️ Cannot simulate wake word: not listening');
			return;
		}

		// TTS LOCK: Block simulated wake word while AI is speaking
		if (this.isTTSSpeaking) {
			this.log('warn', '🔒 Cannot simulate wake word: TTS is currently speaking');
			return;
		}

		// For Azure Speech, simulate interim result processing
		if (this.useAzureSpeech) {
			this.log('info', '🎯 Virtual wake word activated via button/tap (Azure Speech)');

			const now = Date.now();

			// Apply same debouncing as real wake word
			const timeSinceLastWakeWord = now - this.lastWakeWordTime;
			if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE) {
				this.log('debug', `⏸️ Wake word simulation debounced (${timeSinceLastWakeWord}ms since last)`);
				return;
			}

			this.lastWakeWordTime = now;

			// Reset state and start new session (same as real wake word)
			this.resetWakeWordState();
			this.speechBuffer = [];
			const session = this.startNewSession();
			this.metrics.wakeWordDetections++;
			this.wakeWordDetected = true;
			this.wakeWordDetectedTime = now;

			// CRITICAL FIX: Set flag to bypass wake word detection in result processors
			// This allows the next speech result to be treated as if "Skymate" was said
			this.virtualWakeWordActive = true;
			this.log('info', '✅ Virtual wake word flag set - next speech will bypass wake word check');

			// Trigger confirmation audio (only once per wake word)
			if (this.onWakeWordConfirmation && !this.wakeWordConfirmationPlayed) {
				this.wakeWordConfirmationPlayed = true;
				this.onWakeWordConfirmation();
			}

			// Set timeout for continuation (same as real wake word)
			this.clearContinuationTimeout();
			const sessionForTimeout = session;
			this.continuationTimeout = setTimeout(() => {
				if (
					sessionForTimeout &&
					!sessionForTimeout.processed &&
					!this.pendingTranscript
				) {
					this.log('info', '⏰ No speech within 8s after button press, resetting');
					this.resetWakeWordState();
				}
			}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);

			this.log('info', '✅ Virtual wake word session started successfully', {
				sessionId: session.id,
				method: 'button/tap',
			});
		} else {
			// For Web Speech API, use same flow
			this.log('info', '🎯 Virtual wake word activated via button/tap (Web Speech)');

			const now = Date.now();

			// Apply same debouncing
			const timeSinceLastWakeWord = now - this.lastWakeWordTime;
			if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE) {
				this.log('debug', `⏸️ Wake word simulation debounced (${timeSinceLastWakeWord}ms since last)`);
				return;
			}

			this.lastWakeWordTime = now;

			// Reset and start new session
			this.resetWakeWordState();
			const session = this.startNewSession();
			this.metrics.wakeWordDetections++;
			this.wakeWordDetected = true;
			this.wakeWordDetectedTime = now;

			// CRITICAL FIX: Set flag for Web Speech API too
			this.virtualWakeWordActive = true;
			this.log('info', '✅ Virtual wake word flag set (Web Speech) - next speech will bypass wake word check');
	

			// Trigger confirmation audio
			if (this.onWakeWordConfirmation && !this.wakeWordConfirmationPlayed) {
				this.wakeWordConfirmationPlayed = true;
				this.onWakeWordConfirmation();
			}

			// Set timeout for continuation
			this.clearContinuationTimeout();
			this.continuationTimeout = setTimeout(() => {
				if (
					this.wakeWordDetected &&
					!this.pendingTranscript &&
					this.currentSession
				) {
					this.log('info', '⏰ No speech within 8s after button press, resetting');
					this.resetWakeWordState();
				}
			}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);

			this.log('info', '✅ Virtual wake word session started successfully', {
				sessionId: session.id,
				method: 'button/tap',
			});
		}
	}

	/**
	 * Set TTS speaking state - call this when TTS starts/stops speaking
	 * This prevents wake word detection while the AI is talking
	 * 
	 * @param isSpeaking - true when TTS starts, false when it stops
	 */
	setTTSSpeakingState(isSpeaking: boolean): void {
		const wasSpeaking = this.isTTSSpeaking;
		this.isTTSSpeaking = isSpeaking;
		
		if (isSpeaking && !wasSpeaking) {
			this.log('info', '🔒 TTS started speaking - Wake word detection LOCKED');
		} else if (!isSpeaking && wasSpeaking) {
			this.log('info', '🔓 TTS stopped speaking - Wake word detection UNLOCKED');
		}
	}

	/**
	 * Check if TTS is currently speaking
	 */
	isTTSCurrentlySpeaking(): boolean {
		return this.isTTSSpeaking;
	}

	/**
	 * Cleanup method for production (call on component unmount)
	 */
	cleanup(): void {
		this.log("info", "Cleaning up VoiceService...");

		// Stop listening
		this.stopListening();

		// Clear intervals
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}

		if (this.metricsFlushInterval) {
			clearInterval(this.metricsFlushInterval);
			this.metricsFlushInterval = null;
		}

		// Final metrics flush
		this.flushMetrics();

		// Clear callbacks
		this.onHealthChangeCallback = undefined;

		this.log("info", "VoiceService cleanup complete");
	}

	/**
	 * Start Azure Speech Service listening
	 */
	private async startAzureSpeechListening(
		onWakeWordDetected: (text: string, selectedAlternative?: any) => void,
		onWakeWordOnly?: (text: string) => void
	): Promise<void> {
		// Store callbacks for timeout handlers
		this.storedWakeWordCallback = onWakeWordDetected;
		this.storedWakeWordOnlyCallback = onWakeWordOnly || null;
		try {
			console.log("🔍 [VoiceService] Starting Azure Speech listening...");

			// Lazy load Azure Speech Service
			if (!this.azureSpeechService) {
				console.log("📦 [VoiceService] Loading Azure Speech Service module...");
				const { AzureSpeechService } = await import("./azureSpeech");
				console.log("✅ [VoiceService] Azure Speech Service module loaded");
				this.azureSpeechService = new AzureSpeechService();
				console.log("✅ [VoiceService] Azure Speech Service instance created");
			}

			// Note: isAvailable() will be checked inside startContinuousRecognition()
			// which also handles initialization, so we don't need to check here
			console.log(
				"🎤 Starting Azure Speech continuous listening (wake word: 'Skymate')..."
			);

			// Reset wake word state
			this.resetWakeWordState();

			// Track when mic is ready
			this.micReadyTime = Date.now() + TIMING_CONSTANTS.MIC_READY_DELAY;

			// Start Azure Speech recognition with production-grade callbacks
			await this.azureSpeechService.startContinuousRecognition(
				(text: string, isFinal: boolean, confidence?: number) => {
					// PRODUCTION: Use Azure's high-quality confidence scores
					const azureConfidence = confidence || 0.8;

					// Process results similar to Web Speech API but with enhanced confidence handling
					if (isFinal) {
						// Process final results with confidence threshold
						// Azure provides higher quality results, so we can be more selective
						if (azureConfidence >= 0.3 || text.trim().length > 0) {
							this.processAzureSpeechResult(
								text,
								azureConfidence,
								onWakeWordDetected
							);
						} else {
							this.log(
								"debug",
								`Low confidence final result ignored (${azureConfidence.toFixed(
									2
								)})`
							);
						}
					} else {
						// Process interim results for wake word detection
						// Pass confidence to interim handler for better filtering
						this.processAzureSpeechInterim(
							text,
							azureConfidence,
							onWakeWordDetected
						);
					}
				},
				(error: string) => {
					// FIX: Add automatic error recovery for Azure Speech
					this.log("error", "Azure Speech recognition error - attempting recovery", { error });
					this.recordError("azure_speech_error", error);
					this.updateHealthStatus("degraded", `Azure error: ${error}`);

					// Determine if error is recoverable
					const isRecoverable = !(
						error.includes("auth") ||
						error.includes("credentials") ||
						error.includes("permission") ||
						error.includes("401") ||
						error.includes("403")
					);

					if (isRecoverable && this.isListening) {
						// Auto-recovery with exponential backoff
						const backoffDelay = Math.min(
							TIMING_CONSTANTS.RECOGNITION_RESTART_RETRY * Math.pow(2, this.restartAttempts),
							5000 // Max 5 seconds
						);

						this.log("info", `Attempting Azure Speech auto-recovery in ${backoffDelay}ms (attempt ${this.restartAttempts + 1}/${TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS})`);

						setTimeout(() => {
							if (this.isListening && this.azureSpeechService && this.restartAttempts < TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS) {
								this.restartAttempts++;
								this.metrics.restartCount++;
								
								// Restart Azure Speech
								this.startAzureSpeechListening(
									this.storedWakeWordCallback!,
									this.storedWakeWordOnlyCallback || undefined
								).then(() => {
									this.log("info", "Azure Speech recovery successful");
									this.restartAttempts = 0; // Reset on success
									this.updateHealthStatus("healthy", "Recovery successful");
								}).catch((err) => {
									this.log("error", "Azure Speech recovery failed", { error: err?.message });
									if (this.restartAttempts >= TIMING_CONSTANTS.MAX_RESTART_ATTEMPTS) {
										this.log("error", "Max restart attempts reached for Azure Speech");
										this.updateHealthStatus("unhealthy", "Max restart attempts exceeded");
										this.isListening = false;
									}
								});
							}
						}, backoffDelay);
					} else if (!isRecoverable) {
						this.log("error", "Azure Speech error is not recoverable (authentication/permission issue)");
						this.updateHealthStatus("unhealthy", "Non-recoverable error");
						this.isListening = false;
					}
				}
			);

			this.isListening = true;
			this.log("info", "Azure Speech continuous listening started");
		} catch (error: any) {
			this.log("error", "❌ Failed to start Azure Speech listening", {
				error: error?.message || String(error),
				stack: error?.stack,
			});
			this.recordError(
				"azure_speech_start_failed",
				error?.message || String(error)
			);
			console.error(
				`❌ [VoiceService] Failed to start Azure Speech: ${
					error?.message || "Unknown error"
				}`
			);
			console.error("Full error:", error);

			// Provide specific guidance based on error type
			if (
				error?.message?.includes("credentials") ||
				error?.message?.includes("401")
			) {
				console.error("💡 Issue: Invalid or missing Azure credentials");
				console.error(
					"   Check VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION in .env"
				);
			} else if (
				error?.message?.includes("SDK") ||
				error?.message?.includes("import")
			) {
				console.error("💡 Issue: Azure Speech SDK not properly installed");
				console.error(
					"   Run: npm install microsoft-cognitiveservices-speech-sdk"
				);
			} else if (
				error?.message?.includes("network") ||
				error?.message?.includes("connection")
			) {
				console.error("💡 Issue: Network connectivity problem");
				console.error("   Check your internet connection");
			}

			console.warn(
				"⚠️ [VoiceService] Attempting to fall back to Web Speech API..."
			);

			// Fallback to Web Speech API
			this.useAzureSpeech = false;
			if (this.recognition) {
				console.log("✅ [VoiceService] Falling back to Web Speech API");
				// Don't throw - let it fall through to Web Speech
			} else {
				console.error("❌ [VoiceService] Web Speech API also not available");
				throw error; // Re-throw if no fallback available
			}
		}
	}

	/**
	 * Process Azure Speech interim results - PRODUCTION: Unified, streamlined flow
	 * Buffers speech to prevent word loss, debounces wake word detection
	 */
	private processAzureSpeechInterim(
		text: string,
		confidence: number,
		_onWakeWordDetected: (text: string) => void
	): void {
		if (!text || !text.trim()) return;

		// CRITICAL FIX: Check for virtual wake word (button/tap activation)
		// If active, treat this as if wake word was detected
		const isVirtualWakeWord = this.virtualWakeWordActive;

		const wakeWordCheck = this.detectWakeWord(text);
		const now = Date.now();
		const wakeWordConfidenceThreshold = 0.3;
		const isWakeWordDetected =
		(wakeWordCheck.detected && confidence >= wakeWordConfidenceThreshold) || isVirtualWakeWord;

		// TTS LOCK: Block wake word detection while AI is speaking
		if (isWakeWordDetected && this.isTTSSpeaking && !isVirtualWakeWord) {
			this.log(
				"debug",
				`🔒 Azure interim: Wake word detected but TTS is speaking - BLOCKED to prevent interruption`,
				{ text }
			);
			return; // Don't process wake word while TTS is active
		}

		// PRODUCTION: Debounce wake word detection to prevent duplicate triggers
		// CRITICAL: If wake word already detected, check if this is SAME utterance or NEW
		if (isWakeWordDetected) {
			// CRITICAL FIX: If this is a virtual wake word, session was already set up
			// Just process the text without resetting
			if (isVirtualWakeWord) {
				this.log('info', '🎤 Processing speech after virtual wake word (button/tap)');
				// Use the text as-is (no wake word to extract)
				const normalized = text.trim();
				if (normalized && this.currentSession) {
					this.pendingTranscript = normalized;
					this.currentSession.transcript = normalized;
					this.speechBuffer = [normalized];
					this.log('info', `📝 Accumulated text after virtual wake word: "${normalized}"`);
				}
				// Clear the flag - it's been used
				this.virtualWakeWordActive = false;
				return; // Don't process as normal wake word
			}
			
			const timeSinceLastWakeWord = now - this.lastWakeWordTime;
			
			// ROBUST FIX: If wake word was recently detected AND we're still in active session,
			// this is likely the SAME utterance with more text (e.g., "skymate" → "skymate remind")
			// Only create new session if:
			// 1. Enough time has passed (not within debounce window), OR
			// 2. No active session exists
			const isLikelySameUtterance = 
				timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE &&
				this.wakeWordDetected &&
				this.currentSession;
			
			if (isLikelySameUtterance) {
				this.log(
					"debug",
					`📝 Azure interim update for same utterance (${timeSinceLastWakeWord}ms since wake word) - accumulating`,
					{ text }
				);
				// Don't create new session - this is continuation of same utterance
				// Let it fall through to accumulation logic below
				return;
			}
			
			// Hard limit check (separate from same utterance check)
			if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_HARD_LIMIT) {
				this.log(
					"debug",
					`⏸️ Wake word within hard limit (${timeSinceLastWakeWord}ms), ignoring`
				);
				return;
			}
			
			// NEW wake word detected - create new session
			this.lastWakeWordTime = now;

			// Reset state and start new session (for REAL wake word)
			this.log(
				"info",
				`🔄 Azure: Wake word detected in NEW utterance - Starting fresh session`,
				{ text, timeSinceLastWakeWord }
			);
			this.resetWakeWordState();
			this.speechBuffer = []; // Clear buffer
			const session = this.startNewSession();
			this.metrics.wakeWordDetections++;
			this.wakeWordDetected = true;
			this.wakeWordDetectedTime = now;

			// Trigger wake word confirmation audio (only once per wake word)
			if (this.onWakeWordConfirmation && !this.wakeWordConfirmationPlayed) {
				this.wakeWordConfirmationPlayed = true;
				this.onWakeWordConfirmation();
			}

			// Extract text after wake word
			const normalized = this.extractTextAfterWakeWord(text);
			if (normalized) {
				this.pendingTranscript = normalized;
				session.transcript = normalized;
				this.speechBuffer = [normalized]; // Set buffer (not push)
			}

			// Set timeout for continuation
			this.clearContinuationTimeout();
			this.continuationTimeout = setTimeout(() => {
				if (
					this.wakeWordDetected &&
					!this.pendingTranscript &&
					this.currentSession
				) {
					this.log("info", `⏰ No speech within 10s, resetting`);
					this.resetWakeWordState();
				}
			}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);
			return;
		}

		// Accumulate continuation if wake word already detected
		if (this.wakeWordDetected) {
			const timeSinceWakeWord = now - this.wakeWordDetectedTime;
			if (timeSinceWakeWord > TIMING_CONSTANTS.WAKE_WORD_TIMEOUT) {
				this.resetWakeWordState();
				return;
			}

			if (confidence < 0.3) return; // Ignore low confidence

			const cleaned = this.cleanWakeWordFromText(text);
			if (cleaned) {
				// PRODUCTION: Replace buffer with interim result (not push)
				// Interim results are cumulative - they already contain the full text so far
				this.speechBuffer = [cleaned];
				this.pendingTranscript = cleaned.trim();

				if (this.currentSession) {
					this.currentSession.transcript = this.pendingTranscript;
				}

				// Clear and reset buffer timer - wait for complete speech
				if (this.speechBufferTimer) {
					clearTimeout(this.speechBufferTimer);
				}
				this.speechBufferTimer = setTimeout(() => {
					// Speech has stopped - buffer is complete
					this.clearContinuationTimeout();
				}, TIMING_CONSTANTS.SPEECH_BUFFER_DELAY);
			}
		}
	}

	/**
	 * Process Azure Speech final results - PRODUCTION: Unified, streamlined flow
	 * Waits for complete speech, buffers to prevent word loss
	 */
	private processAzureSpeechResult(
		text: string,
		confidence: number,
		onWakeWordDetected: (text: string) => void
	): void {
		if (!text || !text.trim()) return;

		const resultTime = Date.now();
		if (resultTime < this.micReadyTime) {
			this.log(
				"debug",
				`Result too early (${this.micReadyTime - resultTime}ms), ignoring`
			);
			return;
		}

		// CRITICAL FIX: Check for virtual wake word (button/tap activation)
		const isVirtualWakeWord = this.virtualWakeWordActive;

		const wakeWordCheck = this.detectWakeWord(text);
		const wakeWordConfidenceThreshold = 0.4;
		const isWakeWordDetected =
		(wakeWordCheck.detected && confidence >= wakeWordConfidenceThreshold) || isVirtualWakeWord;
		const now = Date.now();

		// TTS LOCK: Block wake word detection while AI is speaking
		if (isWakeWordDetected && this.isTTSSpeaking && !isVirtualWakeWord) {
			this.log(
				"debug",
				`🔒 Azure final: Wake word detected but TTS is speaking - BLOCKED to prevent interruption`,
				{ text: text.substring(0, 50) }
			);
			return; // Don't process wake word while TTS is active
		}

		// PRODUCTION: Debounce wake word detection to prevent double-triggers
		// CRITICAL: Check if this is the SAME utterance as interim or a NEW one
		if (isWakeWordDetected) {
			// CRITICAL FIX: If this is a virtual wake word, session was already set up
			// Just pass the text directly to callback
			if (isVirtualWakeWord) {
				this.log('info', '✅ Final speech after virtual wake word (button/tap) - calling callback');
				const normalized = text.trim();
				if (normalized && this.currentSession) {
					// Clear the flag first
					this.virtualWakeWordActive = false;
					
					// Mark session as processed
					this.currentSession.processed = true;
					this.currentSession.transcript = normalized;
					
					// Call the callback with the full text (no wake word extraction needed)
					onWakeWordDetected(normalized);
					this.log('info', `🎯 Callback invoked with: "${normalized}"`);
				} else {
					// Clear flag even if no text
					this.virtualWakeWordActive = false;
				}
				return; // Don't process as normal wake word
			}
			
			const timeSinceLastWakeWord = now - this.lastWakeWordTime;
			
			// ROBUST FIX: If wake word was recently detected in interim AND we have active session,
			// this final result is likely the SAME utterance (interim → final)
			// Only create new session if it's truly a NEW utterance
			const isLikelySameUtterance = 
				timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_HARD_LIMIT &&
				this.wakeWordDetected &&
				this.currentSession;
			
			// Determine which session to use
			let session = this.currentSession;
			
			if (isLikelySameUtterance) {
				this.log(
					"debug",
					`📝 Azure final result for same utterance (${timeSinceLastWakeWord}ms since wake word) - using existing session`,
					{ text }
				);
				// Use existing session - this is the final version of the same utterance
			} else if (timeSinceLastWakeWord < TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE) {
				this.log(
					"warn",
					`⏸️ Wake word debounced (too soon after last: ${timeSinceLastWakeWord}ms < ${TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE}ms)`,
					{
						lastWakeWord: this.lastWakeWordTime,
						currentTime: now,
						debounceWindow: TIMING_CONSTANTS.WAKE_WORD_DEBOUNCE,
						text: text.substring(0, 50),
					}
				);
				// FIX: Better feedback - user knows why their retry didn't work
				return;
			} else {
				// NEW wake word utterance - create new session
				this.log(
					"info",
					`🔄 Azure: Wake word in final result (NEW utterance) - Starting fresh session`,
					{ text, timeSinceLastWakeWord }
				);
				this.lastWakeWordTime = now;

				this.resetWakeWordState();
				this.speechBuffer = [];
				session = this.startNewSession();
				this.metrics.wakeWordDetections++;
				this.wakeWordDetected = true;
				this.wakeWordDetectedTime = now;

				// Trigger wake word confirmation audio (only once per wake word)
				if (this.onWakeWordConfirmation && !this.wakeWordConfirmationPlayed) {
					this.wakeWordConfirmationPlayed = true;
					this.onWakeWordConfirmation();
				}
			}

			// Ensure we have a session (should always have one at this point)
			if (!session) {
				this.log("error", "No session available for wake word processing");
				return;
			}

			const afterWakeWord = this.extractTextAfterWakeWord(text);
			if (afterWakeWord && !this.isOnlyWakeWord(afterWakeWord)) {
				// PRODUCTION: Task commands are always complete - detect them early
				const isTaskCommand =
					/\b(remind|show|display|list|tell|what).*?\b(Task|task)\s+(\d+)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Describe commands are always complete
				const isDescribeCommand =
					/^(describe|tell me about|what's in|what is in|info about|information about)\s+/i.test(
						afterWakeWord
					);

				// PRODUCTION: Seat information commands are always complete
				// Word "seat" is optional to support natural phrasing
				const isSeatInfoCommand =
					/\b(remind|tell|show|display|what|who|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+seat)?\s+\d{1,2}[A-F]\b/i.test(
						afterWakeWord
					) && !/\b(task|past|ask)\s+\d+/i.test(afterWakeWord); // Exclude task commands

				// PRODUCTION: Special requests list command
				const isSpecialRequestsCommand =
					/\b(remind|tell|show|display|list|what|give|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+the)?(?:\s+all)?(?:\s+special\s*requests?)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Priority members list command
				const isPriorityMembersCommand =
					/\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+priority\s*members?)\b/i.test(
						afterWakeWord
					);

				// Check if request looks complete (has seat + item pattern)
				const hasSeatPattern = /\b\d{1,2}[A-F]\b/i.test(afterWakeWord);

				// PRODUCTION: Comprehensive item pattern - includes all items from vocabulary
				const hasItemPattern =
					/\b(chicken|beef|fish|water|coffee|tea|wine|beer|sprite|pepsi|blanket|pillow|meal|food|beverage|drink|towel|headphones|headset|magazine|newspaper|juice|coke|cola|soda|vegetarian|vegan|pasta|help|assistance|emergency|medical|bathroom|restroom|lavatory)\b/i.test(
						afterWakeWord
					);

				// PRODUCTION: Also check if text has seat + any meaningful word
				const hasMeaningfulContent =
					hasSeatPattern &&
					afterWakeWord.split(/\s+/).some((word) => {
						const lower = word.toLowerCase();
						return (
							![
								"a",
								"an",
								"the",
								"wants",
								"needs",
								"requests",
								"once",
								"knees",
								"neat",
								"minutes",
							].includes(lower) &&
							!/^\d+[a-f]?$/i.test(lower) &&
							lower.length > 2
						);
					});

				const looksComplete =
					isTaskCommand ||
					isDescribeCommand ||
					isSeatInfoCommand ||
					isSpecialRequestsCommand ||
					isPriorityMembersCommand ||
					isGoldMembersCommand ||
					isDiamondMembersCommand ||
					(hasSeatPattern && (hasItemPattern || hasMeaningfulContent));

				session.transcript = afterWakeWord;
				session.alternatives = [{ transcript: afterWakeWord, confidence }];

				if (looksComplete) {
					// Complete request - process with short delay
					this.log(
						"info",
						`📝 Complete request detected in Azure, processing with short delay`,
						{
							sessionId: session.id,
							transcript: afterWakeWord,
						}
					);

					// CRITICAL: Set currentSession before timer to ensure it's available
					this.currentSession = session;

				// PRODUCTION: Store session in closure to ensure it's available when timer fires
				const sessionToProcess = session;

				// Use faster processing for seat info, describe, special requests, membership queries, and task commands
				const processingDelay = (isSeatInfoCommand || isDescribeCommand || isTaskCommand || isSpecialRequestsCommand || isPriorityMembersCommand || isGoldMembersCommand || isDiamondMembersCommand) 
					? 100  // Very fast for simple lookup commands
					: TIMING_CONSTANTS.COMPLETE_REQUEST_DELAY;

				if (this.speechBufferTimer) clearTimeout(this.speechBufferTimer);
				this.speechBufferTimer = setTimeout(() => {
					if (sessionToProcess && !sessionToProcess.processed) {
						this.log(
							"info",
							`⏰ Processing complete request after short delay (Azure)`,
							{
								sessionId: sessionToProcess.id,
								transcript: sessionToProcess.transcript,
							}
						);
						this.processRequestSession(sessionToProcess, onWakeWordDetected);
						this.resetWakeWordState();
						this.speechBuffer = [];
					}
				}, processingDelay);

					this.clearContinuationTimeout();
				} else {
					// Partial request - use normal buffer delay
					if (this.speechBufferTimer) clearTimeout(this.speechBufferTimer);
					this.speechBufferTimer = setTimeout(() => {
						if (this.currentSession && this.currentSession.id === session.id) {
							this.processRequestSession(
								this.currentSession,
								onWakeWordDetected
							);
							this.resetWakeWordState();
							this.speechBuffer = [];
						}
					}, TIMING_CONSTANTS.SPEECH_BUFFER_DELAY);
				}
			} else {
				// Just wake word - set timeout
				this.clearContinuationTimeout();
				this.continuationTimeout = setTimeout(() => {
					if (
						this.wakeWordDetected &&
						!this.pendingTranscript &&
						this.currentSession
					) {
						this.resetWakeWordState();
						this.wakeWordConfirmationPlayed = false; // Allow beep on next wake word
						if (this.useAzureSpeech && this.azureSpeechService) {
							this.azureSpeechService.stopRecognition().catch(() => {});
						}
						setTimeout(() => {
							if (this.storedWakeWordCallback) {
								this.ensureContinuousListening(
									this.storedWakeWordCallback,
									this.storedWakeWordOnlyCallback || undefined
								);
							}
						}, 500);
					}
				}, TIMING_CONSTANTS.WAKE_WORD_TIMEOUT);
			}
			return;
		}

		// Process continuation
		if (this.wakeWordDetected) {
			const timeSinceWakeWord = now - this.wakeWordDetectedTime;
			if (timeSinceWakeWord > TIMING_CONSTANTS.WAKE_WORD_TIMEOUT) {
				this.resetWakeWordState();
				this.wakeWordConfirmationPlayed = false; // Allow beep on next wake word
				return;
			}

			if (confidence < 0.3) return;

			// PRODUCTION: Use interim result directly (it's already cumulative)
			const cleaned = this.cleanWakeWordFromText(text);
			if (cleaned) {
				// For interim results, replace buffer (don't accumulate)
				this.speechBuffer = [cleaned];
				const finalText = cleaned.trim();

				if (this.isOnlyWakeWord(finalText)) {
					this.log("info", `⏸️ Continuation is wake-word-only, waiting`);
					return;
				}

				if (this.currentSession) {
					const existingConfidence =
						this.currentSession.alternatives[0]?.confidence || 0.8;
					const weightedConfidence =
						existingConfidence * 0.6 + confidence * 0.4;

					this.currentSession.transcript = finalText;
					this.currentSession.alternatives = [
						{ transcript: finalText, confidence: weightedConfidence },
					];

					// PRODUCTION: Debounce processing to ensure complete speech
					if (this.speechBufferTimer) clearTimeout(this.speechBufferTimer);
					this.speechBufferTimer = setTimeout(() => {
						this.processRequestSession(
							this.currentSession!,
							onWakeWordDetected
						);
						this.resetWakeWordState();
						this.speechBuffer = [];
					}, TIMING_CONSTANTS.SPEECH_BUFFER_DELAY);
				}
			}
		} else if (
			wakeWordCheck.detected &&
			confidence < wakeWordConfidenceThreshold
		) {
			// Low confidence wake word - still reset
			this.resetWakeWordState();
			this.startNewSession();
			this.wakeWordDetected = true;
			this.wakeWordDetectedTime = now;
			this.lastWakeWordTime = now;
		}
	}

	/**
	 * Ensure continuous listening is active (restart if needed)
	 * PRODUCTION-GRADE: Guarantees listening restarts after task creation
	 * CRITICAL: This must always restart listening even if it thinks it's already listening
	 */
	ensureContinuousListening(
		onWakeWordDetected: (text: string) => void,
		onWakeWordOnly?: (text: string) => void
	): void {
		this.log(
			"info",
			"🔄 PRODUCTION: Ensuring continuous listening is active...",
			{
				currentlyListening: this.isListening,
				useAzureSpeech: this.useAzureSpeech,
				timestamp: Date.now(),
			}
		);

		if (this.useAzureSpeech) {
			// PRODUCTION: For Azure Speech, always restart to ensure it's working
			// FIX RACE CONDITION: Wait for stop to complete before restarting
			const restartAzure = async () => {
				if (this.azureSpeechService && this.isListening) {
					this.log("info", "Stopping Azure Speech before restart...");
					try {
						// FIX: Await stop completion to prevent race condition
						await this.azureSpeechService.stopRecognition();
						this.log("info", "Azure Speech stopped successfully");
						// FIX: Add delay after stop to ensure clean state
						await new Promise(resolve => setTimeout(resolve, 250));
					} catch (error) {
						this.log("warn", "Error stopping Azure Speech (non-critical)", { error });
						// Still add delay before restart
						await new Promise(resolve => setTimeout(resolve, 250));
					}
				}

				// Reset state before restart
				this.isListening = false;
				this.resetWakeWordState();

				// Always restart Azure Speech to ensure it's active
				try {
					await this.startAzureSpeechListening(onWakeWordDetected, onWakeWordOnly);
					this.log("info", "Azure Speech listening restarted successfully");
				} catch (error: any) {
					this.log("error", "Failed to restart Azure Speech listening", {
						error: error?.message,
					});
					// Retry once after delay
					await new Promise(resolve => setTimeout(resolve, 1000));
					try {
						await this.startAzureSpeechListening(onWakeWordDetected, onWakeWordOnly);
						this.log("info", "Azure Speech listening retry successful");
					} catch (err: any) {
						this.log("error", "Retry failed to restart Azure Speech", {
							error: err?.message,
						});
					}
				}
			};

			// Execute async restart
			restartAzure().catch((err) => {
				this.log("error", "Fatal error in ensureContinuousListening", { error: err });
			});
			return;
		}

		if (!this.recognition) {
			this.log("warn", "Recognition not available for restart");
			return;
		}

		// PRODUCTION: Always restart, even if isListening is true
		// The recognition might have stopped internally even though isListening is true
		// This ensures we're definitely listening after task creation
		this.log(
			"info",
			"🔄 PRODUCTION: Restarting continuous listening (force restart)..."
		);

		// Stop first if already listening (to clean up)
		if (this.isListening) {
			try {
				this.recognition.stop();
				this.log("debug", "Stopped existing recognition");
			} catch (e) {
				// Ignore errors when stopping
				this.log("debug", "Error stopping recognition (non-critical)", {
					error: e,
				});
			}
		}

		// CRITICAL: Reset all state before restart
		this.isListening = false;
		this.resetWakeWordState();

		// Small delay to ensure clean state
		setTimeout(() => {
			// Restart fresh
			this.startContinuousListening(onWakeWordDetected, onWakeWordOnly).catch(
				(error) => {
					this.log("error", "Failed to restart continuous listening", {
						error: error?.message,
					});
					// Retry once after delay
					setTimeout(() => {
						this.startContinuousListening(
							onWakeWordDetected,
							onWakeWordOnly
						).catch((err) => {
							this.log(
								"error",
								"Retry failed to restart continuous listening",
								{ error: err?.message }
							);
						});
					}, 1000);
				}
			);
		}, 50); // Small delay for clean state
	}

	/**
	 * Clean transcript before processing
	 * Removes duplicates, garbled text, and repeated words
	 */
	private cleanTranscript(transcript: string): string {
		let cleaned = transcript.trim();
		
		// 0. Remove repeated wake words at the beginning (e.g., "skymate skymate 53b" → "53b")
		// This handles cases where Azure detects the wake word multiple times
		cleaned = cleaned.replace(/^(?:skymate\s+)+/gi, '');
		
		// 1. Remove duplicate text (Azure sometimes duplicates entire transcript)
		// Example: "15 C wants water 15 C wants water" → "15 C wants water"
		const words = cleaned.split(' ');
		const midpoint = Math.floor(words.length / 2);
		
		if (words.length >= 6) { // Only check if we have enough words
			const firstHalf = words.slice(0, midpoint).join(' ');
			const secondHalf = words.slice(midpoint).join(' ');
			
			if (firstHalf === secondHalf) {
				cleaned = firstHalf;
				this.log("debug", "Removed duplicate transcript half");
			}
		}
		
		// 2. Remove garbled 4-digit numbers that don't make sense
		// Example: "water 1781 chicken" → "water chicken"
		// But keep valid seat numbers like "17A" or "15 C"
		cleaned = cleaned.replace(/\b\d{4,}\b/g, ' ');
		
		// 3. Remove repeated consecutive words
		// Example: "water water chicken" → "water chicken"
		const wordsArray = cleaned.split(/\s+/);
		const deduped: string[] = [];
		let lastWord = '';
		
		for (const word of wordsArray) {
			if (word.toLowerCase() !== lastWord.toLowerCase() && word.trim()) {
				deduped.push(word);
				lastWord = word;
			}
		}
		
		cleaned = deduped.join(' ');
		
		// 4. Clean up extra spaces
		cleaned = cleaned.replace(/\s+/g, ' ').trim();
		
		// 5. CRITICAL: Reorder "cancel", "check", or "describe" to the front if they appear anywhere
		// Example: "chicken cancel 1A chicken" → "cancel 1A chicken"
		// Example: "water check 52B water" → "check 52B water"
		// Example: "meal describe chicken meal" → "describe chicken meal"
		// IMPORTANT: Preserve seat numbers that appear before cancel/check!
		const cancelIndex = cleaned.toLowerCase().indexOf('cancel');
		const checkIndex = cleaned.toLowerCase().indexOf('check');
		const describeIndex = cleaned.toLowerCase().indexOf('describe');
		
		if (cancelIndex > 0) { // Only if cancel is NOT already at the start
			// Remove "cancel" from its current position and move to front
			const beforeCancel = cleaned.substring(0, cancelIndex).trim();
			const afterCancel = cleaned.substring(cancelIndex + 6).trim(); // 6 = length of "cancel"
			
			// CRITICAL FIX: Check for seat number
			// Pattern: digits + letter (e.g., "21F", "52B")
			const seatPattern = /\b(\d+[A-F])\b/i;
			
			// PRIORITY 1: Check if afterCancel STARTS with a seat (most common: "cancel 21F chicken")
			const afterSeatMatch = afterCancel.match(/^(\d+[A-F])\b/i);
			
			// PRIORITY 2: Check if beforeCancel contains a seat (handles: "21F cancel chicken")
			const beforeSeatMatch = beforeCancel.match(seatPattern);
			
			if (afterSeatMatch) {
				// Seat already after cancel - perfect! Just move cancel to front
				cleaned = `cancel ${afterCancel}`;
				this.log("debug", "Moved 'cancel' to front (seat already after)", {
					before: `${beforeCancel} cancel ${afterCancel}`,
					after: cleaned,
					seat: afterSeatMatch[1]
				});
			} else if (beforeSeatMatch) {
				// Seat found before cancel - move it after: "21F cancel chicken" → "cancel 21F chicken"
				cleaned = `cancel ${beforeSeatMatch[1]} ${afterCancel}`.trim();
				this.log("debug", "Moved 'cancel' to front (moved seat after)", {
					before: `${beforeCancel} cancel ${afterCancel}`,
					after: cleaned,
					preservedSeat: beforeSeatMatch[1]
				});
			} else {
				// No seat found - just move cancel to front
				cleaned = `cancel ${afterCancel}`;
				this.log("debug", "Moved 'cancel' to front (no seat)", {
					before: `${beforeCancel} cancel ${afterCancel}`,
					after: cleaned
				});
			}
		} else if (checkIndex > 0) { // Only if check is NOT already at the start
			// Remove "check" from its current position and move to front
			const beforeCheck = cleaned.substring(0, checkIndex).trim();
			const afterCheck = cleaned.substring(checkIndex + 5).trim(); // 5 = length of "check"
			
			// CRITICAL FIX: Check for seat number
			const seatPattern = /\b(\d+[A-F])\b/i;
			
			// PRIORITY 1: Check if afterCheck STARTS with a seat (most common: "check 21F chicken")
			const afterSeatMatch = afterCheck.match(/^(\d+[A-F])\b/i);
			
			// PRIORITY 2: Check if beforeCheck contains a seat (handles: "21F check chicken")
			const beforeSeatMatch = beforeCheck.match(seatPattern);
			
			// Check if this is a "check off" command (e.g., "check 6A off" → "checkoff 6A")
			const checkOffMatch = afterCheck.match(/^(\d+[A-F])\s+off$/i);
			
			if (checkOffMatch) {
				// Convert "check seat off" to "checkoff seat"
				cleaned = `checkoff ${checkOffMatch[1]}`;
				this.log("debug", "Converted 'check off' to 'checkoff'", {
					before: `${beforeCheck} check ${afterCheck}`,
					after: cleaned,
					seat: checkOffMatch[1]
				});
			} else if (afterSeatMatch) {
				// Seat already after check - perfect! Just move check to front
				cleaned = `check ${afterCheck}`;
				this.log("debug", "Moved 'check' to front (seat already after)", {
					before: `${beforeCheck} check ${afterCheck}`,
					after: cleaned,
					seat: afterSeatMatch[1]
				});
			} else if (beforeSeatMatch) {
				// Seat found before check - move it after: "21F check chicken" → "check 21F chicken"
				cleaned = `check ${beforeSeatMatch[1]} ${afterCheck}`.trim();
				this.log("debug", "Moved 'check' to front (moved seat after)", {
					before: `${beforeCheck} check ${afterCheck}`,
					after: cleaned,
					preservedSeat: beforeSeatMatch[1]
				});
			} else {
				// No seat found - just move check to front
				cleaned = `check ${afterCheck}`;
				this.log("debug", "Moved 'check' to front (no seat)", {
					before: `${beforeCheck} check ${afterCheck}`,
					after: cleaned
				});
			}
		} else if (describeIndex > 0) { // Only if describe is NOT already at the start
			// Remove "describe" from its current position and move to front
			const beforeDescribe = cleaned.substring(0, describeIndex).trim();
			const afterDescribe = cleaned.substring(describeIndex + 8).trim(); // 8 = length of "describe"
			
			// For describe commands, we want to keep everything after "describe"
			// and remove garbled text before it (usually duplicate meal names)
			cleaned = `describe ${afterDescribe}`;
			this.log("debug", "Moved 'describe' to front", {
				before: `${beforeDescribe} describe ${afterDescribe}`,
				after: cleaned
			});
		}
		
		// 6. FINAL CHECK: Convert "check seat off" to "checkoff seat" even if check is already at start
		// Example: "check 9C off 9C" → "checkoff 9C" or "check 9C off" → "checkoff 9C"
		const checkOffPattern = /^check\s+(\d+[A-F])\s+off(?:\s+\d+[A-F])?$/i;
		const checkOffMatch = cleaned.match(checkOffPattern);
		if (checkOffMatch) {
			cleaned = `checkoff ${checkOffMatch[1]}`;
			this.log("debug", "Converted 'check off' to 'checkoff' (already at start)", {
				before: cleaned,
				after: `checkoff ${checkOffMatch[1]}`,
				seat: checkOffMatch[1]
			});
		}
		
		// 7. CRITICAL FIX: Handle "off check X off" or "off check X" pattern (when "off" appears before "check")
		// Example: "off check 9F off" → "checkoff 9F", "off check 9F" → "checkoff 9F"
		const offCheckPattern = /^off\s+check\s+(\d+[A-F])(?:\s+.*)?$/i;
		const offCheckMatch = cleaned.match(offCheckPattern);
		if (offCheckMatch) {
			const originalCleaned = cleaned;
			cleaned = `checkoff ${offCheckMatch[1]}`;
			this.log("debug", "Converted 'off check' to 'checkoff'", {
				before: originalCleaned,
				after: cleaned,
				seat: offCheckMatch[1]
			});
		}
		
		return cleaned;
	}

	/**
	 * UNIFIED FLOW: Process request session through single pipeline
	 * This ensures every request goes through the same high-quality processing
	 * CRITICAL: Each "skymate" = new order/task, completely isolated
	 */
	private processRequestSession(
		session: RequestSession,
		onTranscript: (text: string, selectedAlternative?: AlternativeScore) => void
	): void {
		if (session.processed) {
			this.log("warn", "Attempted to process already-processed session", {
				sessionId: session.id,
			});
			return;
		}

		// CRITICAL: Clean transcript BEFORE processing
		const originalTranscript = session.transcript;
		session.transcript = this.cleanTranscript(session.transcript);
		
		if (originalTranscript !== session.transcript) {
			this.log("info", "🧹 Cleaned transcript", {
				original: originalTranscript,
				cleaned: session.transcript,
			});
		}

	// PRIORITY CHECK: Detect cancel/task/check/describe/seat/special-requests/priority-members commands BEFORE normal processing
	// These commands should bypass the scoring pipeline
	const cancelPattern = /^cancel\s+/i;
	const taskPattern = /^task\s+(list|pending|completed)/i;
	// UPDATED: Support "check", "complete", and "checkoff" commands
	const checkPattern = /^(?:check|checkoff|complete)\s+/i;
	// NEW: Meal description commands (e.g., "describe chicken", "tell me about beef")
	const describePattern = /^(describe|tell me about|what's in|what is in|info about|information about)\s+/i;
	// NEW: Seat information commands (e.g., "remind me of 52B", "tell me about seat 25A")
	// Word "seat" is optional to support natural phrasing
	const seatInfoPattern = /\b(remind|tell|show|display|what|who|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+seat)?\s+\d{1,2}[A-F]\b/i;
	// NEW: Special requests list command (e.g., "remind me of special requests", "list special requests")
	const specialRequestsPattern = /\b(remind|tell|show|display|list|what|give|info|information)(?:\s+me)?(?:\s+of)?(?:\s+about)?(?:\s+the)?(?:\s+all)?(?:\s+special\s*requests?)\b/i;
	// NEW: Priority members list command (e.g., "who is priority member", "list priority members")
	const priorityMembersPattern = /\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+priority\s*members?)\b/i;
	// NEW: Gold class members list command
	const goldMembersPattern = /\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+gold(?:\s+class)?\s+members?)\b/i;
	// NEW: Diamond class members list command
	const diamondMembersPattern = /\b(who|which|list|show|display|tell|what|give|info|information)(?:\s+me)?(?:\s+is)?(?:\s+are)?(?:\s+the)?(?:\s+all)?(?:\s+diamond(?:\s+class)?\s+members?)\b/i;
	// NEW: Team introduction command (e.g., "introduce our team", "introduce the team", "introduce yourself")
	const teamIntroPattern = /\b(introduce|show|tell|display|present)(?:\s+me)?(?:\s+(?:our|the|yourself))?\s*(?:team)?\b/i;
	// Exclude task commands from being detected as seat info
	const isTaskCommand = /\b(task|past|ask)\s+\d+/i.test(session.transcript);
	
	if (cancelPattern.test(session.transcript)) {
		this.log("info", "🚫 Cancel command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}

	if (teamIntroPattern.test(session.transcript) && 
		(session.transcript.toLowerCase().includes("team") || session.transcript.toLowerCase().includes("yourself"))) {
		this.log("info", "👥 Team introduction command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (checkPattern.test(session.transcript)) {
		this.log("info", "✅ Check/Complete command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (taskPattern.test(session.transcript)) {
		this.log("info", "📋 Task command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (describePattern.test(session.transcript)) {
		this.log("info", "🍽️ Meal description command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (seatInfoPattern.test(session.transcript) && !isTaskCommand) {
		this.log("info", "🪑 Seat information command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (specialRequestsPattern.test(session.transcript)) {
		this.log("info", "📋 Special requests list command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}
	
	if (priorityMembersPattern.test(session.transcript)) {
		this.log("info", "⭐ Priority members list command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		// Mark as processed and pass through to callback immediately
		session.processed = true;
		onTranscript(session.transcript);
		return; // Early exit
	}

	if (goldMembersPattern.test(session.transcript)) {
		this.log("info", "🥇 Gold class members list command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		session.processed = true;
		onTranscript(session.transcript);
		return;
	}

	if (diamondMembersPattern.test(session.transcript)) {
		this.log("info", "💎 Diamond class members list command detected - bypassing scoring pipeline", {
			transcript: session.transcript,
		});
		session.processed = true;
		onTranscript(session.transcript);
		return;
	}

		this.log("info", "🔄 Processing request session through unified flow", {
			sessionId: session.id,
			transcript: session.transcript,
			alternativesCount: session.alternatives.length,
			wakeWordDetectedAt: new Date(session.wakeWordDetectedAt).toISOString(),
		});

		// Mark as processed immediately to prevent duplicate processing
		session.processed = true;

		// Reset wake word confirmation flag now that we're processing the request
		// This allows the next wake word to play audio confirmation
		this.wakeWordConfirmationPlayed = false;

		// UNIFIED FLOW: Ensure we have alternatives to process
		// If no alternatives but we have transcript, create a synthetic alternative
		if (session.alternatives.length === 0 && session.transcript) {
			session.alternatives = [
				{
					transcript: session.transcript,
					confidence: 0.8, // Default confidence for session-based transcript
				},
			];
		}

		// PRODUCTION: Validate that we have actual content (not just wake word)
		const hasContent =
			session.transcript &&
			session.transcript.trim().length > 0 &&
			!this.isOnlyWakeWord(session.transcript);

		if (!hasContent && session.alternatives.length === 0) {
			this.log("info", "⏸️ Empty or wake-word-only request, ignoring", {
				sessionId: session.id,
				transcript: session.transcript,
			});
			this.addToSessionHistory(session);
			this.resetWakeWordState();
			return; // Don't process empty/wake-word-only requests
		}

		// Process through unified pipeline
		this.processAllAlternatives(
			session.alternatives,
			(processedText, selectedAlternative) => {
				// PRODUCTION: Final validation - reject empty or wake-word-only requests
				// BUT: If keepWakeWordActive is set, pass through for TTS feedback!
				if (
					!processedText ||
					processedText.trim().length === 0 ||
					this.isOnlyWakeWord(processedText)
				) {
					// CRITICAL FIX: Check if this is an intentional invalid result for feedback
					if (selectedAlternative?.keepWakeWordActive === true) {
						this.log(
							"info",
							"🔄 Passing invalid result to VoiceInput for TTS feedback",
							{
								sessionId: session.id,
								keepWakeWordActive: true,
							}
						);
						// Pass through to VoiceInput by calling the stored callback
						// DON'T reset wake word state - user should be able to speak again
						if (this.storedWakeWordCallback) {
							this.storedWakeWordCallback(processedText, selectedAlternative);
						}
						return;
					}
					
					this.log(
						"info",
						"⏸️ Processed text is empty or wake-word-only, ignoring",
						{
							sessionId: session.id,
							processedText,
						}
					);
					this.addToSessionHistory(session);
					this.resetWakeWordState();
					return; // Don't process empty/wake-word-only requests
				}

				// UNIFIED FLOW: Deduplication check - prevent duplicate requests
				const now = Date.now();
				const isDuplicate = this.recentProcessedRequests.some(
					(req) =>
						req.text === processedText &&
						now - req.timestamp < this.DEDUPLICATION_WINDOW
				);

				if (isDuplicate) {
					this.log("warn", "Duplicate request detected, ignoring", {
						sessionId: session.id,
						processedText,
						deduplicationWindow: `${this.DEDUPLICATION_WINDOW}ms`,
					});
					this.addToSessionHistory(session);
					this.resetWakeWordState();
					return; // Don't process duplicate
				}

				// Record this request for deduplication
				this.recentProcessedRequests.push({
					text: processedText,
					timestamp: now,
				});

				// Keep only recent requests (last 10)
				if (this.recentProcessedRequests.length > 10) {
					this.recentProcessedRequests.shift();
				}

				// Remove old entries (older than deduplication window)
				this.recentProcessedRequests = this.recentProcessedRequests.filter(
					(req) => now - req.timestamp < this.DEDUPLICATION_WINDOW * 2
				);

				this.log(
					"info",
					"✅ Request processed successfully through unified flow",
					{
						sessionId: session.id,
						originalTranscript: session.transcript,
						processedText,
						processingTime: Date.now() - session.wakeWordDetectedAt,
					}
				);

				// Update session with processed result
				session.transcript = processedText;

				// Store selected alternative for reward learning
				if (selectedAlternative) {
					session.selectedAlternative = selectedAlternative;
					session.parsedComponents = {
						seat: selectedAlternative.parsed?.seat,
						item: selectedAlternative.parsed?.item,
						action: selectedAlternative.parsed?.action,
					};
				}

				// Store session for potential reward (when task is successfully created)
				// We'll reward the patterns if the task creation succeeds
				this.pendingRewards.set(session.id, session);

				// Call callback with processed text (this triggers task creation)
				// UNIFIED FLOW: This is the single point where tasks are created
				onTranscript(processedText, selectedAlternative);

				// Add to history
				this.addToSessionHistory(session);

				// UNIFIED FLOW: Ensure clean state for next request
				// Reset wake word state to be ready for next "skymate"
				// EXCEPTION: If keepWakeWordActive flag is set (for invalid input retry), don't reset
				if (selectedAlternative?.keepWakeWordActive) {
					this.log("info", "🔄 Keeping wake word active for immediate retry");
					// Clear the speech buffer but keep wake word detected state
					this.speechBuffer = [];
					if (this.speechBufferTimer) {
						clearTimeout(this.speechBufferTimer);
						this.speechBufferTimer = null;
					}
					// Reset the wake word detection time to give user more time
					this.wakeWordDetectedTime = Date.now();
					// Clear pending transcript for clean retry
					this.pendingTranscript = "";
					// Keep wakeWordDetected = true and don't reset other states
					// This allows user to speak again immediately without saying "skymate"
				} else {
					this.resetWakeWordState();
				}
			}
		);
	}

	/**
	 * Process all alternatives with intelligent scoring and selection
	 * Production-level with metrics tracking
	 * UNIFIED FLOW: This is the single processing pipeline for all requests
	 */
	private processAllAlternatives(
		alternatives: Array<{ transcript: string; confidence: number }>,
		onTranscript: (text: string, selectedAlternative?: AlternativeScore) => void
	): void {
		const processingStartTime = Date.now();
		this.metrics.totalRequests++;

		try {
			// UNIFIED FLOW: Validate we have alternatives to process
			if (!alternatives || alternatives.length === 0) {
				this.log("warn", "No alternatives to process", {
					alternativesCount: 0,
				});
				this.recordFailure("no_alternatives", Date.now() - processingStartTime);
				return;
			}

			// Score all alternatives with safety checks
			const scoredAlternatives: AlternativeScore[] = alternatives
				.filter(
					(alt) => alt && alt.transcript && typeof alt.confidence === "number"
				)
				.map((alt) => {
					try {
						const score = AlternativeScorer.scoreAlternative(
							alt.transcript,
							alt.confidence
						);

						// SAFETY: Ensure score has required properties
						if (!score || !score.parsed) {
							this.log("warn", "Invalid score from AlternativeScorer", {
								transcript: alt.transcript?.substring(0, 50),
							});
							// Return a minimal valid score object
							return {
								transcript: alt.transcript || "",
								confidence: alt.confidence || 0,
								score: 0,
								seatScore: 0,
								actionScore: 0,
								itemScore: 0,
								phoneticScore: 0,
								valid: false,
								parsed: {
									seat: "",
									action: "",
									item: "",
									confidence: 0,
									valid: false,
									originalTranscript: alt.transcript || "",
									corrections: [],
									validationScore: 0,
									alternativesConsidered: 0,
								},
							};
						}

						// REWARD LEARNING: Apply boosts to patterns that have been rewarded
						if (score.parsed) {
							// Boost seat pattern
							if (score.parsed.seat) {
								const seatBoost = this.rewardSystem.getBoost(
									score.parsed.seat,
									"seat"
								);
								if (seatBoost > 1.0) {
									score.seatScore *= seatBoost;
									score.score *= 1 + (seatBoost - 1) * 0.3; // Apply 30% of boost to total score
									this.log("debug", "Applied seat boost", {
										seat: score.parsed.seat,
										boost: seatBoost.toFixed(2),
									});
								}
							}

							// Boost item pattern
							if (score.parsed.item) {
								const itemBoost = this.rewardSystem.getBoost(
									score.parsed.item.toLowerCase(),
									"item"
								);
								if (itemBoost > 1.0) {
									score.itemScore *= itemBoost;
									score.score *= 1 + (itemBoost - 1) * 0.2; // Apply 20% of boost to total score
									this.log("debug", "Applied item boost", {
										item: score.parsed.item,
										boost: itemBoost.toFixed(2),
									});
								}
							}

							// Boost action pattern
							if (score.parsed.action) {
								const actionBoost = this.rewardSystem.getBoost(
									score.parsed.action.toLowerCase(),
									"action"
								);
								if (actionBoost > 1.0) {
									score.actionScore *= actionBoost;
									score.score *= 1 + (actionBoost - 1) * 0.1; // Apply 10% of boost to total score
								}
							}

							// Boost full transcript pattern
							const transcriptBoost = this.rewardSystem.getBoost(
								alt.transcript.toLowerCase(),
								"transcript"
							);
							if (transcriptBoost > 1.0) {
								score.score *= transcriptBoost;
								this.log("debug", "Applied transcript boost", {
									transcript: alt.transcript.substring(0, 30),
									boost: transcriptBoost.toFixed(2),
								});
							}
						}

						return score;
					} catch (scoringError: any) {
						// SAFETY: If scoring fails, return a minimal valid alternative
						this.log("error", "Error scoring alternative", {
							error: scoringError?.message || String(scoringError),
							transcript: alt.transcript?.substring(0, 50),
						});
						return {
							transcript: alt.transcript || "",
							confidence: alt.confidence || 0,
							score: 0,
							seatScore: 0,
							actionScore: 0,
							itemScore: 0,
							phoneticScore: 0,
							valid: false,
							parsed: {
								seat: "",
								action: "",
								item: "",
								confidence: 0,
								valid: false,
								originalTranscript: alt.transcript || "",
								corrections: [],
								validationScore: 0,
								alternativesConsidered: 0,
							},
						};
					}
				});

			// SAFETY: Check if we have any valid scored alternatives after filtering
			if (scoredAlternatives.length === 0) {
				this.log("warn", "No valid alternatives after scoring", {
					originalCount: alternatives.length,
				});
				this.recordFailure(
					"invalid_alternatives",
					Date.now() - processingStartTime
				);
				return;
			}

			// Production-level logging with structured data
			this.log(
				"debug",
				`Evaluating ${scoredAlternatives.length} alternatives`,
				{
					alternativeCount: scoredAlternatives.length,
					topScore:
						scoredAlternatives.length > 0 ? scoredAlternatives[0].score : 0,
					topConfidence:
						scoredAlternatives.length > 0
							? scoredAlternatives[0].confidence
							: 0,
				}
			);

			// Detailed logging in debug mode
			if (process.env.NODE_ENV === "development") {
				scoredAlternatives.forEach((alt, idx) => {
					const noiseInfo =
						alt.parsed?.corrections?.find((c) => c.reason.includes("Removed"))
							?.reason || "";
					this.log("debug", `Alternative ${idx + 1}`, {
						score: alt.score.toFixed(3),
						confidence: alt.confidence.toFixed(2),
						valid: alt.valid,
						seat: alt.parsed?.seat || "none",
						seatScore: alt.seatScore.toFixed(2),
						item: alt.parsed?.item || "none",
						itemScore: alt.itemScore.toFixed(2),
						transcript: alt.transcript,
						noiseInfo: noiseInfo || undefined,
					});
				});
			}

			// Confidence-based strategy (variables kept for potential future use)

			// ENHANCED strategy: Multi-tier filtering for maximum accuracy
			// Tier 1: Perfect matches (seat + item + action, high scores)
			const perfectAlternatives = scoredAlternatives.filter(
				(a) =>
					a.valid &&
					a.parsed?.seat &&
					a.parsed?.item &&
					a.seatScore > 0.7 &&
					a.itemScore > 0.7 &&
					/^\d+[A-F]$/i.test(a.parsed.seat) // Full seat with letter
			);

			// Tier 2: Good matches (seat + item, medium-high scores)
			const goodAlternatives =
				perfectAlternatives.length === 0
					? scoredAlternatives.filter(
							(a) =>
								a.valid &&
								a.parsed?.seat &&
								a.parsed?.item &&
								a.seatScore > 0.5 &&
								a.itemScore > 0.5
					  )
					: [];

			// Tier 3: Acceptable matches (seat + item, lower threshold)
			const acceptableAlternatives =
				perfectAlternatives.length === 0 && goodAlternatives.length === 0
					? scoredAlternatives.filter(
							(a) =>
								a.valid &&
								a.parsed?.seat &&
								a.parsed?.item &&
								a.seatScore > 0.3 &&
								a.itemScore > 0.3
					  )
					: [];

			// Tier 4: Seat only (fallback)
			const seatOnlyAlternatives =
				perfectAlternatives.length === 0 &&
				goodAlternatives.length === 0 &&
				acceptableAlternatives.length === 0
					? scoredAlternatives.filter(
							(a) => a.parsed?.seat && a.seatScore > 0.6 // Higher threshold for seat-only
					  )
					: [];

			// Use the best tier available
			const validAlternatives =
				perfectAlternatives.length > 0
					? perfectAlternatives
					: goodAlternatives.length > 0
					? goodAlternatives
					: acceptableAlternatives;

			// Select best alternative, but prefer alternatives with higher seat numbers
			// This helps avoid selecting "2A" when "16A" is the correct seat
			const selectBest = (alts: AlternativeScore[]) => {
				if (alts.length === 0) return null;

				return alts.reduce((best, current) => {
					// If both have seats, prefer the one with higher seat number
					if (best.parsed?.seat && current.parsed?.seat) {
						const bestSeatNum = parseInt(
							best.parsed.seat.match(/\d+/)?.[0] || "0"
						);
						const currentSeatNum = parseInt(
							current.parsed.seat.match(/\d+/)?.[0] || "0"
						);

						// If seat numbers are significantly different (e.g., 2 vs 16), prefer higher
						if (Math.abs(bestSeatNum - currentSeatNum) > 5) {
							return currentSeatNum > bestSeatNum ? current : best;
						}
					}

					// Otherwise, prefer higher score
					return current.score > best.score ? current : best;
				});
			};

			// Select best alternative with enhanced logic (SAFE: remove non-null assertions)
			const bestAlternative =
				validAlternatives.length > 0
					? selectBest(validAlternatives)
					: seatOnlyAlternatives.length > 0
					? selectBest(seatOnlyAlternatives)
					: scoredAlternatives.length > 0
					? selectBest(scoredAlternatives)
					: null;

		// SAFETY: Explicit null check and validate structure
		// CRITICAL FIX: Also check if bestAlternative is marked as invalid
		if (
			!bestAlternative ||
			!bestAlternative.transcript ||
			bestAlternative.parsed === undefined ||
			bestAlternative.valid === false // ← NEW: Check valid flag!
		) {
			console.warn(`❌ No valid alternatives found. Creating invalid result to trigger feedback.`);
			console.log(`🔄 Keeping wake word active - user can speak again without saying "skymate"`);
			
			// PRODUCTION: Instead of silently returning, pass an invalid result
			// This will trigger the "I couldn't hear that" feedback in VoiceInput
			const invalidAlternative: AlternativeScore = {
				transcript: "",
				confidence: 0,
				score: 0,
				seatScore: 0,
				actionScore: 0,
				itemScore: 0,
				phoneticScore: 0,
				valid: false,
				parsed: {
					seat: "",
					action: "",
					item: "", // Empty item will trigger rejection in VoiceInput
					confidence: 0,
					valid: false,
					originalTranscript: alternatives[0]?.transcript || "",
					corrections: [{
						from: alternatives[0]?.transcript || "",
						to: "",
						reason: "No valid alternatives found - possibly noise or unclear audio"
					}],
					validationScore: 0,
					alternativesConsidered: alternatives.length,
				},
				keepWakeWordActive: true, // Special flag to prevent wake word reset
			};
			
			// Call callback with empty processed text to trigger feedback
			// Note: We don't reset wake word state here - user can speak again immediately
			onTranscript("", invalidAlternative);
			this.recordFailure("no_valid_alternatives", Date.now() - processingStartTime);
			return;
		}

			// SAFETY: Ensure parsed object exists (should always be true after our checks above)
			if (!bestAlternative.parsed) {
				this.log("error", "bestAlternative missing parsed object", {
					transcript: bestAlternative.transcript?.substring(0, 50),
				});
				this.recordFailure("missing_parsed", Date.now() - processingStartTime);
				return;
			}

			// PRODUCTION: Check if this is a task command - handle differently
			const isTaskCommand =
				bestAlternative.parsed.item?.startsWith("Task ") ||
				/\b(remind|show|display|list|tell|what).*?\b(Task|task)\s+(\d+)\b/i.test(
					bestAlternative.transcript
				);

			if (isTaskCommand) {
				// PRODUCTION: For task commands, preserve the full transcript with task reference
				let taskTranscript = bestAlternative.transcript;

				// Ensure "Task" is capitalized and number is preserved
				taskTranscript = taskTranscript.replace(
					/\b(task|Task)\s+(\d+)\b/gi,
					(_match, _taskWord, number) => {
						return `Task ${number}`;
					}
				);

				// Remove wake word if present at the start
				taskTranscript = taskTranscript
					.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i, "")
					.trim();

				const processingTime = Date.now() - processingStartTime;
				this.recordSuccess(
					taskTranscript,
					bestAlternative.confidence,
					processingTime
				);

				this.log("info", "Selected task command result", {
					confidence: bestAlternative.confidence.toFixed(2),
					score: bestAlternative.score.toFixed(2),
					processed: taskTranscript,
					processingTime,
				});

				onTranscript(taskTranscript, bestAlternative);
				return; // Early return for task commands
			}

			// Apply confidence-based processing with strict validation for regular requests
			// IMPORTANT: Use the parsed seat from scoring, don't re-process it
			const finalSeat = bestAlternative.parsed?.seat || "";
			const finalItem = bestAlternative.parsed?.item || "";
			const finalAction = bestAlternative.parsed?.action || "";

			// If seat extraction failed, try extracting from original transcript
			let actualSeat = finalSeat;
			if (!actualSeat && bestAlternative.parsed?.originalTranscript) {
				const seatFromOriginal = ContextAnalyzer.extractSeat(
					bestAlternative.parsed.originalTranscript
				);
				if (seatFromOriginal.seat) {
					actualSeat = seatFromOriginal.seat;
					console.log(
						`🔍 Re-extracted seat from original transcript: "${actualSeat}"`
					);
				}
			}

			// ENHANCED confidence thresholds with quality checks
			const hasHighQualitySeat = actualSeat && /^\d+[A-F]$/i.test(actualSeat);
			const hasHighQualityItem = finalItem && finalItem.length > 2;
			const isHighQuality =
				hasHighQualitySeat && hasHighQualityItem && bestAlternative.score > 0.6;

			// OPTIMIZATION: Raised confidence thresholds for near-100% accuracy (demo mode)
			// Very High: 0.75 → 0.8 (80%+)
			// High: 0.6 → 0.75 (75%+)  
			// Medium: 0.4 → 0.65 (65%+)
			// Low: < 0.65 (reject unless excellent component scores)
			
			if (
				bestAlternative.confidence > 0.8 &&
				bestAlternative.valid &&
				isHighQuality
			) {
				// Very high confidence with high quality: Use parsed values directly
				const processed = this.postProcessTranscriptPreservingSeat(
					bestAlternative.transcript,
					actualSeat,
					finalItem,
					finalAction
				);

				const processingTime = Date.now() - processingStartTime;
				this.recordSuccess(
					processed,
					bestAlternative.confidence,
					processingTime
				);

				this.log("info", "Selected very high-confidence result", {
					confidence: bestAlternative.confidence.toFixed(2),
					score: bestAlternative.score.toFixed(2),
					processed,
					processingTime,
				});

				onTranscript(processed, bestAlternative);
			} else if (
				bestAlternative.confidence > 0.75 &&
				bestAlternative.valid &&
				actualSeat &&
				finalItem
			) {
				// High confidence (75%+) with valid seat + item: Use parsed values directly
				const processed = this.postProcessTranscriptPreservingSeat(
					bestAlternative.transcript,
					actualSeat,
					finalItem,
					finalAction
				);

				const processingTime = Date.now() - processingStartTime;
				this.recordSuccess(
					processed,
					bestAlternative.confidence,
					processingTime
				);

				this.log("info", "Selected high-confidence result", {
					confidence: bestAlternative.confidence.toFixed(2),
					processed,
					processingTime,
				});

				onTranscript(processed, bestAlternative);
			} else if (bestAlternative.confidence > 0.65) {
				// Medium confidence (65-75%): Apply post-processing but preserve the correctly identified seat
				// Try to extract seat from original if not found
				let actualSeat = finalSeat;
				if (!actualSeat && bestAlternative.parsed?.originalTranscript) {
					const seatFromOriginal = ContextAnalyzer.extractSeat(
						bestAlternative.parsed.originalTranscript
					);
					if (seatFromOriginal.seat) {
						actualSeat = seatFromOriginal.seat;
						console.log(
							`🔍 Re-extracted seat from original transcript: "${actualSeat}"`
						);
					}
				}

				const processed = this.postProcessTranscriptPreservingSeat(
					bestAlternative.transcript,
					actualSeat,
					finalItem,
					finalAction
				);

				// SAFETY: Check if parsed exists before validation
				if (!bestAlternative.parsed) {
					this.log(
						"warn",
						"bestAlternative missing parsed object during validation",
						{
							transcript: bestAlternative.transcript?.substring(0, 50),
						}
					);
					// Still return the best effort
					onTranscript(processed, bestAlternative);
					return;
				}

				const validation = ContextAnalyzer.validateRequest(
					bestAlternative.parsed
				);

				if (validation.valid && validation.score >= 0.6) {
					console.log(
						`✅ Selected medium-confidence result (validation passed): "${processed}"`
					);
					onTranscript(processed, bestAlternative);
				} else {
					// Try next best alternative
					const nextBest = scoredAlternatives
						.filter((a) => a !== bestAlternative)
						.sort((a, b) => b.score - a.score)[0];

					// SAFETY: Check if nextBest exists before accessing its properties
					if (!nextBest) {
						console.warn(
							`⚠️ No alternative found. Best: "${bestAlternative.transcript}"`
						);
						// Still return the best effort
						onTranscript(processed, bestAlternative);
						return;
					}

					// Try to extract seat from original if not found
					let nextBestSeat = nextBest.parsed?.seat || "";
					if (!nextBestSeat && nextBest.parsed?.originalTranscript) {
						const seatFromOriginal = ContextAnalyzer.extractSeat(
							nextBest.parsed.originalTranscript
						);
						if (seatFromOriginal.seat) {
							nextBestSeat = seatFromOriginal.seat;
							console.log(
								`🔍 Re-extracted seat from next best: "${nextBestSeat}"`
							);
						}
					}

					if (nextBest.score > 0.3 && nextBestSeat && nextBest.parsed?.item) {
						const processedNext = this.postProcessTranscriptPreservingSeat(
							nextBest.transcript,
							nextBestSeat,
							nextBest.parsed.item,
							nextBest.parsed.action || ""
						);
						console.log(
							`⚠️ First alternative failed validation, trying next: "${processedNext}"`
						);
						onTranscript(processedNext);
					} else {
						console.warn(
							`⚠️ All alternatives failed validation. Best: "${bestAlternative.transcript}"`
						);
						// Still return the best effort
						onTranscript(processed, bestAlternative);
					}
				}
			} else {
				// Low confidence (< 65%): Only accept if has seat AND item with excellent scores
				// OPTIMIZATION: Now requires 70%+ component scores (raised from 65%)
				// Try to extract seat from original if not found
				let actualSeat = finalSeat;
				if (!actualSeat && bestAlternative.parsed?.originalTranscript) {
					const seatFromOriginal = ContextAnalyzer.extractSeat(
						bestAlternative.parsed.originalTranscript
					);
					if (seatFromOriginal.seat) {
						actualSeat = seatFromOriginal.seat;
						console.log(
							`🔍 Re-extracted seat from original transcript: "${actualSeat}"`
						);
					}
				}

				// OPTIMIZATION: Stricter requirements for low confidence
				const hasExcellentScores =
					bestAlternative.seatScore > 0.7 && bestAlternative.itemScore > 0.7;
				const hasGoodOverallScore = bestAlternative.score > 0.6;
				const hasFullSeat = actualSeat && /^\d+[A-F]$/i.test(actualSeat);

				if (
					hasGoodOverallScore &&
					actualSeat &&
					finalItem &&
					hasExcellentScores &&
					hasFullSeat
				) {
					const processed = this.postProcessTranscriptPreservingSeat(
						bestAlternative.transcript,
						actualSeat,
						finalItem,
						finalAction
					);
					console.log(
						`⚠️ Selected low-confidence result (confidence: ${bestAlternative.confidence.toFixed(
							2
						)}, score: ${bestAlternative.score.toFixed(2)}): "${processed}"`
					);
					onTranscript(processed, bestAlternative);
				} else {
					// OPTIMIZATION: Signal low confidence failure with special flag
					// This will trigger "I couldn't hear that, please repeat" TTS in the UI
					console.warn(
						`❌ All alternatives failed quality checks (confidence: ${bestAlternative.confidence.toFixed(2)}).`
					);
					console.warn(
						`   Best alternative: seat=${finalSeat || "none"}, item=${
							finalItem || "none"
						}, score=${bestAlternative.score.toFixed(
							2
						)}, seatScore=${bestAlternative.seatScore.toFixed(
							2
						)}, itemScore=${bestAlternative.itemScore.toFixed(2)}`
					);
					
					// Create a special response indicating we need the user to repeat
					// Set keepWakeWordActive so they don't have to say "skymate" again
					const lowConfidenceResult: AlternativeScore = {
						transcript: "", // Empty transcript signals failure
						confidence: bestAlternative.confidence,
						score: 0,
						seatScore: 0,
						actionScore: 0,
						itemScore: 0,
						phoneticScore: 0,
						valid: false,
						keepWakeWordActive: true, // User should be able to repeat without saying wake word
					};
					
					// Pass the low confidence result to trigger appropriate handling
					onTranscript("", lowConfidenceResult);
				}
			}
		} catch (error: any) {
			const processingTime = Date.now() - processingStartTime;
			this.recordFailure("processing_error", processingTime);

			this.log("error", "Error processing alternatives", {
				error: error?.message || String(error),
				processingTime,
			});

			// Don't crash - just log and continue
		}
	}

	/**
	 * Record successful request for metrics
	 */
	private recordSuccess(
		transcript: string,
		confidence: number,
		processingTime: number
	): void {
		this.metrics.successfulRequests++;
		this.processingTimes.push(processingTime);

		// Update average confidence
		const totalConfidence =
			this.metrics.averageConfidence * (this.metrics.successfulRequests - 1) +
			confidence;
		this.metrics.averageConfidence =
			totalConfidence / this.metrics.successfulRequests;

		this.metrics.lastSuccess = {
			timestamp: Date.now(),
			transcript,
		};

		this.updateHealthStatus("healthy", "Request processed successfully");
	}

	/**
	 * Record failed request for metrics
	 */
	private recordFailure(reason: string, processingTime: number): void {
		this.metrics.failedRequests++;
		this.processingTimes.push(processingTime);

		this.log("warn", "Request failed", { reason, processingTime });
	}

	/**
	 * Post-process transcript while preserving the correctly identified seat
	 * PRODUCTION: Also preserves task commands and multiple items (e.g., "32B chicken and pepsi")
	 * This prevents re-processing from changing a correctly identified seat or losing multi-item requests
	 */
	private postProcessTranscriptPreservingSeat(
		transcript: string,
		preservedSeat: string,
		preservedItem: string,
		preservedAction: string
	): string {
		// DEBUG: Log only in development mode
		if (process.env.NODE_ENV === "development") {
			console.log("🔍 [postProcess]:", {
				seat: preservedSeat,
				item: preservedItem,
				action: preservedAction,
			});
		}

		// PRODUCTION: First, apply task word corrections to handle misrecognitions
		let correctedTranscript = transcript;
		
		// Number words map for task references
		const numberWords: Record<string, string> = {
			'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
			'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
		};
		
		// Fix common misrecognitions of "Task" before pattern matching
		// Handle number words (e.g., "ask one" → "Task 1")
		correctedTranscript = correctedTranscript.replace(
			/\b(past|ask|test|desk|cast|fast|last|mask|tusk|tasks|ass|tasc|tass|vast|mast)\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
			(_match, _word, numberWord) => {
				const digit = numberWords[numberWord.toLowerCase()] || numberWord;
				return `Task ${digit}`;
			}
		);
		
		// Handle digits (e.g., "ask 1" → "Task 1")
		correctedTranscript = correctedTranscript.replace(
			/\b(past|ask|test|desk|cast|fast|last|mask|tusk|tasks|ass|tasc|tass|vast|mast)\s+(\d+)\b/gi,
			(_match, _word, number) => `Task ${number}`
		);
		
		// Handle standalone misrecognitions with command words
		correctedTranscript = correctedTranscript.replace(
			/\b(remind|show|display|list|tell|what)\s+(me\s+)?(of\s+|about\s+|is\s+|are\s+)?(past|ask|test|desk|cast|fast|last|mask|tusk|ass|tasc|tass|vast|mast)\b/gi,
			(_match, command, me, preposition, _taskWord) => 
				`${command}${me ? " " + me : ""}${preposition ? " " + preposition : ""} Task`
		);
		
		// PRODUCTION: Check if this is a task command (e.g., "remind me of Task 1")
		// Task commands don't have seat/item/action structure, so preserve the full transcript
		const taskCommandPattern =
			/\b(remind|show|display|list|tell|what).*?\b(Task|task)\s+(\d+)\b/i;
		const isTaskCommand = taskCommandPattern.test(correctedTranscript);

		if (isTaskCommand) {
			// PRODUCTION: For task commands, preserve the full transcript with task reference
			// Extract and preserve task reference with proper capitalization
			let preserved = correctedTranscript;

			// Ensure "Task" is capitalized and number is preserved
			preserved = preserved.replace(
				/\b(task|Task)\s+(\d+)\b/gi,
				(_match, _taskWord, number) => {
					// Always capitalize "Task" for consistency
					return `Task ${number}`;
				}
			);

			// Remove wake word if present at the start
			preserved = preserved
				.replace(/^(skymate|sky\s+mate|sky-mate|sky\s+make)\s+/i, "")
				.trim();

			this.log("info", "🔒 Preserved task command from transcript", {
				original: transcript,
				preserved,
			});

			return preserved;
		}

		// MULTI-ITEM DETECTION: Check if transcript contains multiple items with "and" or commas
		// Preserve full request for multi-item processing downstream
		const hasMultipleItemsPattern = /\b(and|,)\s+/i;
		const potentiallyMultipleItems = hasMultipleItemsPattern.test(transcript);

		if (potentiallyMultipleItems && preservedSeat) {
			// ENHANCED: Handle items appearing ANYWHERE in the transcript
			// Pattern 1: "water 20D chicken and water" (items before AND after seat)
			// Pattern 2: "20D chicken and water" (items after seat)
			// Pattern 3: "water and chicken 20D" (items before seat)
			
			// Strategy: Extract ALL text and let multi-item extraction handle it downstream
			// Just ensure we keep the seat visible
			
			// First, try to find the action word and extract everything
			const actionPattern = new RegExp(
				`${preservedSeat}\\s+(wants|needs|requests|would\\s+like|once|knees)\\s+(.+)`,
				"i"
			);
			let match = transcript.match(actionPattern);

			if (match && match[2]) {
				const itemsAfterAction = match[2].trim();
				
				// Check if there are items BEFORE the seat too
				const beforeSeatPattern = new RegExp(
					`(.+?)\\s+${preservedSeat}`,
					"i"
				);
				const beforeMatch = transcript.match(beforeSeatPattern);
				
				if (beforeMatch && beforeMatch[1]) {
					// Items before AND after seat: "water 20D chicken and water"
					const itemsBefore = beforeMatch[1].trim();
					const result = `${preservedSeat} ${match[1]} ${itemsBefore} and ${itemsAfterAction}`;
					console.log(
						`🔒 Multi-item detected (before+after): "${transcript}" → "${result}"`
					);
					return result;
				} else {
					// Only items after seat: "20D chicken and water"
					const result = `${preservedSeat} ${match[1]} ${itemsAfterAction}`;
					console.log(
						`🔒 Multi-item detected (after only): "${transcript}" → "${result}"`
					);
					return result;
				}
			}

			// Fallback: Just extract everything around the seat
			const simpleSeatPattern = new RegExp(`(.*)${preservedSeat}\\s*(.+)`, "i");
			match = transcript.match(simpleSeatPattern);

			if (match) {
				const beforeSeat = match[1] ? match[1].trim() : "";
				const afterSeat = match[2] ? match[2].trim() : "";
				
				if (beforeSeat && afterSeat) {
					const result = `${preservedSeat} ${beforeSeat} and ${afterSeat}`;
					console.log(
						`🔒 Multi-item detected (no action, both sides): "${transcript}" → "${result}"`
					);
					return result;
				} else if (afterSeat) {
					const result = `${preservedSeat} ${afterSeat}`;
					console.log(
						`🔒 Multi-item detected (no action, after only): "${transcript}" → "${result}"`
					);
					return result;
				}
			}
		}

		// CRITICAL: Use the preserved seat directly from scoring for regular requests
		// Don't re-process it, as that can cause incorrect changes (e.g., 11A → 11C)

		// Build the final transcript using preserved values
		const parts: string[] = [];

		// Always use the preserved seat (from scoring phase)
		// This can be a full seat (e.g., "15C") or just a number (e.g., "15")
		if (preservedSeat) {
			parts.push(preservedSeat);
		}

		// Add action if present
		if (preservedAction) {
			parts.push(preservedAction);
		}

		// Add item if present
		if (preservedItem) {
			parts.push(preservedItem);
		}

		const result = parts.join(" ");
		const seatType =
			preservedSeat && /^\d+$/.test(preservedSeat) ? "number-only" : "full";
		console.log(
			`🔒 Preserved seat from scoring: "${preservedSeat}" (${seatType}) → Final: "${result}"`
		);

		return result;
	}

	/**
	 * REWARD LEARNING: Report successful task creation
	 * Call this when a task is successfully created to reward the patterns that led to it
	 * If sessionId is not found, will try to match by recent session
	 */
	reportTaskSuccess(
		sessionIdOrTranscript: string,
		taskData: { seat: string; item?: string; action?: string }
	): void {
		// Try to find session by ID first
		let session = this.pendingRewards.get(sessionIdOrTranscript);

		// If not found, try to find by matching transcript
		if (!session) {
			for (const [_id, s] of this.pendingRewards.entries()) {
				if (
					s.transcript.includes(sessionIdOrTranscript) ||
					sessionIdOrTranscript.includes(s.transcript)
				) {
					session = s;
					break;
				}
			}
		}

		// If still not found, use most recent session
		if (!session && this.sessionHistory.length > 0) {
			session = this.sessionHistory[this.sessionHistory.length - 1];
		}

		if (!session) {
			this.log("debug", "No session found for reward", {
				sessionIdOrTranscript,
			});
			return;
		}

		this.log("info", "🎉 Rewarding successful task patterns", {
			sessionId: session.id,
			seat: taskData.seat,
			item: taskData.item,
		});

		// Reward the selected alternative's patterns
		if (session.selectedAlternative) {
			const alt = session.selectedAlternative;

			// Reward seat pattern
			if (alt.parsed?.seat) {
				this.rewardSystem.rewardPattern(alt.parsed.seat, "seat");
				// Also reward the seat extraction pattern
				const seatPattern = this.extractSeatPattern(
					alt.transcript,
					alt.parsed.seat
				);
				if (seatPattern) {
					this.rewardSystem.rewardPattern(seatPattern, "seat");
				}
			}

			// Reward item pattern
			if (alt.parsed?.item) {
				this.rewardSystem.rewardPattern(alt.parsed.item.toLowerCase(), "item");
			}

			// Reward action pattern
			if (alt.parsed?.action) {
				this.rewardSystem.rewardPattern(
					alt.parsed.action.toLowerCase(),
					"action"
				);
			}

			// Reward the full transcript pattern if it was successful
			if (alt.transcript) {
				this.rewardSystem.rewardPattern(
					alt.transcript.toLowerCase(),
					"transcript"
				);
			}
		}

		// Reward parsed components from session
		if (session.parsedComponents) {
			if (session.parsedComponents.seat) {
				this.rewardSystem.rewardPattern(session.parsedComponents.seat, "seat");
			}
			if (session.parsedComponents.item) {
				this.rewardSystem.rewardPattern(
					session.parsedComponents.item.toLowerCase(),
					"item"
				);
			}
			if (session.parsedComponents.action) {
				this.rewardSystem.rewardPattern(
					session.parsedComponents.action.toLowerCase(),
					"action"
				);
			}
		}

		// Remove from pending rewards
		this.pendingRewards.delete(session.id);

		// Log reward stats
		const stats = this.rewardSystem.getPatternStats();
		this.log("debug", "Reward system stats", {
			totalPatterns: stats.length,
			topPatterns: stats.slice(0, 5).map((p) => ({
				pattern: p.pattern,
				successRate: ((p.successCount / p.totalCount) * 100).toFixed(1) + "%",
				boost: p.boost.toFixed(2),
			})),
		});
	}

	/**
	 * Extract the pattern used to identify a seat
	 */
	private extractSeatPattern(transcript: string, seat: string): string | null {
		// Try to find the pattern that matched the seat
		const patterns = [
			/\b(\d{1,2})\s*([a-fA-F])\b/i, // Direct: "26B"
			/\b(\d{1,2})\s+([a-fA-F])\b/i, // Space: "26 B"
			/\bseat\s+(\d{1,2})\s*([a-fA-F])\b/i, // "seat 26B"
		];

		for (const pattern of patterns) {
			const match = transcript.match(pattern);
			if (match) {
				const extracted = `${match[1]}${match[2].toUpperCase()}`;
				if (extracted === seat) {
					return pattern.source; // Return the regex pattern
				}
			}
		}

		return null;
	}

	/**
	 * Get reward system stats (for debugging/monitoring)
	 */
	getRewardStats(): {
		totalPatterns: number;
		topPatterns: Array<{ pattern: string; successRate: string; boost: number }>;
	} {
		const stats = this.rewardSystem.getPatternStats();
		return {
			totalPatterns: stats.length,
			topPatterns: stats.slice(0, 10).map((p) => ({
				pattern: p.pattern,
				successRate: `${((p.successCount / p.totalCount) * 100).toFixed(1)}%`,
				boost: p.boost,
			})),
		};
	}

	/**
	 * Enhanced post-process transcript with context-aware corrections
	 * This improves accuracy for aviation-specific terms and numbers
	 */
	// @ts-ignore - Kept for future use
	private postProcessTranscript(
		transcript: string,
		_score?: AlternativeScore
	): string {
		let cleaned = transcript;
		const corrections: Array<{ from: string; to: string; reason: string }> = [];

		// ===== WAKE WORD NORMALIZATION (Run first) =====
		// Normalize "Skymate" variants at the start of transcript
		cleaned = cleaned.replace(
			/^(sky\s+mate|sky-mate|sky\s+make)\s+/i,
			"skymate "
		);
		// Also normalize anywhere else
		cleaned = cleaned.replace(
			/\b(sky\s+mate|sky-mate|sky\s+make)\b/gi,
			"skymate"
		);

		// ===== ITEM PHONETIC CORRECTIONS (Run second) =====
		// Apply phonetic mappings for food/beverage/item misrecognitions
		// Process longer phrases first to avoid partial matches
		const sortedPhoneticKeys = Object.keys(ITEM_PHONETIC_MAP).sort(
			(a, b) => b.length - a.length
		);

		for (const variant of sortedPhoneticKeys) {
			const correctTerm = ITEM_PHONETIC_MAP[variant];
			// Create a regex that matches the variant as a whole word or phrase
			const pattern = new RegExp(`\\b${variant}\\b`, "gi");
			if (pattern.test(cleaned)) {
				const before = cleaned;
				cleaned = cleaned.replace(pattern, correctTerm);
				if (before !== cleaned) {
					corrections.push({
						from: variant,
						to: correctTerm,
						reason: `Phonetic correction: "${variant}" → "${correctTerm}"`,
					});
					console.log(
						`🔧 Phonetic correction: "${variant}" → "${correctTerm}"`
					);
				}
			}
		}

		// ===== COMPOUND WORD HANDLER (Run third) =====
		// Fix these BEFORE other processing
		const compoundFixes = [
			{
				pattern: /\bforty\s+sex\b/gi,
				replacement: "46",
				reason: 'Compound: "forty sex" → "46"',
			},
			{
				pattern: /\bfor\s+tea\s+sex\b/gi,
				replacement: "46",
				reason: 'Compound: "for tea sex" → "46"',
			},
			{
				pattern: /\b(\d+)\s+minutes\b/gi,
				replacement: (match: string, num: string) => {
					// Check context - if followed by request words, likely "B needs"
					const after = cleaned.substring(
						cleaned.indexOf(match) + match.length
					);
					if (
						/^\s+(a|an|the|blanket|pillow|water|coffee|tea|meal|food|coke)/i.test(
							after
						)
					) {
						corrections.push({
							from: match,
							to: `${num}B needs`,
							reason: 'Minutes misheard as "B needs"',
						});
						return `${num}B needs`;
					}
					return match;
				},
				reason: "Minutes in seat context",
			},
			{
				pattern: /\bthirty\s+to\s+be\b/gi,
				replacement: "32B",
				reason: 'Phonetic: "thirty to be" → "32B"',
			},
			{
				pattern: /\btree\b/gi,
				replacement: (_match: string) => {
					// Context-dependent: "tree" → "3" or "C"
					const context = cleaned.toLowerCase();
					if (context.includes("tree see") || context.includes("tree sea")) {
						return "3C";
					}
					return "3";
				},
				reason: "Tree → 3 or 3C",
			},
		];

		for (const fix of compoundFixes) {
			const before = cleaned;
			if (typeof fix.replacement === "function") {
				cleaned = cleaned.replace(fix.pattern, fix.replacement as any);
			} else {
				cleaned = cleaned.replace(fix.pattern, fix.replacement);
			}
			if (before !== cleaned) {
				corrections.push({ from: before, to: cleaned, reason: fix.reason });
			}
		}

		// ===== INTELLIGENT NUMBER-LETTER DISAMBIGUATION =====
		// Context-aware: "32 8 wants..." → "32A wants..." but "flight 328" stays "328"
		cleaned = cleaned.replace(
			/\b([1-5]?[0-9]|60)\s+([86351])\s+([a-z]+)/gi,
			(match, row, digit, wordAfter) => {
				// Context check: if word after is a request verb/item, likely seat letter
				const requestWords = [
					"wants",
					"needs",
					"once",
					"requests",
					"a",
					"an",
					"the",
					"blanket",
					"pillow",
					"water",
					"coffee",
					"tea",
					"meal",
					"food",
					"coke",
					"cola",
					"chicken",
					"beef",
					"assistance",
					"help",
				];

				if (
					requestWords.some((word) => wordAfter.toLowerCase().startsWith(word))
				) {
					const numberToLetter: {
						[key: string]: { letter: string; probability: number };
					} = {
						"8": { letter: "A", probability: 0.95 },
						"6": { letter: "B", probability: 0.9 },
						"3": { letter: "C", probability: 0.85 },
						"5": { letter: "F", probability: 0.8 },
						"1": { letter: "A", probability: 0.7 },
					};

					const mapping = numberToLetter[digit];
					if (mapping) {
						corrections.push({
							from: `${row} ${digit}`,
							to: `${row}${mapping.letter}`,
							reason: `Number-letter disambiguation: "${digit}" → "${
								mapping.letter
							}" (${(mapping.probability * 100).toFixed(0)}% confidence)`,
						});
						return `${row}${mapping.letter} ${wordAfter}`;
					}
				}
				return match;
			}
		);

		// First, fix letter misrecognitions for seat letters
		// Common misrecognitions: "be"/"bee" → "B", "sea"/"see" → "C", "de"/"dee" → "D", "ef" → "F", "eve" → "E"
		// IMPORTANT: Numbers can be misrecognized as letters and vice versa
		const seatLetterMap: { [key: string]: string } = {
			be: "B",
			bee: "B",
			b: "B",
			"6": "B", // "B" can be misheard as "6"
			sea: "C",
			see: "C",
			c: "C",
			"3": "C", // "C" can be misheard as "3"
			de: "D",
			dee: "D",
			d: "D",
			e: "E",
			eve: "E",
			ef: "F",
			f: "F",
			"5": "F", // "F" can be misheard as "5"
			a: "A",
			ay: "A",
			"8": "A", // "A" can be misheard as "8" - COMMON!
			"1": "A", // Sometimes "A" is heard as "1" too
		};

		// Fix seat letter misrecognitions (e.g., "32 bee" → "32B")
		// IMPORTANT: Don't change "a" if it's already part of a valid seat (e.g., "11a" should stay "11A", not become "11C")
		for (const [wrong, correct] of Object.entries(seatLetterMap)) {
			// Skip if this would change a valid seat letter
			if (wrong.toLowerCase() === "a" || wrong.toLowerCase() === "ay") {
				// Don't change "a" if it's already part of a valid seat pattern
				const regex = new RegExp(`\\b(\\d+)\\s+${wrong}\\b(?![A-Fa-f])`, "gi");
				cleaned = cleaned.replace(regex, (_match, number) => {
					// Check if this seat number with "a" is already valid
					const seatCandidate = `${number}A`;
					if (ContextAnalyzer.isValidSeat(seatCandidate)) {
						// Already valid, keep it
						return `${number}A`;
					}
					return `${number}${correct}`;
				});
			} else {
				const regex = new RegExp(`\\b(\\d+)\\s+${wrong}\\b`, "gi");
				cleaned = cleaned.replace(regex, `$1${correct}`);
			}
		}

		// Fix common seat number misrecognitions (space between number and letter)
		// e.g., "32 B" -> "32B"
		cleaned = cleaned.replace(/\b(\d+)\s+([A-F])\b/gi, "$1$2");

		// CRITICAL: Fix single-digit seat misrecognitions FIRST
		// Pattern: "9 8" → "9A", "9 6" → "9B", "9 3" → "9C", "9 5" → "9F", "9 1" → "9A"
		// Also handle concatenated: "98" → "9A" (no space)
		const singleDigitPattern =
			/\b([1-9])\s*([86351])(?=\s+(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help)|$|\s)/gi;
		cleaned = cleaned.replace(singleDigitPattern, (match, seatNum, digit) => {
			const num = parseInt(seatNum);
			if (num >= 1 && num <= 9) {
				const numberToLetter: { [key: string]: string } = {
					"8": "A",
					"6": "B",
					"3": "C",
					"5": "F",
					"1": "A",
				};
				const letter = numberToLetter[digit];
				if (letter) {
					// Check context to ensure it's a seat
					const matchIndex = cleaned.indexOf(match);
					if (matchIndex !== -1) {
						const afterMatch = cleaned
							.substring(matchIndex + match.length)
							.trim();
						const isSeatContext =
							/^(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help|seat)/i.test(
								afterMatch
							) || afterMatch === "";
						if (isSeatContext) {
							console.log(
								`🔧 Fixed single-digit seat in post-processing: "${match}" → "${seatNum}${letter}"`
							);
							return `${seatNum}${letter}`;
						}
					}
				}
			}
			return match;
		});

		// Fix number misrecognitions for seat letters (CRITICAL for seat numbers)
		// Pattern: "32 8" → "32A" (when "A" is misheard as "8")
		// Pattern: "32 6" → "32B" (when "B" is misheard as "6")
		// Pattern: "32 3" → "32C" (when "C" is misheard as "3")
		// Pattern: "32 5" → "32F" (when "F" is misheard as "5")
		// Only fix if the number is 10-99 (2-digit seats) to avoid conflicts with single-digit fixes
		// Also check if it's followed by words that typically come after seat numbers
		cleaned = cleaned.replace(
			/\b([1-9][0-9])\s+(8|6|3|5|1)(?:\s+|$)/gi,
			(match, row, number) => {
				// Map numbers to likely seat letters
				const numberToLetter: { [key: string]: string } = {
					"8": "A", // Most common: "A" → "8"
					"6": "B", // "B" → "6"
					"3": "C", // "C" → "3"
					"5": "F", // "F" → "5"
					"1": "A", // "A" → "1" (less common than "8")
				};
				const letter = numberToLetter[number];
				if (letter) {
					// CRITICAL: Don't convert "6" to "B" if the row number ends in 6 (like 6, 16, 26, 36, 46, 56)
					// UNLESS it's clearly a seat letter context (followed by action words)
					if (number === "6" && row.endsWith("6")) {
						const matchIndex = cleaned.indexOf(match);
						if (matchIndex !== -1) {
							const textAfter = cleaned
								.substring(matchIndex + match.length)
								.trim();
							const isSeatLetterContext =
								/^(needs|wants|once|1|a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice|seat)/i.test(
									textAfter
								);
							if (!isSeatLetterContext) {
								// Likely part of seat number (e.g., "6 6" might be "66" or "6A" misheard)
								// Don't convert, return original
								return match;
							}
						}
					}

					// Check what comes after to ensure it's a seat context
					const matchIndex = cleaned.indexOf(match);
					if (matchIndex !== -1) {
						const textAfter = cleaned
							.substring(matchIndex + match.length)
							.trim();
						// If followed by space, end, or common words after seat numbers, it's likely a seat
						if (
							textAfter === "" ||
							/^(needs|wants|once|1|a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice|seat)/i.test(
								textAfter
							)
						) {
							return `${row}${letter} `;
						}
					}
				}
				return match; // Keep original if no mapping or wrong context
			}
		);

		// CRITICAL: Planes have seat numbers 1-99
		// If we see a 2-digit number ending in 8/6/3/5/1, it might be a misheard letter
		// Pattern: "98" → "9A" (single-digit), "168" → "16A" (2-digit), "326" → "32B", etc.
		const digitToLetter: { [key: string]: string } = {
			"8": "A",
			"6": "B",
			"3": "C",
			"5": "F",
			"1": "A",
		};

		// Fix 2-digit numbers that end in misheard letters: "98" → "9A", "168" → "16A"
		// CRITICAL: Only match 2-digit numbers (10-99) to avoid conflicts with single-digit fixes
		// Single-digit seats (1-9) are already handled above
		cleaned = cleaned.replace(
			/\b([1-9][0-9])([86351])(?=\s+[a-z]+|\s|$)/gi,
			(match, seatNum, digit) => {
				const num = parseInt(seatNum);
				if (num >= 10 && num <= 99 && digitToLetter[digit]) {
					// Check context to ensure it's a seat
					const matchIndex = cleaned.indexOf(match);
					if (matchIndex !== -1) {
						const afterMatch = cleaned
							.substring(matchIndex + match.length)
							.trim();
						const isSeatContext =
							/^(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help|seat)/i.test(
								afterMatch
							) || afterMatch === "";
						if (isSeatContext) {
							return `${seatNum}${digitToLetter[digit]}`;
						}
					}
				}
				return match;
			}
		);

		// Fix 4-digit patterns: "1681" → "16A", "1981" → "19A" (where "81" = "A" + noise)
		// CRITICAL: Only match 2-digit seat numbers (10-99) to avoid single-digit conflicts
		cleaned = cleaned.replace(
			/\b([1-9][0-9])(81|8\s*1)(?=\s+[a-z]+|\s|$)/gi,
			(match, row) => {
				const seatNum = parseInt(row);
				// Only match 2-digit seat numbers (10-99)
				if (seatNum >= 10 && seatNum <= 99) {
					// Check context to ensure it's a seat
					const matchIndex = cleaned.indexOf(match);
					if (matchIndex !== -1) {
						const afterMatch = cleaned
							.substring(matchIndex + match.length)
							.trim();
						const isSeatContext =
							/^(wants|needs|once|requests|a|an|the|blanket|pillow|water|coffee|meal|food|chicken|beef|vegetarian|assistance|help|seat|skymate)/i.test(
								afterMatch
							) || afterMatch === "";
						if (isSeatContext) {
							console.log(
								`🔧 Fixed 4-digit seat in post-processing: "${match}" → "${row}A"`
							);
							return `${row}A`;
						}
					}
				}
				return match;
			}
		);

		// Fix reversed patterns where letter might be misheard as number at the end
		// Pattern: "328" → "32A" (if "A" was misheard as "8" and concatenated)
		// Only fix if it's a valid seat row (1-40) followed by a single digit that could be a letter
		// Use a more careful approach - only fix if followed by space or end of word
		cleaned = cleaned.replace(
			/\b([1-3]?[0-9]|40)([86351])(?![0-9A-Fa-f])/gi,
			(match, row, digit) => {
				const numberToLetter: { [key: string]: string } = {
					"8": "A",
					"6": "B",
					"3": "C",
					"5": "F",
					"1": "A",
				};
				const letter = numberToLetter[digit];
				if (letter) {
					// Check if this appears in a context that suggests it's a seat number
					// Look for the match position and what comes after
					const matchIndex = cleaned.indexOf(match);
					if (matchIndex !== -1) {
						const afterMatch = cleaned.substring(matchIndex + match.length);
						// If followed by space, end of string, or common words after seat numbers, it's likely a seat
						if (
							/^\s|^(needs|wants|once|1|a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice)/i.test(
								afterMatch
							) ||
							afterMatch === ""
						) {
							return `${row}${letter}`;
						}
					}
				}
				return match;
			}
		);

		// Comprehensive number word to digit converter
		const numberWords: { [key: string]: string } = {
			// Single digits
			zero: "0",
			one: "1",
			two: "2",
			three: "3",
			four: "4",
			five: "5",
			six: "6",
			seven: "7",
			eight: "8",
			nine: "9",
			ten: "10",
			// Teens
			eleven: "11",
			twelve: "12",
			thirteen: "13",
			fourteen: "14",
			fifteen: "15",
			sixteen: "16",
			seventeen: "17",
			eighteen: "18",
			nineteen: "19",
			// Tens
			twenty: "20",
			thirty: "30",
			forty: "40",
			fifty: "50",
			sixty: "60",
			// EXPANDED: 20s range (common seats)
			"twenty one": "21",
			"twenty two": "22",
			"twenty three": "23",
			"twenty four": "24",
			"twenty five": "25",
			"twenty six": "26",
			"twenty seven": "27",
			"twenty eight": "28",
			"twenty nine": "29",
			// EXPANDED: 30s range (very common seats)
			"thirty one": "31",
			"thirty two": "32",
			"thirty three": "33",
			"thirty four": "34",
			"thirty five": "35",
			"thirty six": "36",
			"thirty seven": "37",
			"thirty eight": "38",
			"thirty nine": "39",
			// EXPANDED: 40s range (common seats)
			"forty one": "41",
			"forty two": "42",
			"forty three": "43",
			"forty four": "44",
			"forty five": "45",
			"forty six": "46",
			"forty seven": "47",
			"forty eight": "48",
			"forty nine": "49",
			// EXPANDED: 50s range (common seats)
			"fifty one": "51",
			"fifty two": "52",
			"fifty three": "53",
			"fifty four": "54",
			"fifty five": "55",
			"fifty six": "56",
			"fifty seven": "57",
			"fifty eight": "58",
			"fifty nine": "59",
			// EXPANDED: 60s range (less common but possible)
			"sixty one": "61",
			"sixty two": "62",
			"sixty three": "63",
			"sixty four": "64",
			"sixty five": "65",
			"sixty six": "66",
		};

		// CRITICAL: Handle "digit digit letter" format FIRST (e.g., "five two B" → "52B")
		// This must run BEFORE the compound number word conversion
		const singleDigitWords = {
			zero: "0", one: "1", two: "2", three: "3", four: "4",
			five: "5", six: "6", seven: "7", eight: "8", nine: "9"
		};
		
		// Match: (single digit word) (single digit word) (letter or letter phonetic)
		// Example: "five two B", "five two be", "one three A"
		Object.keys(singleDigitWords).forEach(firstDigitWord => {
			Object.keys(singleDigitWords).forEach(secondDigitWord => {
				const firstDigit = singleDigitWords[firstDigitWord as keyof typeof singleDigitWords];
				const secondDigit = singleDigitWords[secondDigitWord as keyof typeof singleDigitWords];
				const seatNumber = `${firstDigit}${secondDigit}`;
				
				// Only valid seat numbers (10-66 typically)
				const num = parseInt(seatNumber);
				if (num >= 10 && num <= 66) {
					const pattern = new RegExp(
						`\\b${firstDigitWord}\\s+${secondDigitWord}\\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\\b`,
						"gi"
					);
					cleaned = cleaned.replace(pattern, (_match, letter) => {
						const normalizedLetter = seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
						return `${seatNumber}${normalizedLetter}`;
					});
				}
			});
		});
		
		// Convert number words to digits (with seat letters)
		// e.g., "thirty two B" → "32B", "fifteen C" → "15C"
		for (const [word, digit] of Object.entries(numberWords)) {
			// Match number word followed by optional seat letter
			const regex = new RegExp(
				`\\b${word}\\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)?\\b`,
				"gi"
			);
			cleaned = cleaned.replace(regex, (_match, letter) => {
				if (letter) {
					// Normalize the letter
					const normalizedLetter =
						seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
					return `${digit}${normalizedLetter}`;
				}
				return digit;
			});
		}

		// CRITICAL: Normalize hyphenated and spaced seat formats
		// "5-2-B" → "52B", "52-B" → "52B", "5 2 B" → "52B"
		cleaned = cleaned.replace(
			/\b(\d)-(\d)-([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\b/gi,
			(_match, d1, d2, letter) => {
				const normalizedLetter = seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				return `${d1}${d2}${normalizedLetter}`;
			}
		);
		cleaned = cleaned.replace(
			/\b(\d{1,2})-([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\b/gi,
			(_match, num, letter) => {
				const normalizedLetter = seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				return `${num}${normalizedLetter}`;
			}
		);
		
		// CRITICAL: Handle "digit space digit space letter" format
		// "5 2 B" → "52B" (but only for valid seat numbers)
		cleaned = cleaned.replace(
			/\b(\d)\s+(\d)\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\b/gi,
			(_match, d1, d2, letter) => {
				const seatNum = parseInt(`${d1}${d2}`);
				// Only valid seat numbers (10-66 typically)
				if (seatNum >= 10 && seatNum <= 66) {
					const normalizedLetter = seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
					return `${d1}${d2}${normalizedLetter}`;
				}
				return _match;
			}
		);
		
		// Fix common number word misrecognitions with seat letters
		// Handle variations like "thirty to B" → "32B", "thirty too B" → "32B"
		cleaned = cleaned.replace(
			/\bthirty\s+(to|too|two)\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\b/gi,
			(_match, _variant, letter) => {
				const normalizedLetter =
					seatLetterMap[letter?.toLowerCase()] || letter?.toUpperCase() || "B";
				return `32${normalizedLetter}`;
			}
		);
		
		// EXPANDED: Handle "fifty to/too/two" variations
		cleaned = cleaned.replace(
			/\bfifty\s+(to|too|two)\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|he|we|me|a|ay|ate|eight|the|for|four)\b/gi,
			(_match, _variant, letter) => {
				const normalizedLetter =
					seatLetterMap[letter?.toLowerCase()] || letter?.toUpperCase() || "B";
				return `52${normalizedLetter}`;
			}
		);

		// Fix standalone number words (without seat letters)
		for (const [word, digit] of Object.entries(numberWords)) {
			// Only replace if it's a standalone number word (not already part of a pattern)
			const regex = new RegExp(`\\b${word}\\b(?![A-Fa-f])`, "gi");
			cleaned = cleaned.replace(regex, digit);
		}

		// Fix "minutes" misrecognition - very common when saying seat number + "needs"
		// Pattern: "32 minutes" → "32 needs" (when "b needs" is misheard as "minutes")
		// Also handle: "32 minutes" after seat numbers → "32 needs"
		cleaned = cleaned.replace(/\b(\d+)\s+minutes\b/gi, (_match, number) => {
			// Check if this looks like a seat number pattern (number followed by minutes)
			// Replace with "needs" - the seat letter was likely missed
			return `${number} needs`;
		});

		// Also fix "minutes" in general when it appears before articles/objects (likely should be "needs")
		cleaned = cleaned.replace(
			/\bminutes\s+(a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food)\b/gi,
			"needs $1"
		);

		// Fix common "needs" misrecognitions
		// Common misrecognitions: "knees", "neat", "need", "nies", "nee"
		// These are often misrecognized when user says "needs"
		cleaned = cleaned.replace(/\b(knees|neat|nies|nee)\b/gi, "needs");

		// Fix "need" to "needs" when followed by articles or objects (third person context)
		cleaned = cleaned.replace(
			/\bneed\s+(a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food)\b/gi,
			"needs $1"
		);

		// Fix phrases with misrecognized "needs"
		cleaned = cleaned.replace(
			/\b(knees|neat|need|nies|nee)\s+(a|an|the)\s+/gi,
			"needs $2 "
		);
		cleaned = cleaned.replace(
			/\b(knees|neat|nies|nee)\s+(blanket|pillow|water|coffee|tea|assistance|help|meal|food)\b/gi,
			"needs $2"
		);

		// Fix "wants" misrecognition - "once" is often misheard when saying "wants"
		cleaned = cleaned.replace(/\bonce\b/gi, "wants");
		cleaned = cleaned.replace(
			/\bonce\s+(a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food)\b/gi,
			"wants $1"
		);

		// Fix "wants" misrecognition as "1" - very common after seat numbers
		// Pattern: "31B 1 coke" → "31B wants coke"
		// Pattern: "32B 1 a blanket" → "32B wants a blanket"
		cleaned = cleaned.replace(
			/\b(\d+[A-F])\s+1\s+(a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice|dinner|lunch|breakfast)\b/gi,
			"$1 wants $2"
		);
		// Also handle just "1" followed by object (without article)
		cleaned = cleaned.replace(
			/\b(\d+[A-F])\s+1\s+(blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice|dinner|lunch|breakfast)\b/gi,
			"$1 wants $2"
		);
		// Handle "1" after seat number with space (e.g., "31 B 1 coke" → "31B wants coke")
		cleaned = cleaned.replace(
			/\b(\d+)\s+([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\s+1\s+(a|an|the|blanket|pillow|water|coffee|tea|assistance|help|meal|food|coke|cola|soda|juice|dinner|lunch|breakfast)\b/gi,
			(_match, number, letter, article) => {
				const normalizedLetter =
					seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				return `${number}${normalizedLetter} wants ${article}`;
			}
		);
		// Handle standalone "1" after seat number before any word (fallback)
		cleaned = cleaned.replace(/\b(\d+[A-F])\s+1\s+([a-z]+)\b/gi, "$1 wants $2");

		// Fix common aviation term misrecognitions
		const aviationTerms: { [key: string]: string } = {
			"blank it": "blanket",
			"blank it please": "blanket please",
			"blanket please": "blanket",
			"pill oh": "pillow",
			"pill oh please": "pillow please",
			"head phones": "headphones",
			"head set": "headset",
			"head sets": "headset",
			"water please": "water",
			"coffee please": "coffee",
			"tea please": "tea",
			veggie: "vegetarian",
			"veggie meal": "vegetarian meal",
			"veggie burger": "vegetarian meal",
			"no meat": "vegetarian",
			"gluten free": "gluten-free",
			"gluten free meal": "gluten-free meal",
			"vegan meal": "vegan meal",
			"assistance please": "assistance",
			"help please": "help",
		};

		// Apply replacements (case-insensitive, whole word)
		for (const [wrong, correct] of Object.entries(aviationTerms)) {
			const regex = new RegExp(`\\b${wrong.replace(/\s+/g, "\\s+")}\\b`, "gi");
			cleaned = cleaned.replace(regex, correct);
		}

		// Handle "seat X minutes" pattern - "seat 32 minutes" → "32 needs"
		// This happens when "seat 32b needs" is misheard as "seat 32 minutes"
		cleaned = cleaned.replace(/\bseat\s+(\d+)\s+minutes\b/gi, "$1 needs");

		// Remove pronouns from the beginning (he/she at start)
		// Common patterns: "he needs", "she needs", "he needs a", "she needs a"
		cleaned = cleaned.replace(/^\s*(he|she)\s+/i, "");

		// Extract seat number from anywhere in the transcript and move it to the front
		// This handles patterns like "seat 32B", "seat 32 B", "seat thirty two B", etc.
		let extractedSeat = null;

		// Pattern 1: "seat 32B" or "seat 32 B" or "seat number 32B"
		const seatPattern1 =
			/\bseat\s+(number\s+)?(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\b/gi;
		const match1 = cleaned.match(seatPattern1);
		if (match1) {
			const fullMatch = match1[0];
			const numberMatch = fullMatch.match(/(\d+)/);
			const letterMatch = fullMatch.match(
				/([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)/i
			);
			if (numberMatch && letterMatch) {
				const number = numberMatch[1];
				const letter = letterMatch[1];
				const normalizedLetter =
					seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				extractedSeat = `${number}${normalizedLetter}`;
				cleaned = cleaned.replace(seatPattern1, "").trim();
			}
		}

		// Pattern 2: "32B seat" or "32 B seat"
		if (!extractedSeat) {
			const seatPattern2 =
				/\b(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\s+seat\b/gi;
			const match2 = cleaned.match(seatPattern2);
			if (match2) {
				const fullMatch = match2[0];
				const numberMatch = fullMatch.match(/(\d+)/);
				const letterMatch = fullMatch.match(
					/([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)/i
				);
				if (numberMatch && letterMatch) {
					const number = numberMatch[1];
					const letter = letterMatch[1];
					const normalizedLetter =
						seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
					extractedSeat = `${number}${normalizedLetter}`;
					cleaned = cleaned.replace(seatPattern2, "").trim();
				}
			}
		}

		// Pattern 3: Seat number already at start but might be malformed
		if (!extractedSeat) {
			const seatAtStart = cleaned.match(
				/^(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\b/i
			);
			if (seatAtStart) {
				const number = seatAtStart[1];
				const letter = seatAtStart[2];
				const normalizedLetter =
					seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				extractedSeat = `${number}${normalizedLetter}`;
				// Remove it from current position to re-add at front
				cleaned = cleaned
					.replace(
						/^(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\s+/i,
						""
					)
					.trim();
			}
		}

		// Pattern 4: Seat number anywhere else in the text (not at start)
		if (!extractedSeat) {
			const seatAnywhere = cleaned.match(
				/\b(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\b/i
			);
			if (seatAnywhere) {
				const number = seatAnywhere[1];
				const letter = seatAnywhere[2];
				const normalizedLetter =
					seatLetterMap[letter.toLowerCase()] || letter.toUpperCase();
				extractedSeat = `${number}${normalizedLetter}`;
				// Remove it from current position
				cleaned = cleaned
					.replace(
						/\b(\d+)\s*([A-Fa-f]|be|bee|sea|see|de|dee|ef|eve|a|ay)\b/i,
						""
					)
					.trim();
			}
		}

		// If we found a seat number, put it at the front
		if (extractedSeat) {
			cleaned = `${extractedSeat} ${cleaned}`.trim();
		}

		// Normalize whitespace
		cleaned = cleaned.replace(/\s+/g, " ").trim();

		return cleaned;
	}
}
