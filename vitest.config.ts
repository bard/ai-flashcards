/// <reference types="vitest" />
import { defineConfig, configDefaults } from "vitest/config";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        "src/**/*.test.fixtures.ts",
      ],
    },
  },
});
