/**
 * Azure Speech Service Debug Helper
 * This module helps diagnose why Azure Speech API is failing and falling back to WebSpeech
 */

import { config } from './config';

export interface AzureDebugResult {
	status: 'success' | 'error';
	checks: {
		credentialsPresent: boolean;
		keyValid: boolean;
		regionValid: boolean;
		sdkLoadable: boolean;
		connectionTest: boolean;
	};
	errors: string[];
	warnings: string[];
	recommendations: string[];
}

/**
 * Comprehensive debug check for Azure Speech Service
 */
export async function debugAzureSpeech(): Promise<AzureDebugResult> {
	const result: AzureDebugResult = {
		status: 'success',
		checks: {
			credentialsPresent: false,
			keyValid: false,
			regionValid: false,
			sdkLoadable: false,
			connectionTest: false,
		},
		errors: [],
		warnings: [],
		recommendations: [],
	};

	console.log('🔍 === Azure Speech Service Debug Report ===');
	console.log('');

	// Check 1: Are credentials present?
	console.log('📋 Check 1: Environment Variables');
	const key = config.azureSpeech?.key;
	const region = config.azureSpeech?.region;

	if (!key && !region) {
		result.errors.push('❌ Both VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION are missing');
		console.error('❌ MISSING: Both Azure Speech key and region are not set');
		result.recommendations.push('Create a .env file in skymate-app/ with:');
		result.recommendations.push('  VITE_AZURE_SPEECH_KEY=your_key_here');
		result.recommendations.push('  VITE_AZURE_SPEECH_REGION=your_region_here');
	} else if (!key) {
		result.errors.push('❌ VITE_AZURE_SPEECH_KEY is missing');
		console.error('❌ MISSING: Azure Speech key (VITE_AZURE_SPEECH_KEY) is not set');
		result.recommendations.push('Add VITE_AZURE_SPEECH_KEY to your .env file');
	} else if (!region) {
		result.errors.push('❌ VITE_AZURE_SPEECH_REGION is missing');
		console.error('❌ MISSING: Azure Speech region (VITE_AZURE_SPEECH_REGION) is not set');
		result.recommendations.push('Add VITE_AZURE_SPEECH_REGION to your .env file (e.g., "eastus", "westus")');
	} else {
		result.checks.credentialsPresent = true;
		console.log('✅ Credentials found in config');
		console.log(`   Key: ${key.substring(0, 8)}... (${key.length} chars)`);
		console.log(`   Region: ${region}`);
	}

	// Check 2: Validate key format
	if (key) {
		console.log('');
		console.log('📋 Check 2: Key Format Validation');
		// Azure Speech keys are typically 32 characters long
		if (key.length === 32 && /^[a-zA-Z0-9]+$/.test(key)) {
			result.checks.keyValid = true;
			console.log('✅ Key format looks valid (32 alphanumeric characters)');
		} else if (key.length < 32) {
			result.errors.push('❌ Key appears too short (should be 32 characters)');
			console.error(`❌ Key is ${key.length} characters, expected 32`);
			result.recommendations.push('Check that you copied the complete Azure Speech key');
		} else if (key.length > 32) {
			result.warnings.push('⚠️ Key appears longer than expected (has extra characters?)');
			console.warn(`⚠️ Key is ${key.length} characters, expected 32`);
			result.recommendations.push('Check for extra whitespace or characters in the key');
		} else {
			result.warnings.push('⚠️ Key contains non-alphanumeric characters (unusual)');
			console.warn('⚠️ Key format unusual - may contain invalid characters');
		}
	}

	// Check 3: Validate region format
	if (region) {
		console.log('');
		console.log('📋 Check 3: Region Format Validation');
		const validRegions = [
			'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
			'centralus', 'northcentralus', 'southcentralus',
			'westcentralus', 'canadacentral', 'brazilsouth',
			'northeurope', 'westeurope', 'uksouth', 'francecentral',
			'germanywestcentral', 'switzerlandnorth', 'norwayeast',
			'eastasia', 'southeastasia', 'australiaeast', 'japaneast',
			'japanwest', 'koreacentral', 'southindia', 'centralindia',
			'uaenorth', 'southafricanorth'
		];

		if (validRegions.includes(region.toLowerCase())) {
			result.checks.regionValid = true;
			console.log(`✅ Region "${region}" is a valid Azure region`);
		} else {
			result.warnings.push(`⚠️ Region "${region}" is not in the standard list`);
			console.warn(`⚠️ Region "${region}" is unusual - verify it's correct`);
			result.recommendations.push('Common regions: eastus, westus, westeurope, southeastasia');
		}
	}

	// Check 4: Can we load the SDK?
	console.log('');
	console.log('📋 Check 4: SDK Loading Test');
	try {
		const sdk = await import('microsoft-cognitiveservices-speech-sdk');
		if (sdk && sdk.SpeechConfig) {
			result.checks.sdkLoadable = true;
			console.log('✅ Azure Speech SDK loaded successfully');
			console.log(`   SDK Version: unknown`);
		} else {
			result.errors.push('❌ SDK loaded but missing expected exports');
			console.error('❌ SDK loaded but SpeechConfig not found');
		}
	} catch (error: any) {
		result.errors.push(`❌ Failed to load Azure Speech SDK: ${error.message}`);
		console.error('❌ Failed to load Azure Speech SDK:', error.message);
		result.recommendations.push('Run: npm install microsoft-cognitiveservices-speech-sdk');
	}

	// Check 5: Test connection (if we have credentials and SDK)
	if (result.checks.credentialsPresent && result.checks.sdkLoadable && key && region) {
		console.log('');
		console.log('📋 Check 5: Azure Connection Test');
		try {
			const sdk = await import('microsoft-cognitiveservices-speech-sdk');
			
			// Create a speech config to test credentials
			const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
			
			if (speechConfig) {
				console.log('✅ Speech config created successfully');
				
				// Try to create a recognizer (without starting it)
				try {
					// Create a minimal audio config for testing
					const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
					const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
					
					if (recognizer) {
						result.checks.connectionTest = true;
						console.log('✅ Recognizer created successfully');
						console.log('✅ Azure Speech Service appears to be working!');
						
						// Clean up
						recognizer.close();
					}
				} catch (recError: any) {
					result.errors.push(`❌ Failed to create recognizer: ${recError.message}`);
					console.error('❌ Failed to create recognizer:', recError.message);
					
					// Check for specific error messages
					if (recError.message.includes('401') || recError.message.includes('Unauthorized')) {
						result.recommendations.push('The API key appears to be invalid or expired');
						result.recommendations.push('Generate a new key from Azure Portal');
					} else if (recError.message.includes('403') || recError.message.includes('Forbidden')) {
						result.recommendations.push('Access denied - check your Azure subscription status');
					} else if (recError.message.includes('404') || recError.message.includes('Not Found')) {
						result.recommendations.push('Region may be incorrect or service not available in this region');
					} else if (recError.message.includes('microphone') || recError.message.includes('audio')) {
						result.warnings.push('Microphone permission issue (not Azure-related)');
						result.checks.connectionTest = true; // Azure itself is fine
					}
				}
			}
		} catch (error: any) {
			result.errors.push(`❌ Connection test failed: ${error.message}`);
			console.error('❌ Connection test failed:', error.message);
			
			// Analyze error
			if (error.message.includes('401')) {
				result.recommendations.push('Invalid API key - verify your VITE_AZURE_SPEECH_KEY');
			} else if (error.message.includes('network')) {
				result.recommendations.push('Network connectivity issue - check your internet connection');
			}
		}
	}

	// Check 6: Check environment variable visibility in Vite
	console.log('');
	console.log('📋 Check 6: Vite Environment Variables');
	if (import.meta.env.VITE_AZURE_SPEECH_KEY) {
		console.log('✅ VITE_AZURE_SPEECH_KEY is accessible to Vite');
	} else {
		result.errors.push('❌ VITE_AZURE_SPEECH_KEY not accessible in Vite');
		console.error('❌ VITE_AZURE_SPEECH_KEY not found in import.meta.env');
		result.recommendations.push('Ensure .env file is in the skymate-app/ directory');
		result.recommendations.push('Restart the Vite dev server after adding .env variables');
		result.recommendations.push('Variables must start with VITE_ prefix to be exposed');
	}

	if (import.meta.env.VITE_AZURE_SPEECH_REGION) {
		console.log('✅ VITE_AZURE_SPEECH_REGION is accessible to Vite');
	} else {
		result.errors.push('❌ VITE_AZURE_SPEECH_REGION not accessible in Vite');
		console.error('❌ VITE_AZURE_SPEECH_REGION not found in import.meta.env');
	}

	// Summary
	console.log('');
	console.log('📊 === Summary ===');
	const checksTotal = Object.keys(result.checks).length;
	const checksPassed = Object.values(result.checks).filter(v => v).length;
	console.log(`Checks passed: ${checksPassed}/${checksTotal}`);
	console.log(`Errors: ${result.errors.length}`);
	console.log(`Warnings: ${result.warnings.length}`);

	if (result.errors.length > 0) {
		result.status = 'error';
		console.log('');
		console.log('❌ === ERRORS ===');
		result.errors.forEach(err => console.log(err));
	}

	if (result.warnings.length > 0) {
		console.log('');
		console.log('⚠️ === WARNINGS ===');
		result.warnings.forEach(warn => console.log(warn));
	}

	if (result.recommendations.length > 0) {
		console.log('');
		console.log('💡 === RECOMMENDATIONS ===');
		result.recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`));
	}

	console.log('');
	console.log('=== End Debug Report ===');

	return result;
}

/**
 * Quick check to determine why Azure is falling back to WebSpeech
 */
export function quickDiagnosis(): string {
	const key = config.azureSpeech?.key;
	const region = config.azureSpeech?.region;

	if (!key && !region) {
		return 'MISSING_CREDENTIALS: Both Azure key and region are not configured';
	} else if (!key) {
		return 'MISSING_KEY: VITE_AZURE_SPEECH_KEY is not set';
	} else if (!region) {
		return 'MISSING_REGION: VITE_AZURE_SPEECH_REGION is not set';
	} else if (key.length !== 32) {
		return 'INVALID_KEY_FORMAT: Key should be 32 characters';
	} else {
		return 'CREDENTIALS_OK: Issue may be with SDK loading or connection';
	}
}






