import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // Canlı GİB doğrulayıcısının koşum kapısı — bkz. __tests__/support/global-setup.ts.
    // Doğrulayıcı yoksa: REQUIRE_VALIDATOR=1 ise koşum KIRMIZI, değilse göze batan uyarı.
    globalSetup: ['./__tests__/support/global-setup.ts'],
  },
});
