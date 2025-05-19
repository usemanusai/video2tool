// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Declare global Cypress namespace to add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via API
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to create a project via API
       * @example cy.createProject('Test Project', 'This is a test project')
       */
      createProject(name: string, description?: string): Chainable<string>;
      
      /**
       * Custom command to upload a video via API
       * @example cy.uploadVideo('test-video.mp4', 'project1')
       */
      uploadVideo(filePath: string, projectId?: string): Chainable<string>;
      
      /**
       * Custom command to check if element is visible in viewport
       * @example cy.get('.element').isVisibleInViewport()
       */
      isVisibleInViewport(): Chainable<boolean>;
      
      /**
       * Custom command to drag and drop elements
       * @example cy.get('.draggable').dragTo('.droppable')
       */
      dragTo(targetSelector: string): Chainable<Element>;
    }
  }
}

// Login via API
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.intercept('POST', '**/api/auth/login').as('loginRequest');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: {
      email,
      password,
    },
  }).then((response) => {
    // Store the token in localStorage
    window.localStorage.setItem('token', response.body.access_token);
  });
});

// Create a project via API
Cypress.Commands.add('createProject', (name: string, description?: string) => {
  // Get the token from localStorage
  const token = window.localStorage.getItem('token');
  
  // Create the project
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/projects`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      name,
      description,
    },
  }).then((response) => {
    // Return the project ID
    return response.body.id;
  });
});

// Upload a video via API
Cypress.Commands.add('uploadVideo', (filePath: string, projectId?: string) => {
  // Get the token from localStorage
  const token = window.localStorage.getItem('token');
  
  // Create a FormData object
  const formData = new FormData();
  
  // Add the file to the FormData
  cy.fixture(filePath, 'binary').then((fileContent) => {
    const blob = Cypress.Blob.binaryStringToBlob(fileContent);
    formData.append('file', blob, filePath);
    
    if (projectId) {
      formData.append('project_id', projectId);
    }
    
    // Upload the video
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/videos/upload`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then((response) => {
      // Return the task ID
      return response.body.task_id;
    });
  });
});

// Check if element is visible in viewport
Cypress.Commands.add('isVisibleInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  
  return cy.window().then((window) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if the element is visible in the viewport
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewportHeight &&
      rect.right <= viewportWidth;
    
    return isInViewport;
  });
});

// Drag and drop elements
Cypress.Commands.add('dragTo', { prevSubject: true }, (subject, targetSelector) => {
  // Get the coordinates of the subject and target
  const subjectRect = subject[0].getBoundingClientRect();
  const subjectX = subjectRect.left + subjectRect.width / 2;
  const subjectY = subjectRect.top + subjectRect.height / 2;
  
  return cy.get(targetSelector).then((target) => {
    const targetRect = target[0].getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    // Perform the drag and drop
    cy.wrap(subject)
      .trigger('mousedown', { which: 1, pageX: subjectX, pageY: subjectY })
      .trigger('mousemove', { which: 1, pageX: targetX, pageY: targetY })
      .trigger('mouseup');
    
    return cy.wrap(subject);
  });
});
