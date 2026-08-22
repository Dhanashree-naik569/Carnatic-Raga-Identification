import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Music4, Mail, Lock, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const justRegistered = Boolean(location.state?.registered);

  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState(location.state?.email || "");
  const [form, setForm] = useState({
    email: location.state?.email || "",
    password: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      /*
       * We will connect this to your backend password-reset endpoint
       * after checking your existing API client.
       */

      setMessage(
        "If an account exists with this email, a password reset link will be sent."
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to send password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 bg-radial-glow">
      <div className="w-full max-w-md">

        {/* Logo / heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-4">
            {forgotPassword ? (
              <KeyRound size={26} className="text-gold-400" />
            ) : (
              <Music4 size={26} className="text-gold-400" />
            )}
          </div>

          <h1 className="font-display text-3xl font-bold gold-text mb-2">
            {forgotPassword ? "Forgot Password?" : "Welcome back"}
          </h1>

          <p className="text-white/50 text-sm">
            {forgotPassword
              ? "Enter your email and we'll help you reset your password."
              : "Sign in to continue identifying ragas"}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-7">

          {/* ================= FORGOT PASSWORD ================= */}
          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">

              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-300">
                  {error}
                </p>
              )}

              {message && (
                <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2"
              >
                {loading && (
                  <Loader2 size={16} className="animate-spin" />
                )}

                Send Reset Link
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false);
                  setError("");
                  setMessage("");
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-gold-300 transition-colors"
              >
                <ArrowLeft size={15} />
                Back to Login
              </button>
            </form>
          ) : (
            /* ================= LOGIN ================= */
            <>
              {justRegistered && (
                <div className="mb-5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-200">
                  Account created successfully. Please sign in to continue.
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">

                <div>
                  <label className="text-xs text-white/50 mb-1 block">
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />

                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-gold-500/50 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(form.email);
                      setForgotPassword(true);
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs text-gold-300 hover:text-gold-200 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  {loading && (
                    <Loader2 size={16} className="animate-spin" />
                  )}

                  Sign In
                </button>
              </form>

              <p className="text-center text-sm text-white/50 mt-6">
                New here?{" "}
                <Link
                  to="/register"
                  className="text-gold-300 font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}