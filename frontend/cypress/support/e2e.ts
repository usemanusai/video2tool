// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

// Log all API requests
Cypress.on('log:added', (log) => {
  if (log.displayName === 'xhr' && log.state === 'failed') {
    console.log(`XHR Failed: ${log.name} ${log.message}`);
  }
});

// Add better error messages for assertions
Cypress.on('fail', (error, runnable) => {
  // If the error is related to an assertion, add more context
  if (error.name === 'AssertionError') {
    error.message = `${error.message}\n\nTest: ${runnable.title}`;
  }
  throw error;
});

// Set default viewport size
beforeEach(() => {
  // Check if the test has specified a custom viewport
  const testViewportWidth = Cypress.currentTest.viewportWidth;
  const testViewportHeight = Cypress.currentTest.viewportHeight;
  
  if (testViewportWidth && testViewportHeight) {
    cy.viewport(testViewportWidth, testViewportHeight);
  }
});
