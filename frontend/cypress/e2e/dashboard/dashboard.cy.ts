describe('Dashboard Page', () => {
  beforeEach(() => {
    // Mock the authentication
    cy.window().then((window) => {
      window.localStorage.setItem('token', 'fake-jwt-token');
    });

    // Intercept the current user API call
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
      },
    }).as('getCurrentUser');

    // Intercept the projects API call
    cy.intercept('GET', '**/api/projects', {
      statusCode: 200,
      body: [
        {
          id: 'project1',
          name: 'Test Project 1',
          description: 'This is a test project',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'project2',
          name: 'Test Project 2',
          description: 'Another test project',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }).as('getProjects');

    // Visit the dashboard page
    cy.visit('/dashboard');

    // Wait for the API calls to complete
    cy.wait('@getCurrentUser');
    cy.wait('@getProjects');
  });

  it('should display the dashboard with welcome message', () => {
    // Check if the welcome message is displayed
    cy.contains('Welcome, Test User').should('be.visible');
    cy.contains("Here's an overview of your projects and recent activity").should('be.visible');
  });

  it('should display project statistics', () => {
    // Check if project statistics are displayed
    cy.contains('Projects').should('be.visible');
    cy.contains('2').should('be.visible'); // Number of projects
  });

  it('should display recent projects', () => {
    // Check if recent projects are displayed
    cy.contains('Recent Projects').should('be.visible');
    cy.contains('Test Project 1').should('be.visible');
    cy.contains('Test Project 2').should('be.visible');
  });

  it('should navigate to project details when clicking on a project', () => {
    // Click on a project
    cy.contains('Test Project 1').click();

    // Check if redirected to project details page
    cy.url().should('include', '/projects/project1');
  });

  it('should navigate to upload page when clicking upload button', () => {
    // Click on the upload button
    cy.contains('button', 'Upload Video').click();

    // Check if redirected to upload page
    cy.url().should('include', '/upload');
  });

  it('should navigate to projects page when clicking view all projects', () => {
    // Click on the view all projects button
    cy.contains('button', 'View All').click();

    // Check if redirected to projects page
    cy.url().should('include', '/projects');
  });

  it('should display quick action buttons', () => {
    // Check if quick action buttons are displayed
    cy.contains('Quick Actions').should('be.visible');
    cy.contains('button', 'Upload Video').should('be.visible');
    cy.contains('button', 'Manage Projects').should('be.visible');
    cy.contains('button', 'View Specifications').should('be.visible');
    cy.contains('button', 'Manage Tasks').should('be.visible');
  });

  it('should navigate to correct pages when clicking quick action buttons', () => {
    // Click on the manage projects button
    cy.contains('button', 'Manage Projects').click();

    // Check if redirected to projects page
    cy.url().should('include', '/projects');

    // Go back to dashboard
    cy.visit('/dashboard');
    cy.wait('@getCurrentUser');
    cy.wait('@getProjects');

    // Click on the view specifications button
    cy.contains('button', 'View Specifications').click();

    // Check if redirected to specifications page
    cy.url().should('include', '/specifications');

    // Go back to dashboard
    cy.visit('/dashboard');
    cy.wait('@getCurrentUser');
    cy.wait('@getProjects');

    // Click on the manage tasks button
    cy.contains('button', 'Manage Tasks').click();

    // Check if redirected to tasks page
    cy.url().should('include', '/tasks');
  });
});
