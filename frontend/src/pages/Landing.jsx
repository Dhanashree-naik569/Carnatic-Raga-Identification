import React from "react";
import { Link } from "react-router-dom";
import { Mic2, Library, LayoutDashboard, Waves, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  {
    icon: Mic2,
    title: "Live Raga Identification",
    desc: "Sing or play into your microphone and get an instant raga prediction, powered by pitch-class analysis and a trained classifier.",
  },
  {
    icon: Library,
    title: "Curated Raga Dataset",
    desc: "Browse a rich reference library of Carnatic ragas â€” arohana, avarohana, mood, and time of rendition.",
  },
  {
    icon: LayoutDashboard,
    title: "Personal Dashboard",
    desc: "Track every prediction you've made, your most-detected ragas, and your listening trends over time.",
  },
  {
    icon: Waves,
    title: "Upload or Record",
    desc: "Upload an existing audio clip or record fresh â€” both flows feed the same identification engine.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Accounts",
    desc: "JWT-secured login keeps your history and profile private to you.",
  },
  {
    icon: Sparkles,
    title: "Transparent Confidence",
    desc: "See the full ranked list of candidate ragas with confidence scores, not just a single black-box answer.",
  },
];

export default function Landing() {
  return (
    <div className="bg-radial-glow min-h-screen">
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs tracking-widest uppercase text-gold-300 border border-gold-500/30 bg-gold-500/5 mb-6">
          RagaVani
        </span>
        <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight mb-6">
          Discover the <span className="gold-text">Raga</span> <br className="hidden sm:block" />
          hidden in every phrase
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto text-lg mb-10">
          RagaVani listens to a sung or recorded phrase and identifies the underlying
          Carnatic raga â€” sing live into your mic, or upload a recording, and explore
          a dataset of classical ragas along the way.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary px-7 py-3 rounded-xl text-base">
            Start Identifying
          </Link>
          <Link
            to="/login"
            className="px-7 py-3 rounded-xl text-base font-medium text-white/80 border border-white/15 hover:border-gold-500/40 hover:text-gold-300 transition-colors"
          >
            I have an account
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-panel rounded-2xl p-6 hover:border-gold-500/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center mb-4">
                <Icon size={20} className="text-gold-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white/90">{title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="glass-panel rounded-2xl p-10">
          <h2 className="font-display text-2xl font-bold gold-text mb-3">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-6 mt-6 text-left">
            <div>
              <div className="text-gold-400 font-display text-3xl font-bold mb-2">01</div>
              <p className="text-white/60 text-sm">Sing live or upload a clip of a Carnatic phrase or alapana.</p>
            </div>
            <div>
              <div className="text-gold-400 font-display text-3xl font-bold mb-2">02</div>
              <p className="text-white/60 text-sm">
                We extract its pitch-class distribution and match it against known raga swara patterns and a trained classifier.
              </p>
            </div>
            <div>
              <div className="text-gold-400 font-display text-3xl font-bold mb-2">03</div>
              <p className="text-white/60 text-sm">Get the top predicted raga, alternatives, and save it to your history.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

