import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import RagaCard from "../components/RagaCard";
import { ragaApi } from "../api/client";

export default function Ragas() {
  const [ragas, setRagas] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRagas = useCallback((q) => {
    setLoading(true);
    ragaApi
      .list(q)
      .then((res) => setRagas(res.data.ragas))
      .catch(() => setError("Could not load the raga dataset."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRagas("");
  }, [fetchRagas]);

  useEffect(() => {
    const t = setTimeout(() => fetchRagas(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchRagas]);

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold gold-text mb-2">Raga Dataset</h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
            A curated reference of Carnatic ragas — the same swara templates that power
            the identification engine.
          </p>
        </div>

        <div className="max-w-md mx-auto mb-8 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by raga name or mood…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
          />
        </div>

        {error && <p className="text-center text-maroon-500 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : ragas.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-16">No ragas matched your search.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ragas.map((raga) => (
              <RagaCard key={raga.name} raga={raga} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
