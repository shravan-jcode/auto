import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage        from "./pages/HomePage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import UserDashboard   from "./pages/UserDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AdminPanel      from "./pages/AdminPanel";
import HistoryPage     from "./pages/HistoryPage";
import RideDetailPage  from "./pages/RideDetailPage";

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"          element={<HomePage />} />
        <Route path="/login"     element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register"  element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* User */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={["user"]}>
            <UserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute allowedRoles={["user"]}>
            <HistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/ride/:id" element={
          <ProtectedRoute>
            <RideDetailPage />
          </ProtectedRoute>
        } />

        {/* Driver */}
        <Route path="/driver" element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverDashboard />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <span className="text-8xl block mb-4">🛺</span>
              <h1 className="font-display font-bold text-3xl text-auto-dark mb-2">404 - Page Not Found</h1>
              <p className="text-gray-500 mb-6">Looks like this road leads nowhere!</p>
              <a href="/" className="btn-primary px-8 py-3">Go Home</a>
            </div>
          </div>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
