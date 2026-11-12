import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    env: {
      NODE_ENV: 'test',
      PORT: '4100',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/sharon_contactless_test',
      JWT_SECRET: 'test-jwt-secret-key-at-least-32-characters-long',
      RAZORPAY_WEBHOOK_SECRET: 'test-razorpay-webhook-secret-12345',
      CASHFREE_WEBHOOK_SECRET: 'test-cashfree-webhook-secret-12345',
    },
  },
});
