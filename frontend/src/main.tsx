import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@context/ThemeContext';
import { AuthProvider } from '@context/AuthContext';
import { CollaborationProvider } from '@context/CollaborationContext';
import CssBaseline from '@mui/material/CssBaseline';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import './i18n'; // Import i18n configuration
import LoadingScreen from '@components/common/LoadingScreen';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <BrowserRouter>
        <ThemeProvider>
          <CssBaseline />
          <AuthProvider>
            <CollaborationProvider>
              <App />
            </CollaborationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // Show a notification to the user about the update
    const shouldUpdate = window.confirm(
      'A new version of Video2Tool is available. Would you like to update now?'
    );

    if (shouldUpdate && registration.waiting) {
      // Send a message to the service worker to skip waiting and activate the new version
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page to load the new version
      window.location.reload();
    }
  },
  onSuccess: (registration) => {
    console.log('Service worker registered successfully');
  },
});
