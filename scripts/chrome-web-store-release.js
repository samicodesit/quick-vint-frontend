#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://chromewebstore.googleapis.com";
const CHROME_WEB_STORE_SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const DEFAULT_PUBLISHER_ID = "616efd8f-d3cc-4a95-9b45-d48a0f4ad3e7";
const DEFAULT_EXTENSION_ID = "mommklhpammnlojjobejddmidmdcalcl";

function usage() {
  console.error(`
Usage:
  node scripts/chrome-web-store-release.js --zip dist/autolister-ai-vX.Y.Z.zip [--mode upload|upload-and-submit]

Required credentials:
  CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON=<raw JSON or base64 JSON>

Optional:
  CHROME_WEB_STORE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  CHROME_WEB_STORE_PUBLISHER_ID=${DEFAULT_PUBLISHER_ID}
  CHROME_WEB_STORE_EXTENSION_ID=${DEFAULT_EXTENSION_ID}
`);
}

function parseArgs(argv) {
  const args = {
    mode: process.env.CHROME_WEB_STORE_RELEASE_MODE || "upload",
    zipPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--zip") {
      args.zipPath = next;
      index += 1;
    } else if (arg === "--mode") {
      args.mode = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.zipPath) {
    throw new Error("--zip is required");
  }

  if (!["upload", "upload-and-submit"].includes(args.mode)) {
    throw new Error('--mode must be "upload" or "upload-and-submit"');
  }

  return args;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function getServiceAccountRawJson() {
  const rawJson = process.env.CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON;
  if (rawJson && rawJson.trim()) {
    const trimmed = rawJson.trim();
    if (trimmed.startsWith("{")) {
      return trimmed;
    }
    return Buffer.from(trimmed, "base64").toString("utf8");
  }

  const credentialsPath =
    process.env.CHROME_WEB_STORE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error(
      "Set CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON or CHROME_WEB_STORE_SERVICE_ACCOUNT_FILE",
    );
  }

  return fs.readFileSync(path.resolve(credentialsPath), "utf8");
}

function loadServiceAccount() {
  const credentials = JSON.parse(getServiceAccountRawJson());

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("Service account JSON must include client_email and private_key");
  }

  return credentials;
}

function createJwtAssertion(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    iss: credentials.client_email,
    scope: CHROME_WEB_STORE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(credentials.private_key)
    .toString("base64url");

  return `${unsignedJwt}.${signature}`;
}

async function fetchAccessToken(credentials) {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: createJwtAssertion(credentials),
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(`Token request failed (${response.status}): ${formatPayload(payload)}`);
  }

  if (!payload.access_token) {
    throw new Error("Token response did not include access_token");
  }

  return payload.access_token;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

async function chromeWebStoreFetch(url, { method, token, body, contentType }) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const payload = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(`${method} ${url} failed (${response.status}): ${formatPayload(payload)}`);
  }

  return payload;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 2)} ${units[power]}`;
}

function resolveConfig(args) {
  const zipPath = path.resolve(args.zipPath);

  if (!fs.existsSync(zipPath)) {
    throw new Error(`ZIP not found: ${zipPath}`);
  }

  return {
    zipPath,
    mode: args.mode,
    publisherId: process.env.CHROME_WEB_STORE_PUBLISHER_ID || DEFAULT_PUBLISHER_ID,
    extensionId: process.env.CHROME_WEB_STORE_EXTENSION_ID || DEFAULT_EXTENSION_ID,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = resolveConfig(args);
  const credentials = loadServiceAccount();
  const zip = fs.readFileSync(config.zipPath);
  const itemName = `publishers/${config.publisherId}/items/${config.extensionId}`;

  console.log(`Chrome Web Store item: ${itemName}`);
  console.log(`Package: ${config.zipPath} (${formatBytes(zip.length)})`);
  console.log(`Mode: ${config.mode}`);
  console.log(`Service account: ${credentials.client_email}`);

  const token = await fetchAccessToken(credentials);

  const uploadUrl = `${API_ROOT}/upload/v2/${itemName}:upload`;
  const uploadResult = await chromeWebStoreFetch(uploadUrl, {
    method: "POST",
    token,
    body: zip,
    contentType: "application/zip",
  });

  console.log("Upload result:");
  console.log(formatPayload(uploadResult));

  const statusUrl = `${API_ROOT}/v2/${itemName}:fetchStatus`;
  const statusResult = await chromeWebStoreFetch(statusUrl, {
    method: "GET",
    token,
  });

  console.log("Current store status:");
  console.log(formatPayload(statusResult));

  if (config.mode === "upload-and-submit") {
    const publishUrl = `${API_ROOT}/v2/${itemName}:publish`;
    const publishResult = await chromeWebStoreFetch(publishUrl, {
      method: "POST",
      token,
      body: JSON.stringify({}),
      contentType: "application/json",
    });

    console.log("Publish result:");
    console.log(formatPayload(publishResult));
  }
}

main().catch((error) => {
  console.error(`Chrome Web Store release failed: ${error.message}`);
  process.exit(1);
});
