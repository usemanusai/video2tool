import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import Layout from '@components/layout/Layout';
import LoadingScreen from '@components/common/LoadingScreen';
import { initAnalytics } from '@/utils/analytics';

// Public pages
const HomePage = lazy(() => import('@pages/HomePage'));
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));

// Protected pages
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('@pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@pages/projects/ProjectDetailPage'));
const VideoUploadPage = lazy(() => import('@pages/videos/VideoUploadPage'));
const VideoAnalysisPage = lazy(() => import('@pages/videos/VideoAnalysisPage'));
const SpecificationPage = lazy(() => import('@pages/specifications/SpecificationPage'));
const TasksPage = lazy(() => import('@pages/tasks/TasksPage'));
const IntegrationsPage = lazy(() => import('@pages/integrations/IntegrationsPage'));
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'));

// Route protection component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Initialize analytics
  useEffect(() => {
    initAnalytics({
      enabled: process.env.NODE_ENV === 'production',
      trackingId: process.env.REACT_APP_ANALYTICS_ID,
      debug: process.env.NODE_ENV !== 'production',
    });
  }, []);
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={
          <Suspense fallback={<LoadingScreen />}>
            <HomePage />
          </Suspense>
        } />
        <Route path="login" element={
          <Suspense fallback={<LoadingScreen />}>
            <LoginPage />
          </Suspense>
        } />
        <Route path="register" element={
          <Suspense fallback={<LoadingScreen />}>
            <RegisterPage />
          </Suspense>
        } />

        {/* Protected routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="projects"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ProjectsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="projects/:projectId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ProjectDetailPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="upload"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <VideoUploadPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="analysis/:analysisId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <VideoAnalysisPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="specifications/:specId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <SpecificationPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="tasks/:taskSetId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <TasksPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="integrations"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <IntegrationsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
