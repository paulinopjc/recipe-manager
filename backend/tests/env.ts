process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recipe_manager_test'
process.env.JWT_SECRET = 'test-secret-needs-to-be-at-least-16-chars-long'
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
process.env.NODE_ENV = 'test'