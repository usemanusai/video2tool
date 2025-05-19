describe('Register Page', () => {
  beforeEach(() => {
    // Visit the register page before each test
    cy.visit('/register');
  });

  it('should display the registration form', () => {
    // Check if the registration form elements are visible
    cy.contains('h1', 'Create Account').should('be.visible');
    cy.get('input[name="fullName"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="confirmPassword"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Sign Up');
    cy.contains('a', 'Log in').should('be.visible');
  });

  it('should show validation errors for empty required fields', () => {
    // Click the register button without entering any data
    cy.get('button[type="submit"]').click();

    // Check if validation errors are displayed
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('should show validation error for invalid email', () => {
    // Enter invalid email
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Check if validation error is displayed
    cy.contains('Email is invalid').should('be.visible');
  });

  it('should show validation error for password mismatch', () => {
    // Enter mismatched passwords
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('different-password');
    cy.get('button[type="submit"]').click();

    // Check if validation error is displayed
    cy.contains('Passwords do not match').should('be.visible');
  });

  it('should show validation error for short password', () => {
    // Enter short password
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('short');
    cy.get('input[name="confirmPassword"]').type('short');
    cy.get('button[type="submit"]').click();

    // Check if validation error is displayed
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('should show error for email already in use', () => {
    // Intercept the register API call and mock a failed response
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 400,
      body: {
        message: 'Email already in use',
      },
    }).as('registerRequest');

    // Enter valid registration data
    cy.get('input[name="fullName"]').type('Test User');
    cy.get('input[name="email"]').type('existing@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Wait for the API call to complete
    cy.wait('@registerRequest');

    // Check if error message is displayed
    cy.contains('Email already in use').should('be.visible');
  });

  it('should redirect to dashboard after successful registration', () => {
    // Intercept the register API call and mock a successful response
    cy.intercept('POST', '**/api/auth/register', {
      statusCode: 201,
      body: {
        id: '123',
        email: 'new@example.com',
        full_name: 'New User',
        created_at: new Date().toISOString(),
      },
    }).as('registerRequest');

    // Intercept the login API call that happens after registration
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'fake-jwt-token',
        user: {
          id: '123',
          email: 'new@example.com',
          full_name: 'New User',
          created_at: new Date().toISOString(),
        },
      },
    }).as('loginRequest');

    // Enter valid registration data
    cy.get('input[name="fullName"]').type('New User');
    cy.get('input[name="email"]').type('new@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Wait for the API calls to complete
    cy.wait('@registerRequest');
    cy.wait('@loginRequest');

    // Check if redirected to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to login page when clicking log in link', () => {
    // Click the log in link
    cy.contains('a', 'Log in').click();

    // Check if redirected to login page
    cy.url().should('include', '/login');
  });
});
