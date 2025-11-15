/**
 * Azure Speech Debug Component
 * Use this component to diagnose why Azure Speech API is failing
 */

import { useState } from 'react';
import { debugAzureSpeech, quickDiagnosis, type AzureDebugResult } from '../lib/azureSpeechDebug';

export function AzureSpeechDebug() {
	const [debugResult, setDebugResult] = useState<AzureDebugResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [quickDiag, setQuickDiag] = useState<string>('');

	const runDebug = async () => {
		setIsRunning(true);
		console.clear();
		console.log('🔍 Running Azure Speech diagnostic...');
		
		try {
			const result = await debugAzureSpeech();
			setDebugResult(result);
		} catch (error) {
			console.error('Failed to run debug:', error);
		} finally {
			setIsRunning(false);
		}
	};

	const runQuickDiag = () => {
		const result = quickDiagnosis();
		setQuickDiag(result);
		console.log('Quick diagnosis:', result);
	};

	return (
		<div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 max-w-md z-50">
			<h3 className="text-lg font-bold mb-2">🔍 Azure Speech Debug</h3>
			
			<div className="space-y-2">
				<button
					onClick={runQuickDiag}
					className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
				>
					Quick Diagnosis
				</button>
				
				<button
					onClick={runDebug}
					disabled={isRunning}
					className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
				>
					{isRunning ? 'Running...' : 'Run Full Diagnostic'}
				</button>
			</div>

			{quickDiag && (
				<div className="mt-4 p-3 bg-gray-100 rounded text-sm">
					<div className="font-semibold mb-1">Quick Diagnosis:</div>
					<div className={quickDiag.includes('OK') ? 'text-green-600' : 'text-red-600'}>
						{quickDiag}
					</div>
				</div>
			)}

			{debugResult && (
				<div className="mt-4 space-y-2 text-sm max-h-96 overflow-y-auto">
					<div className={`p-2 rounded ${
						debugResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
					}`}>
						<strong>Status:</strong> {debugResult.status.toUpperCase()}
					</div>

					<div className="p-2 bg-gray-100 rounded">
						<strong>Checks:</strong>
						<ul className="ml-4 mt-1">
							{Object.entries(debugResult.checks).map(([key, value]) => (
								<li key={key} className={value ? 'text-green-600' : 'text-red-600'}>
									{value ? '✅' : '❌'} {key.replace(/([A-Z])/g, ' $1').trim()}
								</li>
							))}
						</ul>
					</div>

					{debugResult.errors.length > 0 && (
						<div className="p-2 bg-red-50 rounded">
							<strong className="text-red-800">Errors:</strong>
							<ul className="ml-4 mt-1 text-red-700">
								{debugResult.errors.map((error, i) => (
									<li key={i}>{error}</li>
								))}
							</ul>
						</div>
					)}

					{debugResult.warnings.length > 0 && (
						<div className="p-2 bg-yellow-50 rounded">
							<strong className="text-yellow-800">Warnings:</strong>
							<ul className="ml-4 mt-1 text-yellow-700">
								{debugResult.warnings.map((warning, i) => (
									<li key={i}>{warning}</li>
								))}
							</ul>
						</div>
					)}

					{debugResult.recommendations.length > 0 && (
						<div className="p-2 bg-blue-50 rounded">
							<strong className="text-blue-800">Recommendations:</strong>
							<ol className="ml-4 mt-1 text-blue-700 list-decimal">
								{debugResult.recommendations.map((rec, i) => (
									<li key={i}>{rec}</li>
								))}
							</ol>
						</div>
					)}
				</div>
			)}

			<div className="mt-4 text-xs text-gray-500">
				Check browser console for detailed logs
			</div>
		</div>
	);
}






