const assert = require("node:assert/strict");
const test = require("node:test");

test("reads the frontend Supabase client config used by live-session bootstrap", async () => {
  const { readSupabaseClientConfig } = await import("../scripts/create-live-test-session.mjs");
  const source = `
    const SUPABASE_URL = "https://example.supabase.co";
    const SUPABASE_ANON_KEY =
      "public-anon-key";
  `;

  assert.deepEqual(readSupabaseClientConfig(source), {
    url: "https://example.supabase.co",
    anonKey: "public-anon-key",
  });
});
