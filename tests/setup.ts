// Test setup - will be expanded with test DB setup/teardown
import "dotenv/config";

// Set test environment variables
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
process.env.ENCRYPTION_KEY = "test-encryption-key-32-chars!!!";
(process.env as any).NODE_ENV = "test";
