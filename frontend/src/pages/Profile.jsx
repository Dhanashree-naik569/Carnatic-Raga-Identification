import React, { useEffect, useState } from "react";
import { User, Mail, Save, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { profileApi } from "../api/client";

export default function Profile() {
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await profileApi.get();
        const profile = res.data.user;

        setUsername(profile.username || "");
        setEmail(profile.email || "");
      } catch (err) {
        setError(
          err.response?.data?.error || "Unable to load your profile."
        );

        // Fallback to the user already stored in AuthContext
        if (user) {
          setUsername(user.username || "");
          setEmail(user.email || "");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    try {
      setSaving(true);

      const res = await profileApi.update({
        username: username.trim(),
      });

      const updatedUser = res.data.user;

      localStorage.setItem("raga_user", JSON.stringify(updatedUser));

      setUsername(updatedUser.username || "");
      setEmail(updatedUser.email || "");

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setSaving(true);

      const res = await profileApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setMessage(
        res.data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to change password."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            My Profile
          </h1>

          <p className="mt-2 text-white/55">
            Manage your RagaVani account information and password.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="glass-panel rounded-2xl border border-gold-500/15 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center">
                <User size={21} className="text-gold-400" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Profile Information
                </h2>

                <p className="text-sm text-white/45">
                  Update your account details.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Username
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-400/70"
                  />

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-white outline-none transition focus:border-gold-400/50"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-400/70"
                  />

                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white/50 cursor-not-allowed"
                  />
                </div>

                <p className="mt-2 text-xs text-white/35">
                  Email address cannot be changed here.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={17} />

                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="glass-panel rounded-2xl border border-gold-500/15 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gold-500/10 flex items-center justify-center">
                <Lock size={21} className="text-gold-400" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Change Password
                </h2>

                <p className="text-sm text-white/45">
                  Keep your account secure.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current password */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Current Password
                </label>

                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-4 pr-11 text-white outline-none focus:border-gold-400/50"
                    placeholder="Current password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold-300"
                  >
                    {showCurrent ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  New Password
                </label>

                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-4 pr-11 text-white outline-none focus:border-gold-400/50"
                    placeholder="New password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold-300"
                  >
                    {showNew ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Confirm New Password
                </label>

                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-4 pr-11 text-white outline-none focus:border-gold-400/50"
                    placeholder="Confirm new password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold-300"
                  >
                    {showConfirm ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock size={17} />

                {saving ? "Updating..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}