import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { AuthProvider } from "./context/AuthContext";
import { PredictionProvider } from "./context/PredictionContext";
import { ToastProvider } from "./context/ToastContext";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Identify from "./pages/Identify";
import Keyboard from "./pages/Keyboard";
import Ragas from "./pages/Ragas";
import History from "./pages/History";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/identify"
          element={
            <ProtectedRoute>
              <Identify />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keyboard"
          element={
            <ProtectedRoute>
              <Keyboard />
            </ProtectedRoute>
          }
        />
        <Route path="/ragas" element={<Ragas />} />
       <Route
  path="/history"
  element={
    <ProtectedRoute>
      <History />
    </ProtectedRoute>
  }
/>

<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  }
/>
        <Route
          path="*"
          element={
            <div className="min-h-[60vh] flex items-center justify-center text-white/50">
              Page not found
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
  <BrowserRouter>
    <PredictionProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </PredictionProvider>
  </BrowserRouter>
);
}
