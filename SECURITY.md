# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within Video2Tool, please send an email to use.manus.ai@gmail.com. All security vulnerabilities will be promptly addressed.

## API Keys and Secrets

Video2Tool requires several API keys and secrets to function properly. These should be handled securely:

1. **Never commit API keys or secrets to the repository**
   - Use environment variables or configuration files that are excluded from version control
   - Add sensitive files to `.gitignore`

2. **Use the provided example files**
   - Copy `.env.example` to `.env` and add your actual keys
   - Copy `video2tool_config.example.json` to `video2tool_config.json` and add your actual keys

3. **Rotate your API keys regularly**
   - Regularly update your API keys and secrets
   - Revoke any compromised keys immediately

## Environment Variables

The following environment variables contain sensitive information and should be protected:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`
- `OPENROUTER_API_KEY`
- `GITHUB_API_TOKEN`
- `TRELLO_API_KEY`
- `TRELLO_API_TOKEN`
- `CLICKUP_API_TOKEN`

## Configuration Files

The following configuration files may contain sensitive information:

- `.env` files
- `video2tool_config.json`
- `temp_config.json`

These files are included in `.gitignore` to prevent accidental commits.

## Best Practices

1. **Use environment variables for sensitive information**
   - Load environment variables from `.env` files
   - Never hardcode sensitive information

2. **Implement proper access controls**
   - Use authentication and authorization
   - Limit access to sensitive operations

3. **Validate and sanitize all inputs**
   - Prevent injection attacks
   - Validate all user inputs

4. **Keep dependencies updated**
   - Regularly update dependencies to patch security vulnerabilities
   - Use tools like `npm audit` to check for vulnerabilities

5. **Use HTTPS for all communications**
   - Encrypt all data in transit
   - Use secure cookies

6. **Implement proper error handling**
   - Don't expose sensitive information in error messages
   - Log errors securely
