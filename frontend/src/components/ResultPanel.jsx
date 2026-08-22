import React from "react";
import { Sparkles, AudioLines } from "lucide-react";
import ConfidenceBar from "./ConfidenceBar";

const SWARA_NAMES = ["Sa", "Ri1", "Ri2/Ga1", "Ri3/Ga2", "Ga3", "Ma1", "Ma2", "Pa", "Da1", "Da2/Ni1", "Da3/Ni2", "Ni3"];

export default function ResultPanel({ result }) {
  if (!result) return null;

  const { prediction, confidence, top_k, pitch_class_distribution, used_ml_model } = result;

  return (
    <div className="glass-panel rounded-2xl p-6 fade-in">
      <div className="flex items-center gap-2 mb-1 text-gold-500/80 text-xs uppercase tracking-widest">
        <Sparkles size={14} /> Prediction
      </div>
      <h2 className="font-display text-3xl text-gold-300 font-bold mb-1">{prediction}</h2>
      <p className="text-white/60 text-sm mb-6">
        Confidence <span className="text-gold-300 font-semibold">{confidence}%</span>
        {used_ml_model && <span className="ml-2 text-white/30">· ML-assisted</span>}
      </p>

      <div className="space-y-3 mb-6">
        {top_k.map((item, i) => (
          <ConfidenceBar
            key={item.raga}
            label={item.raga}
            value={item.confidence}
            highlight={i === 0}
          />
        ))}
      </div>

      {pitch_class_distribution && (
        <>
          <div className="divider-gold mb-4" />
          <div className="flex items-center gap-2 mb-3 text-gold-500/80 text-xs uppercase tracking-widest">
            <AudioLines size={14} /> Pitch Class Distribution
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {pitch_class_distribution.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-full h-16 bg-white/5 rounded-md flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-maroon-600 to-gold-400 rounded-md transition-all duration-500"
                    style={{ height: `${Math.min(100, v * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-white/40">{SWARA_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
