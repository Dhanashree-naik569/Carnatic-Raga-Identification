/**
 * SwaraKeyboard.jsx
 * A piano-style virtual keyboard mapped to Carnatic swaras.
 * - Click keys with mouse
 * - Type keyboard keys (a/s/d/f/g/h/j/k for white, w/e/t/y/u for black)
 * - Audio synthesis via Web Audio API (no external files needed)
 *
 * Enharmonic keys (Ri2/Ga1, Ri3/Ga2, Da2/Ni1, Da3/Ni2) keep ONE physical key
 * and ONE frequency, but expose both names as separate labels on that key.
 * Whichever label is clicked is the name that gets displayed.
 */
import React, { useEffect, useRef, useCallback, useState } from "react";

// ── Swara definitions ──────────────────────────────────────────────────────
export const SWARAS = [
  { semitone: 0,  name: "Sa",  shortName: "S",  key: "a", isBlack: false },
  { semitone: 1,  name: "Ri1", shortName: "R1", key: "w", isBlack: true  },
  // Ri2 and Ga1 share the same swarasthana (2 semitones)
  { semitone: 2,  name: "Ri2", shortName: "R2", altName: "Ga1", altShortName: "G1", key: "s", isBlack: false },
  // Ri3 and Ga2 share the same swarasthana (3 semitones)
  { semitone: 3,  name: "Ri3", shortName: "R3", altName: "Ga2", altShortName: "G2", key: "e", isBlack: true  },
  { semitone: 4,  name: "Ga3", shortName: "G3", key: "d", isBlack: false },
  { semitone: 5,  name: "Ma1", shortName: "M1", key: "f", isBlack: false },
  { semitone: 6,  name: "Ma2", shortName: "M2", key: "t", isBlack: true  },
  { semitone: 7,  name: "Pa",  shortName: "P",  key: "g", isBlack: false },
  { semitone: 8,  name: "Da1", shortName: "D1", key: "y", isBlack: true  },
  // Da2 and Ni1 share the same swarasthana (9 semitones)
  { semitone: 9,  name: "Da2", shortName: "D2", altName: "Ni1", altShortName: "N1", key: "h", isBlack: false },
  // Da3 and Ni2 share the same swarasthana (10 semitones)
  { semitone: 10, name: "Da3", shortName: "D3", altName: "Ni2", altShortName: "N2", key: "u", isBlack: true  },
  { semitone: 11, name: "Ni3", shortName: "N3", key: "j", isBlack: false },
  // Upper octave Sa
  { semitone: 12, name: "Sa\u2032", shortName: "S\u2032", key: "k", isBlack: false },
];

// All 16 swarasthanas of the Carnatic system (12 pitch positions, 4 of which
// carry a second name). Used for the reference legend below the keyboard.
export const ALL_SWARA_NAMES = [
  "Sa", "Ri1", "Ri2", "Ri3", "Ga1", "Ga2", "Ga3",
  "Ma1", "Ma2", "Pa",
  "Da1", "Da2", "Da3", "Ni1", "Ni2", "Ni3",
];

const KEY_MAP = Object.fromEntries(SWARAS.map((s) => [s.key, s]));

// ── Web Audio synthesis ────────────────────────────────────────────────────
const BASE_FREQ = 261.63; // C4 = Sa

function getFrequency(semitone) {
  return BASE_FREQ * Math.pow(2, semitone / 12);
}

function playTone(audioCtx, semitone, duration = 0.8) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const freq = getFrequency(semitone);

  // Main oscillator (sawtooth for a tanpura-like harmonic richness)
  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, now);

  // Second oscillator slightly detuned for warmth
  const osc2 = audioCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq, now);
  osc2.detune.setValueAtTime(5, now); // +5 cents

  // Envelope
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.22, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Low-pass filter for mellower tone
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, now);
  filter.Q.setValueAtTime(0.8, now);

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration + 0.05);
  osc2.stop(now + duration + 0.05);
}

// ── Key visual positions ───────────────────────────────────────────────────
const WHITE_KEYS = SWARAS.filter((s) => !s.isBlack);
const BLACK_KEYS = SWARAS.filter((s) => s.isBlack);

// White key width in percentage units
const WK_W = 100 / WHITE_KEYS.length; // ~12.5% each

// For each black key, compute its left offset relative to the preceding white key
const BLACK_LEFT_MAP = {
  1:  (0 * WK_W) + WK_W * 0.62,
  3:  (1 * WK_W) + WK_W * 0.62,
  6:  (3 * WK_W) + WK_W * 0.62,
  8:  (4 * WK_W) + WK_W * 0.62,
  10: (5 * WK_W) + WK_W * 0.62,
};

export default function SwaraKeyboard({ onSwaraPlay, disabled = false }) {
  const audioCtxRef = useRef(null);
  const [activeKeys, setActiveKeys] = useState(new Set());

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /**
   * @param swara      the physical key definition (frequency source)
   * @param nameChoice which name to report: "primary" (default) or "alt"
   */
  const triggerSwara = useCallback(
    (swara, nameChoice = "primary") => {
      if (disabled) return;
      const ctx = getAudioCtx();
      // frequency NEVER changes — it always comes from the physical key
      playTone(ctx, swara.semitone % 12);

      setActiveKeys((prev) => new Set(prev).add(swara.semitone));
      setTimeout(() => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(swara.semitone);
          return next;
        });
      }, 250);

      const useAlt = nameChoice === "alt" && swara.altName;
      if (onSwaraPlay) {
        onSwaraPlay({
          ...swara,
          name: useAlt ? swara.altName : swara.name,
          shortName: useAlt ? swara.altShortName : swara.shortName,
        });
      }
    },
    [disabled, getAudioCtx, onSwaraPlay]
  );

  // Physical keyboard listeners (always use the primary name)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const swara = KEY_MAP[e.key.toLowerCase()];
      if (swara) {
        e.preventDefault();
        triggerSwara(swara, "primary");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [triggerSwara]);

  /** Renders the label(s) on a key. Shared keys get two clickable name chips. */
  const renderLabels = (swara, active, variant) => {
    const white = variant === "white";
    const idleText = white ? "text-gray-700" : "text-gold-300";
    const activeText = "text-amber-950";

    if (!swara.altName) {
      return (
        <span className={`text-[11px] font-bold ${active ? activeText : idleText}`}>
          {swara.shortName}
        </span>
      );
    }

    const chip = (label, choice) => (
      <span
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={choice === "alt" ? swara.altName : swara.name}
        title={choice === "alt" ? swara.altName : swara.name}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          triggerSwara(swara, choice);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            triggerSwara(swara, choice);
          }
        }}
        className={[
          "px-1 py-[1px] rounded text-[10px] font-bold leading-none transition-colors cursor-pointer",
          white
            ? active
              ? "text-amber-950 hover:bg-amber-900/20"
              : "text-gray-700 hover:bg-maroon-800/15"
            : active
              ? "text-amber-950 hover:bg-amber-900/25"
              : "text-gold-300 hover:bg-gold-400/25",
        ].join(" ")}
      >
        {label}
      </span>
    );

    return (
      <span className="flex flex-col items-center gap-[2px]">
        {chip(swara.shortName, "primary")}
        {chip(swara.altShortName, "alt")}
      </span>
    );
  };

  return (
    <div className="w-full select-none" aria-label="Carnatic Swara Keyboard">
      {/* Keyboard label */}
      <div className="text-xs text-white/45 text-center mb-2 tracking-wide">
        Click keys or type: <span className="text-gold-400/80">A S D F G H J K</span> (white) ·{" "}
        <span className="text-gold-400/80">W E T Y U</span> (black)
      </div>

      {/* Piano container */}
      <div className="relative w-full" style={{ height: 138 }}>
        {/* White keys */}
        <div className="absolute inset-0 flex gap-0.5">
          {WHITE_KEYS.map((swara) => {
            const active = activeKeys.has(swara.semitone);
            return (
              <div
                key={swara.semitone}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onMouseDown={() => triggerSwara(swara, "primary")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") triggerSwara(swara, "primary");
                }}
                className={[
                  "flex-1 rounded-b-xl border border-white/20 flex flex-col justify-end items-center pb-2 gap-0.5 transition-all duration-100",
                  disabled ? "cursor-not-allowed" : "cursor-pointer",
                  active
                    ? "bg-gold-300 shadow-[0_0_18px_rgba(224,184,79,0.85)]"
                    : disabled
                      ? "bg-white/60 opacity-50"
                     : "bg-white hover:bg-gold-100 active:bg-gold-300",
                ].join(" ")}
                style={{ minWidth: 0 }}
                aria-label={swara.altName ? `${swara.name} or ${swara.altName}` : swara.name}
              >
                {renderLabels(swara, active, "white")}
                <span className={`text-[9px] ${active ? "text-amber-800" : "text-gray-400"}`}>
                  {swara.key.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Black keys (absolutely positioned) */}
        {BLACK_KEYS.map((swara) => {
          const left = BLACK_LEFT_MAP[swara.semitone];
          const active = activeKeys.has(swara.semitone);
          return (
            <div
              key={swara.semitone}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onMouseDown={() => triggerSwara(swara, "primary")}
              onKeyDown={(e) => {
                if (e.key === "Enter") triggerSwara(swara, "primary");
              }}
              className={[
                "absolute top-0 z-10 rounded-b-lg border border-black/40 flex flex-col justify-end items-center pb-1.5 gap-0.5 transition-all duration-100",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
                active
                  ? "bg-gold-400 shadow-[0_0_18px_rgba(224,184,79,0.9)]"
                  : disabled
                    ? "bg-maroon-950 opacity-40"
                    : "bg-maroon-950 hover:bg-maroon-800 active:bg-gold-600",
              ].join(" ")}
              style={{
                left: `${left}%`,
                width: `${WK_W * 0.66}%`,
                height: "66%",
              }}
              aria-label={swara.altName ? `${swara.name} or ${swara.altName}` : swara.name}
            >
              {renderLabels(swara, active, "black")}
              <span className={`text-[8px] ${active ? "text-amber-800" : "text-white/40"}`}>
                {swara.key.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All 16 swarasthanas reference */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-widest text-white/35 text-center mb-2">
          All 16 Swarasthanas
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {ALL_SWARA_NAMES.map((n) => (
            <span
              key={n}
              className="text-[10px] px-2 py-0.5 rounded-full border border-gold-500/20 bg-gold-500/5 text-gold-300/75"
            >
              {n}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-white/35 text-center mt-2">
          Ri2/Ga1, Ri3/Ga2, Da2/Ni1 and Da3/Ni2 share one key — tap the name you mean and
          that exact swara is displayed.
        </p>
      </div>
    </div>
  );
}
