import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music4, Mail, Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/login", { replace: true, state: { registered: true, email: form.email } });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-md fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-3">
            <Music4 size={22} className="text-maroon-950" />
          </div>
          <h1 className="font-display text-2xl font-bold gold-text">Create your account</h1>
          <p className="text-white/50 text-sm mt-1">Start exploring Carnatic ragas with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                placeholder="yourname"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          {error && <p className="text-sm text-maroon-500">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-gold-300 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
