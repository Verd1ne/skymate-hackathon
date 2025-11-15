import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Megaphone, MessageCircle, Square } from 'lucide-react';
import { TTSService } from '../../lib/ttsService';

const MAX_CHAR_COUNT = 400;

const promptSuggestions = [
  'Welcome aboard! This is your AI crew assistant making sure you feel at home in the skies.',
  'Reminder: Please return to your seats and fasten your seatbelts as we prepare for turbulence.',
  'Today’s featured beverage is jasmine green tea with honey and citrus—would you like to try one?',
  'Here is a calm breathing exercise: inhale for four, hold for four, exhale for six. Let’s do it together.',
];

function TTSPlayground() {
  const [text, setText] = useState(promptSuggestions[0]);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [infoMessage, setInfoMessage] = useState('Type anything below and tap Speak.');
  const [error, setError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ttsRef = useRef<TTSService | null>(null);

  useEffect(() => {
    const service = new TTSService();
    service.onSpeakingStart(() => setIsSpeaking(true));
    service.onSpeakingStop(() => {
      setIsSpeaking(false);
      setIsSynthesizing(false);
    });
    ttsRef.current = service;

    return () => {
      service.dispose();
      ttsRef.current = null;
    };
  }, []);

  const canSpeak = text.trim().length > 0 && !isSynthesizing && !isSpeaking;

  const characterCount = useMemo(() => {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    return trimmed.length;
  }, [text]);

  const handleSpeak = async () => {
    if (!ttsRef.current) {
      setError('Speech service is still loading. Try again in a second.');
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Please enter something for the AI to say.');
      return;
    }

    setError(null);
    setInfoMessage('Connecting to Azure Cognitive Services…');
    setIsSynthesizing(true);

    try {
      // Resume audio context (required on some browsers until user interacts)
      try {
        await ttsRef.current.resumeAudioContextOnUserInteraction();
      } catch (resumeError) {
        console.debug('Audio context resume skipped:', resumeError);
      }

      await ttsRef.current.speak(trimmedText, { rate, pitch, volume });
      setInfoMessage('Finished speaking. Update the script to try something new.');
    } catch (err: any) {
      console.error('TTS speak error', err);
      setError(
        err?.message ||
          'We could not reach the AI voice service. Check your internet connection and Azure keys.'
      );
      setInfoMessage('Azure Speech hit an issue. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleStop = () => {
    if (!ttsRef.current) {
      return;
    }
    ttsRef.current.stop();
    setInfoMessage('Speech stopped.');
    setIsSynthesizing(false);
  };

  const handleSuggestionClick = (prompt: string) => {
    setText(prompt);
    setError(null);
    setInfoMessage('Prompt loaded. Tap Speak when ready.');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950/95 text-white px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-6 shadow-xl">
          <div className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white/90">
            <Megaphone className="h-6 w-6 text-blue-400" />
            Skymate AI Voice Playground
          </div>
          <p className="text-sm text-white/70">
            Ask the onboard AI to say anything—perfect for testing announcements, safety briefings, or
            personalized passenger messages. Enter a line, tune the sliders, and press Speak.
          </p>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            {infoMessage}
          </div>
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <label htmlFor="tts-text" className="text-sm font-semibold uppercase tracking-wide text-white/70">
                Script
              </label>
              <span className="text-xs text-white/60">
                {characterCount}/{MAX_CHAR_COUNT} characters
              </span>
            </div>
            <textarea
              id="tts-text"
              className="mt-3 h-60 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-white placeholder:text-white/30 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={text}
              maxLength={MAX_CHAR_COUNT}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type or paste the announcement you want the AI to speak…"
              disabled={isSynthesizing}
            />

            <div className="mt-4 flex flex-wrap gap-3">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestionClick(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left text-xs text-white/70 transition hover:border-blue-500/40 hover:bg-blue-500/10"
                >
                  {prompt.slice(0, 70)}…
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Voice tuning</p>

                <div className="mt-4 space-y-4 text-xs text-white/60">
                  <div>
                    <div className="flex items-center justify-between">
                      <span>Speed</span>
                      <span>{rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.3}
                      step={0.05}
                      value={rate}
                      onChange={(event) => setRate(Number(event.target.value))}
                      className="mt-2 w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span>Pitch</span>
                      <span>{pitch.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.3}
                      step={0.05}
                      value={pitch}
                      onChange={(event) => setPitch(Number(event.target.value))}
                      className="mt-2 w-full accent-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span>Volume</span>
                      <span>{(volume * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={1.2}
                      step={0.05}
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="mt-2 w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                <p className="flex items-center gap-2 font-semibold text-white/80">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                  Tips for best results
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4">
                  <li>Keep scripts under 30 seconds for the snappiest playback.</li>
                  <li>Mention emotions or energy in the copy—“calm and confident” or “excited welcome.”</li>
                  <li>Ensure your Azure Speech key and region are set in the `.env` file.</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSpeak}
                  disabled={!canSpeak}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10"
                >
                  {isSynthesizing || isSpeaking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Megaphone className="h-4 w-4" />
                  )}
                  {isSynthesizing || isSpeaking ? 'Speaking…' : 'Speak'}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={!isSpeaking}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition enabled:hover:border-red-500/60 enabled:hover:text-red-200 disabled:cursor-not-allowed disabled:text-white/30"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TTSPlayground;

