import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Music4, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = Boolean(location.state?.registered);
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
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
          <h1 className="font-display text-2xl font-bold gold-text">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to continue identifying ragas</p>
        </div>

        {justRegistered && (
          <div className="mb-5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-200">
            Account created successfully. Please sign in to continue.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-sm text-maroon-500">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          New here?{" "}
          <Link to="/register" className="text-gold-300 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
