/**
 * Passenger Database
 * Mock data for Cathay Pacific flight passengers
 * Includes seat assignments, passenger names, and meal preferences
 */

export interface PassengerInfo {
	seatNumber: string;
	passengerName: string;
	mealPreference: string;
	specialRequests?: string[];
	dietaryRestrictions?: string[];
	priorityMember?: boolean;
	// Optional membership tier for highlighting in seat maps (e.g. Cathay Gold/Diamond)
	membershipTier?: "gold" | "diamond";
	// Optional birthday for birthday card (ISO YYYY-MM-DD)
	birthday?: string;
	// Known allergies for the passenger; use ["none"] when no allergies
	allergies?: string[];
	// Past food orders history for this passenger
	pastFood?: string[];
}

// Mock passenger database for a Cathay Pacific flight
const PASSENGER_DATABASE: Record<string, PassengerInfo> = {
	// Row 1-10 (Business Class)
	"1A": {
		seatNumber: "1A",
		passengerName: "James Chen",
		mealPreference: "beef",
		membershipTier: "gold",
		birthday: "1988-07-12",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"1B": {
		seatNumber: "1B",
		passengerName: "Sarah Wong",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		birthday: "1992-11-03",
		allergies: ["shellfish"],
		pastFood: [],
	},
	"1C": {
		seatNumber: "1C",
		passengerName: "Priya Nair",
		mealPreference: "chicken",
		membershipTier: "diamond",
		birthday: "1990-04-21",
		pastFood: [],
	},
	"1D": {
		seatNumber: "1D",
		passengerName: "Kenji Sato",
		mealPreference: "fish",
		membershipTier: "gold",
		birthday: "1985-09-30",
		allergies: ["gluten"],
		pastFood: [],
	},
	"2A": {
		seatNumber: "2A",
		passengerName: "Michael Liu",
		mealPreference: "chicken",
		membershipTier: "diamond",
		pastFood: [],
	},
	"2B": {
		seatNumber: "2B",
		passengerName: "Emily Zhang",
		mealPreference: "fish",
		membershipTier: "diamond",
		pastFood: [],
	},
	"2C": {
		seatNumber: "2C",
		passengerName: "Hannah Lee",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["dairy"],
		pastFood: [],
	},
	"2D": {
		seatNumber: "2D",
		passengerName: "Omar Farouk",
		mealPreference: "beef",
		membershipTier: "gold",
		pastFood: [],
	},
	"3A": {
		seatNumber: "3A",
		passengerName: "David Kim",
		mealPreference: "beef",
		membershipTier: "gold",
		pastFood: [],
	},
	"3B": {
		seatNumber: "3B",
		passengerName: "Lisa Tan",
		mealPreference: "vegan",
		dietaryRestrictions: ["vegan"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"3C": {
		seatNumber: "3C",
		passengerName: "Wei Zhang",
		mealPreference: "chicken",
		membershipTier: "gold",
		pastFood: [],
	},
	"3D": {
		seatNumber: "3D",
		passengerName: "Sofia Rossi",
		mealPreference: "fish",
		pastFood: [],
	},
	"4A": {
		seatNumber: "4A",
		passengerName: "Robert Lee",
		mealPreference: "chicken",
		allergies: ["egg"],
		pastFood: [],
	},
	"4B": {
		seatNumber: "4B",
		passengerName: "Jennifer Ng",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		membershipTier: "gold",
		pastFood: [],
	},
	"4C": {
		seatNumber: "4C",
		passengerName: "Daniel Evans",
		mealPreference: "beef",
		pastFood: [],
	},
	"4D": {
		seatNumber: "4D",
		passengerName: "Nurul Aisyah",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["soy"],
		pastFood: [],
	},
	"5A": {
		seatNumber: "5A",
		passengerName: "Andrew Chan",
		mealPreference: "beef",
		membershipTier: "diamond",
		pastFood: [],
	},
	"5B": {
		seatNumber: "5B",
		passengerName: "Michelle Ho",
		mealPreference: "fish",
		allergies: ["gluten"],
		pastFood: [],
	},
	"5C": {
		seatNumber: "5C",
		passengerName: "Mateo Alvarez",
		mealPreference: "chicken",
		membershipTier: "gold",
		pastFood: [],
	},
	"5D": {
		seatNumber: "5D",
		passengerName: "Chen Wei",
		mealPreference: "beef",
		membershipTier: "diamond",
		allergies: ["peanuts"],
		pastFood: [],
	},

	// Additional Business Class - Row 6-10
	"6A": {
		seatNumber: "6A",
		passengerName: "Rachel Green",
		mealPreference: "chicken",
		birthday: "1987-02-14",
		allergies: ["tree nuts"],
		pastFood: [],
	},
	"6B": {
		seatNumber: "6B",
		passengerName: "Monica Geller",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		membershipTier: "gold",
		birthday: "1991-12-09",
		pastFood: [],
	},
	"6C": {
		seatNumber: "6C",
		passengerName: "Liam O'Connor",
		mealPreference: "fish",
		birthday: "1989-06-05",
		pastFood: [],
	},
	"6D": {
		seatNumber: "6D",
		passengerName: "Aisha Khan",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		birthday: "1993-08-17",
		allergies: ["sesame"],
		pastFood: [],
	},
	"7A": {
		seatNumber: "7A",
		passengerName: "Ross Geller",
		mealPreference: "beef",
		pastFood: [],
	},
	"7B": {
		seatNumber: "7B",
		passengerName: "Chandler Bing",
		mealPreference: "chicken",
		allergies: ["dairy"],
		pastFood: [],
	},
	"8A": {
		seatNumber: "8A",
		passengerName: "Joey Tribbiani",
		mealPreference: "beef",
		pastFood: [],
	},
	"8B": {
		seatNumber: "8B",
		passengerName: "Phoebe Buffay",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"9A": {
		seatNumber: "9A",
		passengerName: "Steve Rogers",
		mealPreference: "chicken",
		pastFood: [],
	},
	"9B": {
		seatNumber: "9B",
		passengerName: "Tony Stark",
		mealPreference: "beef",
		allergies: ["shellfish"],
		pastFood: [],
	},
	"9C": {
		seatNumber: "9C",
		passengerName: "Maria Hill",
		mealPreference: "chicken",
		specialRequests: ["baby bassinet"],
		pastFood: [],
	},
	"9D": {
		seatNumber: "9D",
		passengerName: "Nick Fury",
		mealPreference: "beef",
		allergies: ["gluten"],
		pastFood: [],
	},
	"9E": {
		seatNumber: "9E",
		passengerName: "Wanda Maximoff",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"9F": {
		seatNumber: "9F",
		passengerName: "Kenneth Williams",
		mealPreference: "vegan",
		dietaryRestrictions: ["vegan"],
		specialRequests: ["baby bassinet"],
		allergies: ["soy"],
		pastFood: [],
	},
	"10A": {
		seatNumber: "10A",
		passengerName: "Bruce Banner",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		priorityMember: true,
		membershipTier: "diamond",
		allergies: ["lactose"],
		pastFood: [],
	},
	"10B": {
		seatNumber: "10B",
		passengerName: "Natasha Romanoff",
		mealPreference: "fish",
		priorityMember: true,
		membershipTier: "gold",
		pastFood: [],
	},

	// Economy Class - Complete rows 20-60
	"20A": {
		seatNumber: "20A",
		passengerName: "Kevin Wu",
		mealPreference: "chicken",
		pastFood: [],
	},
	"20B": {
		seatNumber: "20B",
		passengerName: "Amy Lam",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"20C": {
		seatNumber: "20C",
		passengerName: "Brian Yang",
		mealPreference: "beef",
		allergies: ["gluten"],
		pastFood: [],
	},
	"20D": {
		seatNumber: "20D",
		passengerName: "Diana Prince",
		mealPreference: "fish",
		pastFood: [],
	},
	"20E": {
		seatNumber: "20E",
		passengerName: "Clark Kent",
		mealPreference: "chicken",
		pastFood: [],
	},
	"20F": {
		seatNumber: "20F",
		passengerName: "Lois Lane",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["dairy"],
		pastFood: [],
	},

	"21A": {
		seatNumber: "21A",
		passengerName: "Christina Choi",
		mealPreference: "fish",
		pastFood: [],
	},
	"21B": {
		seatNumber: "21B",
		passengerName: "Daniel Park",
		mealPreference: "chicken",
		allergies: ["shellfish"],
		pastFood: [],
	},
	"21C": {
		seatNumber: "21C",
		passengerName: "Grace Lin",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"21D": {
		seatNumber: "21D",
		passengerName: "Frank Castle",
		mealPreference: "beef",
		pastFood: [],
	},
	"21E": {
		seatNumber: "21E",
		passengerName: "Karen Page",
		mealPreference: "chicken",
		pastFood: [],
	},
	"21F": {
		seatNumber: "21F",
		passengerName: "Matt Murdock",
		mealPreference: "fish",
		allergies: ["peanuts"],
		pastFood: [],
	},

	"22A": {
		seatNumber: "22A",
		passengerName: "Peter Parker",
		mealPreference: "chicken",
		pastFood: [],
	},
	"22B": {
		seatNumber: "22B",
		passengerName: "Mary Jane",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"22C": {
		seatNumber: "22C",
		passengerName: "Harry Osborn",
		mealPreference: "beef",
		pastFood: [],
	},
	"22D": {
		seatNumber: "22D",
		passengerName: "Gwen Stacy",
		mealPreference: "fish",
		allergies: ["dairy"],
		pastFood: [],
	},
	"22E": {
		seatNumber: "22E",
		passengerName: "Miles Morales",
		mealPreference: "chicken",
		allergies: ["egg"],
		pastFood: [],
	},
	"22F": {
		seatNumber: "22F",
		passengerName: "Miguel O'Hara",
		mealPreference: "beef",
		pastFood: [],
	},

	"23A": {
		seatNumber: "23A",
		passengerName: "Bruce Wayne",
		mealPreference: "beef",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"23B": {
		seatNumber: "23B",
		passengerName: "Alfred Pennyworth",
		mealPreference: "fish",
		pastFood: [],
	},
	"23C": {
		seatNumber: "23C",
		passengerName: "Dick Grayson",
		mealPreference: "chicken",
		pastFood: [],
	},
	"23D": {
		seatNumber: "23D",
		passengerName: "Barbara Gordon",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"23E": {
		seatNumber: "23E",
		passengerName: "Jason Todd",
		mealPreference: "beef",
		allergies: ["gluten"],
		pastFood: [],
	},
	"23F": {
		seatNumber: "23F",
		passengerName: "Tim Drake",
		mealPreference: "chicken",
		pastFood: [],
	},

	"24A": {
		seatNumber: "24A",
		passengerName: "Luke Skywalker",
		mealPreference: "chicken",
		pastFood: [],
	},
	"24B": {
		seatNumber: "24B",
		passengerName: "Leia Organa",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["dairy"],
		pastFood: [],
	},
	"24C": {
		seatNumber: "24C",
		passengerName: "Han Solo",
		mealPreference: "beef",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"24D": {
		seatNumber: "24D",
		passengerName: "Chewbacca",
		mealPreference: "vegan",
		dietaryRestrictions: ["vegan"],
		pastFood: [],
	},
	"24E": {
		seatNumber: "24E",
		passengerName: "Obi-Wan Kenobi",
		mealPreference: "fish",
		pastFood: [],
	},
	"24F": {
		seatNumber: "24F",
		passengerName: "Anakin Skywalker",
		mealPreference: "chicken",
		allergies: ["soy"],
		pastFood: [],
	},

	"25A": {
		seatNumber: "25A",
		passengerName: "Thomas Wang",
		mealPreference: "beef",
		pastFood: [],
	},
	"25B": {
		seatNumber: "25B",
		passengerName: "Jessica Huang",
		mealPreference: "chicken",
		pastFood: [],
	},
	"25C": {
		seatNumber: "25C",
		passengerName: "Ryan Chen",
		mealPreference: "fish",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"25D": {
		seatNumber: "25D",
		passengerName: "Samantha Lee",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"25E": {
		seatNumber: "25E",
		passengerName: "Marcus Johnson",
		mealPreference: "beef",
		pastFood: [],
	},
	"25F": {
		seatNumber: "25F",
		passengerName: "Nina Patel",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["sesame"],
		pastFood: [],
	},

	// Continue filling rows 26-29
	"26A": {
		seatNumber: "26A",
		passengerName: "Harry Potter",
		mealPreference: "chicken",
		pastFood: [],
	},
	"26B": {
		seatNumber: "26B",
		passengerName: "Hermione Granger",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"26C": {
		seatNumber: "26C",
		passengerName: "Ron Weasley",
		mealPreference: "beef",
		pastFood: [],
	},
	"26D": {
		seatNumber: "26D",
		passengerName: "Luna Lovegood",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"26E": {
		seatNumber: "26E",
		passengerName: "Neville Longbottom",
		mealPreference: "chicken",
		allergies: ["gluten"],
		pastFood: [],
	},
	"26F": {
		seatNumber: "26F",
		passengerName: "Ginny Weasley",
		mealPreference: "fish",
		pastFood: [],
	},

	"27A": {
		seatNumber: "27A",
		passengerName: "Frodo Baggins",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"27B": {
		seatNumber: "27B",
		passengerName: "Sam Gamgee",
		mealPreference: "chicken",
		pastFood: [],
	},
	"27C": {
		seatNumber: "27C",
		passengerName: "Merry Brandybuck",
		mealPreference: "beef",
		pastFood: [],
	},
	"27D": {
		seatNumber: "27D",
		passengerName: "Pippin Took",
		mealPreference: "chicken",
		allergies: ["dairy"],
		pastFood: [],
	},
	"27E": {
		seatNumber: "27E",
		passengerName: "Aragorn",
		mealPreference: "beef",
		pastFood: [],
	},
	"27F": {
		seatNumber: "27F",
		passengerName: "Legolas",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["soy"],
		pastFood: [],
	},

	"28A": {
		seatNumber: "28A",
		passengerName: "Jon Snow",
		mealPreference: "beef",
		pastFood: [],
	},
	"28B": {
		seatNumber: "28B",
		passengerName: "Daenerys Targaryen",
		mealPreference: "fish",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"28C": {
		seatNumber: "28C",
		passengerName: "Tyrion Lannister",
		mealPreference: "chicken",
		pastFood: [],
	},
	"28D": {
		seatNumber: "28D",
		passengerName: "Arya Stark",
		mealPreference: "chicken",
		pastFood: [],
	},
	"28E": {
		seatNumber: "28E",
		passengerName: "Sansa Stark",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["gluten"],
		pastFood: [],
	},
	"28F": {
		seatNumber: "28F",
		passengerName: "Cersei Lannister",
		mealPreference: "beef",
		pastFood: [],
	},

	"29A": {
		seatNumber: "29A",
		passengerName: "Sherlock Holmes",
		mealPreference: "fish",
		pastFood: [],
	},
	"29B": {
		seatNumber: "29B",
		passengerName: "John Watson",
		mealPreference: "beef",
		pastFood: [],
	},
	"29C": {
		seatNumber: "29C",
		passengerName: "Mycroft Holmes",
		mealPreference: "chicken",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"29D": {
		seatNumber: "29D",
		passengerName: "Molly Hooper",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["dairy"],
		pastFood: [],
	},
	"29E": {
		seatNumber: "29E",
		passengerName: "Greg Lestrade",
		mealPreference: "beef",
		pastFood: [],
	},
	"29F": {
		seatNumber: "29F",
		passengerName: "Mrs Hudson",
		mealPreference: "fish",
		pastFood: [],
	},

	// Row 30-40
	"30A": {
		seatNumber: "30A",
		passengerName: "Nathan Harris",
		mealPreference: "chicken",
		pastFood: [],
	},
	"30B": {
		seatNumber: "30B",
		passengerName: "Olivia White",
		mealPreference: "fish",
		allergies: ["gluten"],
		pastFood: [],
	},
	"30C": {
		seatNumber: "30C",
		passengerName: "Ethan Taylor",
		mealPreference: "beef",
		pastFood: [],
	},
	"30D": {
		seatNumber: "30D",
		passengerName: "Sophia Anderson",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"30E": {
		seatNumber: "30E",
		passengerName: "Logan Martinez",
		mealPreference: "chicken",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"30F": {
		seatNumber: "30F",
		passengerName: "Isabella Thomas",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},

	"35A": {
		seatNumber: "35A",
		passengerName: "Ava Thompson",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"35B": {
		seatNumber: "35B",
		passengerName: "Lucas Moore",
		mealPreference: "chicken",
		pastFood: [],
	},
	"35C": {
		seatNumber: "35C",
		passengerName: "Mia Jackson",
		mealPreference: "fish",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"35D": {
		seatNumber: "35D",
		passengerName: "Jackson White",
		mealPreference: "beef",
		pastFood: [],
	},
	"35E": {
		seatNumber: "35E",
		passengerName: "Harper Lewis",
		mealPreference: "chicken",
		allergies: ["soy"],
		pastFood: [],
	},
	"35F": {
		seatNumber: "35F",
		passengerName: "Evelyn Walker",
		mealPreference: "fish",
		pastFood: [],
	},

	"40A": {
		seatNumber: "40A",
		passengerName: "Benjamin Martin",
		mealPreference: "beef",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"40B": {
		seatNumber: "40B",
		passengerName: "Amelia Garcia",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		pastFood: [],
	},
	"40C": {
		seatNumber: "40C",
		passengerName: "Henry Robinson",
		mealPreference: "chicken",
		pastFood: [],
	},
	"40D": {
		seatNumber: "40D",
		passengerName: "Charlotte King",
		mealPreference: "fish",
		allergies: ["dairy"],
		pastFood: [],
	},
	"40E": {
		seatNumber: "40E",
		passengerName: "Sebastian Young",
		mealPreference: "beef",
		pastFood: [],
	},
	"40F": {
		seatNumber: "40F",
		passengerName: "Abigail Hill",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["sesame"],
		pastFood: [],
	},

	// Row 50-52 (Complete all seats)
	"50A": {
		seatNumber: "50A",
		passengerName: "Peter Anderson",
		mealPreference: "beef",
		pastFood: [],
	},
	"50B": {
		seatNumber: "50B",
		passengerName: "Maria Garcia",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["peanuts"],
		pastFood: [],
	},
	"50C": {
		seatNumber: "50C",
		passengerName: "John Smith",
		mealPreference: "chicken",
		pastFood: [],
	},
	"51A": {
		seatNumber: "51A",
		passengerName: "Sophie Martin",
		mealPreference: "fish",
		allergies: ["none"],
		pastFood: [],
	},
	"51B": {
		seatNumber: "51B",
		passengerName: "Alex Turner",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["gluten"],
		pastFood: [],
	},
	"51C": {
		seatNumber: "51C",
		passengerName: "Emma Wilson",
		mealPreference: "chicken",
		allergies: ["dairy"],
		pastFood: [],
	},
	"52A": {
		seatNumber: "52A",
		passengerName: "Oliver Brown",
		mealPreference: "beef",
		allergies: ["peanuts"],
		pastFood: [],
	},
	"52B": {
		seatNumber: "52B",
		passengerName: "Isabella Martinez",
		mealPreference: "chicken",
		pastFood: [],
	},
	"52C": {
		seatNumber: "52C",
		passengerName: "William Davis",
		mealPreference: "fish",
		pastFood: [],
	},
	"52D": {
		seatNumber: "52D",
		passengerName: "Sophia Johnson",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["soy"],
		pastFood: [],
	},
	"52E": {
		seatNumber: "52E",
		passengerName: "James Miller",
		mealPreference: "beef",
		pastFood: [],
	},
	"52F": {
		seatNumber: "52F",
		passengerName: "Charlotte Lee",
		mealPreference: "vegetarian",
		dietaryRestrictions: ["vegetarian"],
		allergies: ["sesame"],
		pastFood: [],
	},
};

/**
 * Get passenger information for a specific seat
 * @param seatNumber - The seat number (e.g., "52B")
 * @returns Passenger information or null if not found
 */
export function getPassengerInfo(seatNumber: string): PassengerInfo | null {
	const normalizedSeat = seatNumber.toUpperCase().trim();
	const info = PASSENGER_DATABASE[normalizedSeat] || null;
	if (!info) return null;
	// Ensure allergies is always present to simplify UI rendering
	const allergies =
		info.allergies && info.allergies.length > 0 ? info.allergies : ["none"];
	return { ...info, allergies };
}

/**
 * Format passenger information into a spoken response
 * @param info - Passenger information
 * @returns Formatted string for TTS
 */
export function formatPassengerInfo(info: PassengerInfo): string {
	// More concise format: "Seat 5A Andrew Chan wanted the beef meal"
	let response = `Seat ${info.seatNumber}, ${info.passengerName} wanted the ${info.mealPreference} meal`;

	// Add dietary restrictions if any
	if (info.dietaryRestrictions && info.dietaryRestrictions.length > 0) {
		const restrictions = info.dietaryRestrictions.join(" and ");
		response += ` and has ${restrictions} dietary restrictions`;
	}

	// Add special requests if any
	if (info.specialRequests && info.specialRequests.length > 0) {
		const requests = info.specialRequests.join(", ");
		response += `. They also requested ${requests}`;
	}

	response += ".";
	return response;
}

/**
 * Get all passengers with a specific meal preference
 * @param mealType - The meal type (e.g., "chicken", "beef", "fish")
 * @returns Array of passenger information
 */
export function getPassengersByMeal(mealType: string): PassengerInfo[] {
	const normalizedMeal = mealType.toLowerCase().trim();
	return Object.values(PASSENGER_DATABASE).filter(
		(passenger) => passenger.mealPreference.toLowerCase() === normalizedMeal
	);
}

/**
 * Get all passengers with specific dietary restrictions
 * @param restriction - The dietary restriction (e.g., "vegan", "vegetarian")
 * @returns Array of passenger information
 */
export function getPassengersByDiet(restriction: string): PassengerInfo[] {
	const normalizedRestriction = restriction.toLowerCase().trim();
	return Object.values(PASSENGER_DATABASE).filter((passenger) =>
		passenger.dietaryRestrictions?.some(
			(r) => r.toLowerCase() === normalizedRestriction
		)
	);
}

/**
 * Get all available seat numbers
 * @returns Array of seat numbers
 */
export function getAllSeatNumbers(): string[] {
	return Object.keys(PASSENGER_DATABASE).sort();
}

/**
 * Check if a seat has a passenger assigned
 * @param seatNumber - The seat number to check
 * @returns True if passenger is assigned, false otherwise
 */
export function hasSeatAssignment(seatNumber: string): boolean {
	const normalizedSeat = seatNumber.toUpperCase().trim();
	return normalizedSeat in PASSENGER_DATABASE;
}

/**
 * Get all passengers with special requests
 * @returns Array of objects containing seat, passenger name, and their special requests
 */
export function getAllSpecialRequests(): Array<{
	seatNumber: string;
	passengerName: string;
	specialRequests: string[];
}> {
	return Object.values(PASSENGER_DATABASE)
		.filter(
			(passenger) =>
				passenger.specialRequests && passenger.specialRequests.length > 0
		)
		.map((passenger) => ({
			seatNumber: passenger.seatNumber,
			passengerName: passenger.passengerName,
			specialRequests: passenger.specialRequests!,
		}))
		.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
}

/**
 * Format all special requests into a readable string
 * @returns Formatted string listing all special requests
 */
export function formatAllSpecialRequests(): string {
	const specialRequestsData = getAllSpecialRequests();

	if (specialRequestsData.length === 0) {
		return "There are no special requests for this flight.";
	}

	const intro = `There are ${specialRequestsData.length} special request${
		specialRequestsData.length > 1 ? "s" : ""
	} for this flight: `;
	const requests = specialRequestsData
		.map((data) => {
			const requestsList = data.specialRequests.join(" and ");
			return `Seat ${data.seatNumber}, ${data.passengerName} requested ${requestsList}`;
		})
		.join(". ");

	return intro + requests + ".";
}

/**
 * Get all priority members
 * @returns Array of objects containing seat, passenger name, and meal preference
 */
type PremiumMembershipTier = "gold" | "diamond";

interface PremiumMemberSummary {
	seatNumber: string;
	passengerName: string;
	mealPreference: string;
}

function getFirstName(passengerName: string): string {
	const trimmed = passengerName.trim();
	if (!trimmed) return passengerName;
	const [first] = trimmed.split(/\s+/);
	return first || passengerName;
}

function getMembersByTier(tier: PremiumMembershipTier): PremiumMemberSummary[] {
	return Object.values(PASSENGER_DATABASE)
		.filter((passenger) => passenger.membershipTier === tier)
		.map((passenger) => ({
			seatNumber: passenger.seatNumber,
			passengerName: passenger.passengerName,
			mealPreference: passenger.mealPreference,
		}))
		.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
}

function formatMembersByTier(
	tier: PremiumMembershipTier,
	labels: { singular: string; plural: string },
	options?: {
		listFormatter?: (member: PremiumMemberSummary) => string;
		separator?: string;
	}
): string {
	const members = getMembersByTier(tier);

	if (!members.length) {
		return `There are no ${labels.plural} on this flight.`;
	}

	const listFormatter =
		options?.listFormatter ??
		((member: PremiumMemberSummary) =>
			`Seat ${member.seatNumber}, ${member.passengerName}`);
	const separator = options?.separator ?? ". ";

	const intro = `There ${members.length === 1 ? "is" : "are"} ${
		members.length
	} ${members.length === 1 ? labels.singular : labels.plural} on this flight: `;
	const list = members.map(listFormatter).join(separator);

	return intro + list + ".";
}

export function getAllPriorityMembers(): PremiumMemberSummary[] {
	return Object.values(PASSENGER_DATABASE)
		.filter((passenger) => passenger.priorityMember === true)
		.map((passenger) => ({
			seatNumber: passenger.seatNumber,
			passengerName: passenger.passengerName,
			mealPreference: passenger.mealPreference,
		}))
		.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
}

export function getAllGoldClassMembers(): PremiumMemberSummary[] {
	return getMembersByTier("gold");
}

export function getAllDiamondClassMembers(): PremiumMemberSummary[] {
	return getMembersByTier("diamond");
}

/**
 * Format all priority members into a readable string
 * @returns Formatted string listing all priority members
 */
export function formatAllPriorityMembers(): string {
	const priorityMembers = getAllPriorityMembers();

	if (priorityMembers.length === 0) {
		return "There are no priority members on this flight.";
	}

	const intro = `There ${priorityMembers.length === 1 ? "is" : "are"} ${
		priorityMembers.length
	} priority member${priorityMembers.length > 1 ? "s" : ""} on this flight: `;
	const members = priorityMembers
		.map((member) => {
			return `Seat ${member.seatNumber}, ${member.passengerName}`;
		})
		.join(". ");

	return intro + members + ".";
}

export function formatAllGoldClassMembers(): string {
	return formatMembersByTier(
		"gold",
		{
			singular: "gold class member",
			plural: "gold class members",
		},
		{
			listFormatter: (member) => getFirstName(member.passengerName),
			separator: ", ",
		}
	);
}

export function formatAllDiamondClassMembers(): string {
	return formatMembersByTier(
		"diamond",
		{
			singular: "diamond class member",
			plural: "diamond class members",
		},
		{
			listFormatter: (member) => getFirstName(member.passengerName),
			separator: ", ",
		}
	);
}
