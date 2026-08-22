import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Music4,
  LayoutDashboard,
  Mic2,
  Library,
  History,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Piano,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/identify", label: "Identify Raga", icon: Mic2 },
  { to: "/keyboard", label: "Swara Keyboard", icon: Piano },
  { to: "/ragas", label: "Raga Dataset", icon: Library },
  { to: "/history", label: "History", icon: History },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const links = user?.is_admin
    ? [...baseLinks, { to: "/admin", label: "Admin", icon: ShieldCheck }]
    : baseLinks;

  const initial = user?.username?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = () => {
    setProfileOpen(false);
    setOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gold-500/10 bg-[#180307]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between">

          {/* Logo */}
          <Link
            to={user ? "/dashboard" : "/"}
            className="flex items-center gap-2 group"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 via-gold-500 to-yellow-700 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Music4 size={23} className="text-[#2a0a0e]" />
            </div>

            <span className="text-2xl font-serif font-bold text-gold-300">
              RagaVani
            </span>
          </Link>

          {/* Desktop navigation */}
          {user && (
            <div className="hidden lg:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gold-500/15 text-gold-300"
                        : "text-white/70 hover:text-gold-300 hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">

                {/* Greeting + Profile Avatar */}
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm text-white/70">
                    Namaste,{" "}
                    <span className="text-gold-300 font-medium">
                      {user.username}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Circular avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-gold-500 to-yellow-700 flex items-center justify-center border-2 border-gold-300/70 shadow-lg shadow-gold-500/20">
                      <span className="text-2xl font-serif text-white">
                        {initial}
                      </span>
                    </div>

                    <ChevronDown
                      size={16}
                      className={`text-gold-300 transition-transform ${
                        profileOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-80 rounded-2xl border border-gold-500/20 bg-[#1b070c]/98 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">

                    {/* User details */}
                    <div className="p-4 border-b border-gold-500/10">
                      <div className="flex items-center gap-3">

                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-gold-500 to-yellow-700 flex items-center justify-center">
                          <span className="text-xl font-serif text-white">
                            {initial}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">
                            {user.username}
                          </p>

                          <p className="text-white/50 text-sm truncate">
                            {user.email}
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* My Profile */}
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/80 hover:text-gold-300 hover:bg-white/5 transition-colors"
                    >
                      <User size={20} className="text-gold-400" />
                      <span className="font-medium">
                        My Profile
                      </span>
                    </Link>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-4 text-white/80 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-gold-500/10"
                    >
                      <LogOut size={20} className="text-gold-400" />
                      <span className="font-medium">
                        Logout
                      </span>
                    </button>

                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-white/80 hover:text-gold-300 px-3 py-2"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="btn-primary text-sm px-4 py-2 rounded-lg"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <button
            className="md:hidden text-white/80"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>
      </div>

      {/* Mobile navigation */}
      {open && (
        <div className="md:hidden glass-panel border-t border-gold-500/10 px-4 py-3 space-y-1 fade-in">
          {user ? (
            <>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-gold-500/15 text-gold-300"
                        : "text-white/70"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}

              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-gold-300"
              >
                <User size={16} />
                My Profile
              </Link>

              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-white/80"
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-gold-300 font-medium"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}