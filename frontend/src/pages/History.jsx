import React, { useEffect, useState } from "react";
import { Trash2, Mic2, UploadCloud, Eraser, Loader2 } from "lucide-react";
import { historyApi } from "../api/client";

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = () => {
    setLoading(true);
    historyApi
      .list()
      .then((res) => setItems(res.data.history))
      .catch(() => setError("Could not load your history."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    const prev = items;
    setItems(items.filter((i) => i.id !== id));
    try {
      await historyApi.remove(id);
    } catch {
      setError("Could not delete that entry.");
      setItems(prev);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    setError("");
    const prev = items;
    try {
      await historyApi.clearAll();
      setItems([]);
      setConfirmClear(false);
    } catch {
      setError("Could not clear your history.");
      setItems(prev);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold gold-text mb-2">Your History</h1>
          <p className="text-white/50 text-sm">Every raga you've identified, all in one place.</p>
        </div>

        {error && <p className="text-center text-maroon-500 text-sm mb-4">{error}</p>}

        {items.length > 0 && (
          <div className="flex justify-end mb-4">
            {confirmClear ? (
              <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-white/70">
                  Delete all {items.length} entries? This can't be undone.
                </span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-maroon-600/80 hover:bg-maroon-600 text-white/90 flex items-center gap-1.5 transition-colors"
                >
                  {clearing && <Loader2 size={12} className="animate-spin" />} Yes, clear all
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white/90 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs px-3.5 py-2 rounded-lg border border-white/10 text-white/60 hover:text-maroon-500 hover:border-maroon-500/40 flex items-center gap-2 transition-colors"
              >
                <Eraser size={14} /> Clear all history
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center text-white/40 text-sm">
            No predictions yet. Head to "Identify Raga" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="glass-panel rounded-xl p-4 flex items-center justify-between gap-4 fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center shrink-0">
                    {item.source === "live" ? (
                      <Mic2 size={16} className="text-gold-400" />
                    ) : (
                      <UploadCloud size={16} className="text-gold-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{item.predicted_raga}</p>
                    <p className="text-xs text-white/40 truncate">
                      {new Date(item.created_at).toLocaleString()} · {item.filename || item.source}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gold-500/10 text-gold-300">
                    {item.confidence}%
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-white/30 hover:text-maroon-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
