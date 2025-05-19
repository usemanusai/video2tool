import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

// Context providers
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from '@/context/ThemeContext';
import { SocketProvider } from '@/context/SocketContext';
import { VideoProvider } from '@/context/VideoContext';
import { SpecProvider } from '@/context/SpecContext';
import { TaskProvider } from '@/context/TaskContext';

// Components
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorBoundary from '@/components/error/ErrorBoundary';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import VideosPage from '@/pages/videos/VideosPage';
import VideoDetailPage from '@/pages/videos/VideoDetailPage';
import VideoUploadPage from '@/pages/videos/VideoUploadPage';
import SpecificationsPage from '@/pages/specifications/SpecificationsPage';
import SpecDetailPage from '@/pages/specifications/SpecDetailPage';
import TasksPage from '@/pages/tasks/TasksPage';
import TaskDetailPage from '@/pages/tasks/TaskDetailPage';
import IntegrationsPage from '@/pages/integrations/IntegrationsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Utilities
import { initAnalytics } from '@/utils/analytics';

// Main App component
const App: React.FC = () => {
  // Initialize analytics
  useEffect(() => {
    initAnalytics({
      enabled: import.meta.env.NODE_ENV === 'production',
      trackingId: import.meta.env.VITE_ANALYTICS_ID,
      debug: import.meta.env.NODE_ENV !== 'production',
    });
  }, []);

  return (
    <ErrorBoundary>
      <CustomThemeProvider>
        <ThemeProvider theme={theme => theme}>
          <CssBaseline />
          <SnackbarProvider maxSnack={3} autoHideDuration={5000}>
            <AuthProvider>
              <SocketProvider>
                <VideoProvider>
                  <SpecProvider>
                    <TaskProvider>
                      <Router>
                        <Suspense fallback={<LoadingScreen />}>
                          <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                            
                            {/* Protected routes */}
                            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                              <Route index element={<HomePage />} />
                              <Route path="profile" element={<ProfilePage />} />
                              <Route path="settings" element={<SettingsPage />} />
                              <Route path="videos" element={<VideosPage />} />
                              <Route path="videos/:id" element={<VideoDetailPage />} />
                              <Route path="videos/upload" element={<VideoUploadPage />} />
                              <Route path="specifications" element={<SpecificationsPage />} />
                              <Route path="specifications/:id" element={<SpecDetailPage />} />
                              <Route path="tasks" element={<TasksPage />} />
                              <Route path="tasks/:id" element={<TaskDetailPage />} />
                              <Route path="integrations" element={<IntegrationsPage />} />
                            </Route>
                            
                            {/* 404 route */}
                            <Route path="*" element={<NotFoundPage />} />
                          </Routes>
                        </Suspense>
                      </Router>
                    </TaskProvider>
                  </SpecProvider>
                </VideoProvider>
              </SocketProvider>
            </AuthProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </CustomThemeProvider>
    </ErrorBoundary>
  );
};

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default App;