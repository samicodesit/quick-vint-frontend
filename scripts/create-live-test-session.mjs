import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

export function readSupabaseClientConfig(source) {
  const url = source.match(/const SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
  const anonKey = source.match(/const SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];
  if (!url || !anonKey) throw new Error("Supabase client config was not found in background.js");
  return { url, anonKey };
}

async function main(env = process.env) {
  const email = env.AUTOLISTER_LIVE_TEST_EMAIL || "samicodesit+ai-style-test@gmail.com";
  const otp = String(env.AUTOLISTER_LIVE_TEST_OTP || "").trim();
  const link = String(env.AUTOLISTER_LIVE_TEST_LINK || "").trim();
  const output = env.AUTOLISTER_LIVE_SESSION_FILE || "/tmp/autolister-live-session.json";
  if (!otp && !link) throw new Error("AUTOLISTER_LIVE_TEST_OTP or AUTOLISTER_LIVE_TEST_LINK is required");

  const config = readSupabaseClientConfig(
    readFileSync(path.join(repoRoot, "background.js"), "utf8"),
  );
  const params = link
    ? { token_hash: new URL(link).searchParams.get("token"), type: "magiclink" }
    : { email, token: otp, type: "email" };
  if (link && !params.token_hash) throw new Error("Magic link has no token");
  const { data, error } = await createClient(config.url, config.anonKey).auth.verifyOtp(params);
  if (error || !data.session?.access_token) throw error || new Error("No session returned");

  writeFileSync(output, JSON.stringify(data.session), { mode: 0o600 });
  chmodSync(output, 0o600);
  console.log(JSON.stringify({ email: data.user?.email, userId: data.user?.id, output }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
