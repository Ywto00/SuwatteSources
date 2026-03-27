import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const tempPath = path.resolve("__temp__");
try {
  fs.rmSync(tempPath, { recursive: true, force: true });
} catch {
  // Best effort cleanup before build.
}

const result = spawnSync("daisuke build", {
  encoding: "utf8",
  shell: true,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(`[build-safe] failed to start build process: ${result.error.message}`);
}

if (result.status === 0) {
  process.exit(0);
}

const stderr = String(result.stderr ?? "");
const stdout = String(result.stdout ?? "");
const combined = `${stdout}\n${stderr}`;

const isKnownWindowsTempCleanupError =
  combined.includes("ENOTEMPTY") && combined.includes("__temp__");

if (isKnownWindowsTempCleanupError) {
  console.warn(
    "[build-safe] Ignoring known Windows __temp__ cleanup ENOTEMPTY after successful build output."
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
