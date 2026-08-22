/**
 * Keyboard.jsx — Interactive Swara Keyboard with live Raga Prediction
 *
 * Features:
 *  • Visual piano keyboard mapped to 12 Carnatic swaras + upper Sa
 *  • Play by mouse click OR keyboard typing (a/s/d/f/g/h/j/k white, w/e/t/y/u black)
 *  • Records the sequence of swaras played
 *  • Calls /api/keyboard/predict to identify the raga in real time
 *  • Shows top-5 raga predictions with confidence bars
 *  • Displays raga details (arohana, avarohana, mood, composer, famous songs)
 */
import React, { useState, useCallback, useRef } from "react";
import {
  Piano, RefreshCw, Trash2, Sparkles, Music2,
  ChevronDown, ChevronUp, Info, Loader2, Delete
} from "lucide-react";
import SwaraKeyboard, { SWARAS } from "../components/SwaraKeyboard";
import ConfidenceBar from "../components/ConfidenceBar";
import { keyboardApi } from "../api/client";

const SWARA_NAMES_FULL = [
  "Sa", "Ri1", "Ri2", "Ga2", "Ga3", "Ma1", "Ma2", "Pa", "Da1", "Da2", "Ni2", "Ni3"
];

export default function Keyboard() {
  const [playedSequence, setPlayedSequence] = useState([]);   // { semitone, name }[]
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoPredict, setAutoPredict] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const autoPredictTimer = useRef(null);
  const sequenceRef = useRef([]);

  const runPredict = useCallback(async (sequence) => {
    if (sequence.length < 2) return;
    setLoading(true);
    setError("");
    try {
      const semitones = sequence.map(s => s.semitone % 12);
      const res = await keyboardApi.predict({ swaras: semitones, top_k: 5 });
      setPrediction(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed. Try playing more notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwaraPlay = useCallback((swara) => {
    const entry = { semitone: swara.semitone, name: swara.name, ts: Date.now() };
    const next = [...sequenceRef.current, entry].slice(-60); // cap at 60 notes
    sequenceRef.current = next;
    setPlayedSequence([...next]);

    if (autoPredict) {
      clearTimeout(autoPredictTimer.current);
      autoPredictTimer.current = setTimeout(() => {
        runPredict(sequenceRef.current);
      }, 800);
    }
  }, [autoPredict, runPredict]);

  const handleClear = () => {
    sequenceRef.current = [];
    setPlayedSequence([]);
    setPrediction(null);
    setError("");
    clearTimeout(autoPredictTimer.current);
  };

  // Removes ONLY the last entered swara (e.g. S R G M X -> backspace -> S R G M).
  // Does not clear the whole sequence — that's what the Clear button is for.
  const handleBackspace = () => {
    if (sequenceRef.current.length === 0) return;
    const next = sequenceRef.current.slice(0, -1);
    sequenceRef.current = next;
    setPlayedSequence([...next]);
    clearTimeout(autoPredictTimer.current);
    setError("");

    if (next.length < 2) {
      setPrediction(null);
      return;
    }

    if (autoPredict) {
      autoPredictTimer.current = setTimeout(() => {
        runPredict(sequenceRef.current);
      }, 800);
    }
  };

  const handleManualPredict = () => {
    clearTimeout(autoPredictTimer.current);
    runPredict(sequenceRef.current);
  };

  // Unique pitch classes played (for the pitch wheel display)
  const uniquePCs = [...new Set(playedSequence.map(s => s.semitone % 12))].sort((a, b) => a - b);

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Piano size={22} className="text-gold-400" />
            <h1 className="font-display text-3xl font-bold gold-text">Swara Keyboard</h1>
          </div>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
            Play swaras with your mouse or keyboard keys — the app predicts which Carnatic raga
            you're playing in real time.
          </p>
        </div>

        {/* Keyboard panel */}
        <div className="glass-panel rounded-2xl p-6 mb-6 fade-in">
          <SwaraKeyboard onSwaraPlay={handleSwaraPlay} disabled={false} />

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70 select-none">
                <div
                  onClick={() => setAutoPredict(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                    autoPredict ? "bg-gold-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      autoPredict ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                Auto-predict
              </label>
              <span className="text-white/30 text-xs">
                {playedSequence.length} note{playedSequence.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!autoPredict && (
                <button
                  onClick={handleManualPredict}
                  disabled={playedSequence.length < 2 || loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500/20 text-gold-300 text-sm font-medium hover:bg-gold-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Predict Raga
                </button>
              )}
              <button
                onClick={handleBackspace}
                disabled={playedSequence.length === 0}
                title="Remove last swara"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 hover:text-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Delete size={14} /> Backspace
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 hover:text-white/70 transition-colors"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          {/* Note sequence display */}
          {playedSequence.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <div className="flex flex-wrap gap-1 min-w-0">
                {playedSequence.slice(-32).map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gold-500/15 text-gold-300 border border-gold-500/20"
                  >
                    {s.name}
                  </span>
                ))}
                {playedSequence.length > 32 && (
                  <span className="text-white/30 text-xs self-center">
                    +{playedSequence.length - 32} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pitch class wheel */}
        {uniquePCs.length > 0 && (
          <div className="glass-panel rounded-2xl p-5 mb-6 fade-in">
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">
              Pitch Classes Played
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const active = uniquePCs.includes(i);
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs transition-all ${
                      active
                        ? "bg-gold-500/25 text-gold-300 border border-gold-500/40 font-semibold"
                        : "bg-white/5 text-white/20 border border-white/5"
                    }`}
                  >
                    <span>{SWARA_NAMES_FULL[i]}</span>
                    <span className="text-[9px] opacity-60 mt-0.5">{i}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-panel rounded-xl p-4 mb-4 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <Info size={16} /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-8 text-white/50 text-sm">
            <Loader2 size={18} className="animate-spin text-gold-400" />
            Predicting raga…
          </div>
        )}

        {/* Prediction result */}
        {prediction && !loading && (
          <div className="glass-panel rounded-2xl p-6 fade-in">
            {/* Top prediction */}
            <div className="flex items-center gap-2 mb-1 text-gold-500/80 text-xs uppercase tracking-widest">
              <Sparkles size={14} /> Predicted Raga
            </div>
            <h2 className="font-display text-3xl text-gold-300 font-bold mb-1">
              {prediction.prediction}
            </h2>
            <div className="flex items-center gap-3 mb-5 text-sm text-white/60">
              <span>
                Confidence <span className="text-gold-300 font-semibold">{prediction.confidence}%</span>
              </span>
              <span className="text-white/20">·</span>
              <span>{prediction.note_count} notes analysed</span>
            </div>

            {/* Confidence bars */}
            <div className="space-y-2.5 mb-6">
              {prediction.top_k?.map((item, i) => (
                <ConfidenceBar
                  key={item.raga}
                  label={item.raga}
                  value={item.confidence}
                  highlight={i === 0}
                />
              ))}
            </div>

            <div className="divider-gold mb-4" />

            {/* Raga details toggle */}
            {prediction.raga_detail && (
              <>
                <button
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-gold-300 transition-colors mb-3"
                  onClick={() => setShowDetail(d => !d)}
                >
                  <Music2 size={15} />
                  Raga Details
                  {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showDetail && (
                  <div className="space-y-3 text-sm fade-in">
                    {prediction.raga_detail.arohana && (
                      <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider">Arohana</span>
                        <p className="text-gold-200 font-mono mt-0.5">{prediction.raga_detail.arohana}</p>
                      </div>
                    )}
                    {prediction.raga_detail.avarohana && (
                      <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider">Avarohana</span>
                        <p className="text-gold-200 font-mono mt-0.5">{prediction.raga_detail.avarohana}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {prediction.raga_detail.mood && (
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-wider">Mood</span>
                          <p className="text-white/80 mt-0.5">{prediction.raga_detail.mood}</p>
                        </div>
                      )}
                      {prediction.raga_detail.time && (
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-wider">Time</span>
                          <p className="text-white/80 mt-0.5">{prediction.raga_detail.time}</p>
                        </div>
                      )}
                      {prediction.raga_detail.composer && (
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-wider">Composer</span>
                          <p className="text-white/80 mt-0.5">{prediction.raga_detail.composer}</p>
                        </div>
                      )}
                      {prediction.raga_detail.melakarta && (
                        <div>
                          <span className="text-white/40 text-xs uppercase tracking-wider">Melakarta</span>
                          <p className="text-white/80 mt-0.5">#{prediction.raga_detail.melakarta}</p>
                        </div>
                      )}
                    </div>
                    {prediction.raga_detail.famous_songs?.length > 0 && (
                      <div>
                        <span className="text-white/40 text-xs uppercase tracking-wider">Famous Songs</span>
                        <ul className="mt-1 space-y-0.5">
                          {prediction.raga_detail.famous_songs.map((s, i) => (
                            <li key={i} className="text-white/70 text-sm">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {prediction.raga_detail.description && (
                      <p className="text-white/50 text-sm italic leading-relaxed">
                        {prediction.raga_detail.description}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Missing/extra swara hint */}
            {prediction.top_k?.[0]?.missing_swaras?.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-white/5 text-xs text-white/50">
                <span className="text-white/30">Hint:</span> The predicted raga typically also uses{" "}
                <span className="text-gold-400/70">
                  {prediction.top_k[0].missing_swaras
                    .map(s => SWARA_NAMES_FULL[s])
                    .join(", ")}
                </span>
                . Try playing those!
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!prediction && !loading && playedSequence.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm fade-in">
            <Piano size={40} className="mx-auto mb-3 opacity-30" />
            <p>Play swaras above to identify a raga</p>
            <p className="text-xs mt-1 text-white/20">
              Try: Sa Ri Ga Ma Pa Da Ni Sa for Shankarabharanam
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
