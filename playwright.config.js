const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  use: {
    headless: false,
    trace: "retain-on-failure",
  },
  workers: 1,
});
