import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
  
  viewportWidth: 1280,
  viewportHeight: 720,
  
  // Retry failed tests
  retries: {
    runMode: 2,
    openMode: 0,
  },
  
  // Video recording settings
  video: true,
  videoCompression: 32,
  
  // Screenshot settings
  screenshotOnRunFailure: true,
  
  // Default timeout values
  defaultCommandTimeout: 5000,
  requestTimeout: 10000,
  responseTimeout: 30000,
  
  // Environment variables
  env: {
    apiUrl: 'http://localhost:8000',
  },
});
