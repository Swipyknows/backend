/**
 * Load Test Script using Autocannon
 * Tests your VideoTube backend routes for throughput & latency
 *
 * Usage:
 *   node load-test.js                  → runs default test (GET /api/v1/videos)
 *   node load-test.js videos           → test GET all videos
 *   node load-test.js health           → test a lightweight health check
 *
 * Make sure your backend is running before executing this script!
 */

import autocannon from "autocannon";

const BASE_URL = "http://localhost:8000";

// ─── Auth token (only needed for protected routes) ──────────────────────────
// Paste your JWT token here if you want to test protected endpoints
const JWT_TOKEN = "YOUR_JWT_TOKEN_HERE";

// ─── Route Presets ──────────────────────────────────────────────────────────
const TESTS = {
  // Public routes (no auth needed)
  videos: {
    title: "GET /api/v1/videos  (all videos, cached)",
    url: `${BASE_URL}/api/v1/videos`,
    method: "GET",
  },

  recommendations: {
    title: "GET /api/v1/recommendations",
    url: `${BASE_URL}/api/v1/recommendations`,
    method: "GET",
  },

  // Protected routes (requires JWT_TOKEN above)
  videoById: {
    title: "GET /api/v1/videos/:id  (single video, cached)",
    url: `${BASE_URL}/api/v1/videos/REPLACE_WITH_REAL_VIDEO_ID`,
    method: "GET",
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
  },

  comments: {
    title: "GET /api/v1/comments/REPLACE_WITH_VIDEO_ID",
    url: `${BASE_URL}/api/v1/comments/REPLACE_WITH_REAL_VIDEO_ID`,
    method: "GET",
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
  },
};

// ─── Load Test Config ────────────────────────────────────────────────────────
const LOAD_CONFIG = {
  connections: 10,   // concurrent connections (like virtual users)
  pipelining: 1,     // requests per connection in-flight at once
  duration: 10,      // seconds to run
  // amount: 1000,   // OR use fixed request count instead of duration
};

// ─── Run ─────────────────────────────────────────────────────────────────────
const arg = process.argv[2] || "videos";
const test = TESTS[arg];

if (!test) {
  console.error(`\n❌  Unknown test: "${arg}"`);
  console.error(`    Available: ${Object.keys(TESTS).join(", ")}\n`);
  process.exit(1);
}

console.log(`\n🚀  Starting load test: ${test.title}`);
console.log(`    Connections : ${LOAD_CONFIG.connections}`);
console.log(`    Duration    : ${LOAD_CONFIG.duration}s`);
console.log(`    URL         : ${test.url}\n`);

const instance = autocannon(
  {
    url: test.url,
    method: test.method,
    headers: test.headers || {},
    connections: LOAD_CONFIG.connections,
    pipelining: LOAD_CONFIG.pipelining,
    duration: LOAD_CONFIG.duration,
    // amount: LOAD_CONFIG.amount,
  },
  (err, result) => {
    if (err) {
      console.error("❌  Error:", err.message);
      process.exit(1);
    }

    console.log("\n📊  Results Summary:");
    console.log("─".repeat(50));
    console.log(`  Requests/sec   : ${result.requests.average.toFixed(1)}`);
    console.log(`  Throughput/sec : ${formatBytes(result.throughput.average)}`);
    console.log(`  Total requests : ${result.requests.total}`);
    console.log(`  Errors         : ${result.errors}`);
    console.log(`  Timeouts       : ${result.timeouts}`);
    console.log("\n  Latency (ms):");
    console.log(`    min    : ${result.latency.min}`);
    console.log(`    avg    : ${result.latency.average.toFixed(2)}`);
    console.log(`    p99    : ${result.latency.p99}`);
    console.log(`    max    : ${result.latency.max}`);
    console.log("─".repeat(50));

    if (result.errors > 0 || result.timeouts > 0) {
      console.log("\n⚠️  Some requests failed — check your server logs!");
    } else {
      console.log("\n✅  All requests completed successfully.");
    }
  }
);

// Live progress bar in terminal
autocannon.track(instance, { renderProgressBar: true });

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

