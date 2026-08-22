import React from "react";
import { Sparkles, Clock, Heart } from "lucide-react";

export default function RagaCard({ raga }) {
  return (
    <div className="glass-panel rounded-2xl p-5 hover:border-gold-500/40 transition-colors fade-in">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-xl text-gold-300 font-semibold">{raga.name}</h3>
        {raga.melakarta && (
          <span className="text-[11px] px-2 py-1 rounded-full bg-maroon-700/60 text-gold-200 whitespace-nowrap">
            Mela {raga.melakarta}
          </span>
        )}
      </div>
      <p className="text-sm text-white/70 mb-4 leading-relaxed">{raga.description}</p>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-gold-500/80 font-medium w-20 shrink-0">Arohana</span>
          <span className="text-white/70 font-mono text-xs pt-0.5">{raga.arohana}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gold-500/80 font-medium w-20 shrink-0">Avarohana</span>
          <span className="text-white/70 font-mono text-xs pt-0.5">{raga.avarohana}</span>
        </div>
      </div>

      <div className="divider-gold my-3" />

      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <Heart size={13} className="text-maroon-500" /> {raga.mood}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-gold-500" /> {raga.time}
        </span>
        {!raga.melakarta && (
          <span className="flex items-center gap-1">
            <Sparkles size={13} className="text-gold-500" /> Janya
          </span>
        )}
      </div>
    </div>
  );
}
