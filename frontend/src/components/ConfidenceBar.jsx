import React from "react";

export default function ConfidenceBar({ label, value, highlight = false }) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className={`text-sm font-medium ${highlight ? "text-gold-300" : "text-white/80"}`}>
          {label}
        </span>
        <span className={`text-xs font-semibold ${highlight ? "text-gold-300" : "text-white/50"}`}>
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            highlight ? "bg-gradient-to-r from-gold-500 to-gold-300" : "bg-maroon-600"
          }`}
          style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
        />
      </div>
    </div>
  );
}
