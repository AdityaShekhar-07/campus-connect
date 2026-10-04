import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { EventDiscoveryPage } from './pages/EventDiscoveryPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { ParticipantListPage } from './pages/ParticipantListPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRole?: 'STUDENT' | 'ORGANIZER';
}> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // If student tries to access organizer, send to /events
    // If organizer tries to access student registrations, send to /organizer
    const fallback = user.role === 'ORGANIZER' ? '/organizer' : '/events';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/events" element={<EventDiscoveryPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />

                {/* Student Protected */}
                <Route
                  path="/registrations"
                  element={
                    <ProtectedRoute allowedRole="STUDENT">
                      <MyRegistrationsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Organizer Protected */}
                <Route
                  path="/organizer"
                  element={
                    <ProtectedRoute allowedRole="ORGANIZER">
                      <OrganizerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/new"
                  element={
                    <ProtectedRoute allowedRole="ORGANIZER">
                      <CreateEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:id/edit"
                  element={
                    <ProtectedRoute allowedRole="ORGANIZER">
                      <EditEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:id/participants"
                  element={
                    <ProtectedRoute allowedRole="ORGANIZER">
                      <ParticipantListPage />
                    </ProtectedRoute>
                  }
                />

                {/* Any Authenticated */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
