describe('Login Page', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('should display the login form', () => {
    // Check if the login form elements are visible
    cy.contains('h1', 'Log In').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Log In');
    cy.contains('a', 'Sign up').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    // Click the login button without entering any data
    cy.get('button[type="submit"]').click();

    // Check if validation errors are displayed
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    // Intercept the login API call and mock a failed response
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: {
        message: 'Invalid email or password',
      },
    }).as('loginRequest');

    // Enter invalid credentials
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Wait for the API call to complete
    cy.wait('@loginRequest');

    // Check if error message is displayed
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should redirect to dashboard after successful login', () => {
    // Intercept the login API call and mock a successful response
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'fake-jwt-token',
        user: {
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          created_at: new Date().toISOString(),
        },
      },
    }).as('loginRequest');

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

    // Enter valid credentials
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Wait for the API call to complete
    cy.wait('@loginRequest');

    // Check if redirected to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to register page when clicking sign up link', () => {
    // Click the sign up link
    cy.contains('a', 'Sign up').click();

    // Check if redirected to register page
    cy.url().should('include', '/register');
  });
});
