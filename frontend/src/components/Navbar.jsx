import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
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
  Music2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/identify", label: "Identify Raga", icon: Mic2 },
  { to: "/keyboard", label: "Swara Keyboard", icon: Piano },
  { to: "/ragas", label: "Raga Dataset", icon: Library },
  { to: "/history", label: "History", icon: History },
];

function ViolinLogo() {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center text-[42px] leading-none"
      role="img"
      aria-label="Violin"
      style={{
        filter: "sepia(1) saturate(5) hue-rotate(5deg)",
      }}
    >
      🎻
    </span>
  );
}

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
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 xl:px-8">
        <div className="flex h-20 items-center gap-4">
          {/* Brand: gold violin + exact two-line title from the reference */}
          <Link
            to={user ? "/dashboard" : "/"}
            className="group flex shrink-0 items-center gap-3"
            aria-label="Carnatic Raga Identification — Home"
          >
            <ViolinLogo />
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap font-serif text-lg font-bold text-gold-300 xl:text-xl">
                Carnatic Raga Identification
              </span>
              <span className="whitespace-nowrap font-serif text-sm text-white/80">
                Using Machine Learning
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          {user && (
            <div className="hidden 2xl:flex flex-1 min-w-0 items-center justify-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gold-500/15 text-gold-300"
                        : "text-white/70 hover:bg-white/5 hover:text-gold-300"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side: greeting, avatar and dropdown */}
          <div className="ml-auto hidden 2xl:flex shrink-0 items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-white/5"
                  aria-expanded={profileOpen}
                >
                  <span className="whitespace-nowrap text-sm text-white/70">
                    Namaste,{" "}
                    <span className="font-medium text-gold-300">
                      {user.username}
                    </span>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-300/70 bg-gradient-to-br from-yellow-300 via-gold-500 to-yellow-700 shadow-lg shadow-gold-500/20">
                      <span className="font-serif text-2xl text-white">
                        {initial}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gold-300 transition-transform ${
                        profileOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-80 overflow-hidden rounded-2xl border border-gold-500/20 bg-[#1b070c]/98 shadow-2xl shadow-black/50 backdrop-blur-xl">
                    <div className="border-b border-gold-500/10 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-gold-500 to-yellow-700">
                          <span className="font-serif text-xl text-white">
                            {initial}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {user.username}
                          </p>
                          <p className="truncate text-sm text-white/50">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/80 transition-colors hover:bg-white/5 hover:text-gold-300"
                    >
                      <User size={20} className="text-gold-400" />
                      <span className="font-medium">My Profile</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 border-t border-gold-500/10 px-5 py-4 text-white/80 transition-colors hover:bg-white/5 hover:text-red-300"
                    >
                      <LogOut size={20} className="text-gold-400" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-white/80 hover:text-gold-300"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary rounded-lg px-4 py-2 text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Compact navigation for tablet/mobile */}
          <button
            type="button"
            className="ml-auto text-white/80 2xl:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass-panel fade-in space-y-1 border-t border-gold-500/10 px-4 py-3 2xl:hidden">
          {user ? (
            <>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
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
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:text-gold-300"
              >
                <User size={16} />
                My Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300"
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
                className="block px-3 py-2.5 text-sm font-medium text-gold-300"
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


