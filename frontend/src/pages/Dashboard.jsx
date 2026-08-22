import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Music4, Target, Percent, Mic2, History as HistoryIcon, Piano, Sparkles } from "lucide-react";
import { dashboardApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import heroImage from "../assets/dashboard-hero.jpg";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(120% 120% at 0% 0%, ${accent}22, transparent 60%)` }}
      />
      <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0 relative">
        <Icon size={20} className="text-gold-400" />
      </div>
      <div className="relative">
        <p className="text-2xl font-bold text-white/90 font-display">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="glass-panel rounded-xl p-4 flex items-center gap-3 hover:border-gold-500/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-gold-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/85 truncate">{title}</p>
        <p className="text-xs text-white/40 truncate">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi
      .stats()
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load dashboard stats."));
  }, []);

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] pb-14">
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Carnatic musicians performing with veena, tanpura and mridangam under warm stage light"
          width={1920}
          height={960}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-maroon-950 via-maroon-950/85 to-maroon-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-maroon-950 via-transparent to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-300/80 border border-gold-500/25 rounded-full px-3 py-1 mb-5">
            <Sparkles size={12} /> Your raga studio
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold gold-text mb-3">
            Welcome, {user?.username}
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-lg">
            Record, upload or play a phrase — and let the model name the raga behind it.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link to="/identify" className="btn-primary px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
              <Mic2 size={16} /> Identify a new Raga
            </Link>
            <Link
              to="/keyboard"
              className="px-5 py-2.5 rounded-lg text-sm border border-gold-500/30 text-gold-300 hover:bg-gold-500/10 transition-colors flex items-center gap-2"
            >
              <Piano size={16} /> Open Swara Keyboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 relative">
        {error && <p className="text-maroon-500 text-sm mb-4">{error}</p>}

        {stats && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <StatCard icon={Music4} label="Total Predictions" value={stats.total_predictions} accent="#e0b84f" />
              <StatCard icon={Target} label="Unique Ragas Detected" value={stats.unique_ragas_detected} accent="#c23252" />
              <StatCard icon={Percent} label="Average Confidence" value={`${stats.average_confidence}%`} accent="#edcf7c" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <QuickAction to="/identify" icon={Mic2} title="Identify" subtitle="Record or upload audio" />
              <QuickAction to="/history" icon={HistoryIcon} title="History" subtitle="Review past predictions" />
              <QuickAction to="/ragas" icon={Music4} title="Raga Library" subtitle="Browse arohana & avarohana" />
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 glass-panel rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold text-gold-300 mb-4">Raga Distribution</h2>
                {stats.raga_distribution.length === 0 ? (
                  <p className="text-white/40 text-sm py-10 text-center">
                    No predictions yet — try identifying a raga!
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.raga_distribution} margin={{ left: -20 }}>
                      <defs>
                        <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f4e0a8" />
                          <stop offset="100%" stopColor="#c99a30" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="raga" tick={{ fill: "#f6ecdf99", fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={70} />
                      <YAxis allowDecimals={false} tick={{ fill: "#f6ecdf99", fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(224,184,79,0.06)" }}
                        contentStyle={{ background: "#3d0f18", border: "1px solid rgba(224,184,79,0.3)", borderRadius: 8, color: "#f6ecdf" }}
                      />
                      <Bar dataKey="count" fill="url(#barGold)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold text-gold-300 mb-4">Recent Activity</h2>
                {stats.recent.length === 0 ? (
                  <p className="text-white/40 text-sm py-10 text-center">Nothing here yet.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recent.map((r) => (
                      <div key={r.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/85 truncate">{r.predicted_raga}</p>
                          <p className="text-xs text-white/40 truncate">
                            {new Date(r.created_at).toLocaleString()} · {r.source}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gold-500/10 text-gold-300 shrink-0">
                          {r.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/history" className="block text-center text-xs text-gold-400 hover:underline mt-4">
                  View full history →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
