const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const MAX_WINDOWS_LOCK_RETRIES = 3;

function runPrismaGenerate() {
  const command = "corepack pnpm prisma generate";
  return spawnSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true
  });
}

function printOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function hasWindowsEngineLockError(output) {
  return (
    output.includes("EPERM: operation not permitted, rename") &&
    output.includes("query_engine-windows.dll.node")
  );
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function hasExistingGeneratedClient() {
  const clientDir = path.resolve(process.cwd(), "..", "..", "node_modules", ".prisma", "client");
  const queryEngine = path.join(clientDir, "query_engine-windows.dll.node");
  const clientIndex = path.join(clientDir, "index.js");
  return fs.existsSync(queryEngine) && fs.existsSync(clientIndex);
}

function runWithRetry() {
  for (let attempt = 1; attempt <= MAX_WINDOWS_LOCK_RETRIES; attempt += 1) {
    const result = runPrismaGenerate();
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    const lockError = process.platform === "win32" && hasWindowsEngineLockError(output);

    if (result.status === 0) {
      return { result, output, attempt };
    }

    if (!lockError || attempt >= MAX_WINDOWS_LOCK_RETRIES) {
      return { result, output, attempt };
    }

    printOutput(result);
    process.stderr.write(
      `[prisma-generate-safe] Attempt ${attempt}/${MAX_WINDOWS_LOCK_RETRIES} hit Windows query engine lock, retrying...\n`
    );
    sleep(800 * attempt);
  }

  const result = runPrismaGenerate();
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  return { result, output, attempt: MAX_WINDOWS_LOCK_RETRIES + 1 };
}

const { result, output, attempt } = runWithRetry();

if (result.error) {
  process.stderr.write(`[prisma-generate-safe] ${String(result.error)}\n`);
}

if (result.status === 0) {
  printOutput(result);
  if (process.platform === "win32" && attempt > 1) {
    process.stderr.write(
      `[prisma-generate-safe] Recovered after retry (${attempt}/${MAX_WINDOWS_LOCK_RETRIES}).\n`
    );
  }
  process.exit(0);
}

if (
  process.platform === "win32" &&
  hasWindowsEngineLockError(output) &&
  hasExistingGeneratedClient()
) {
  printOutput(result);
  process.stderr.write(
    "\n[prisma-generate-safe] Detected locked query engine on Windows. Existing Prisma client found; continuing.\n"
  );
  process.exit(0);
}

printOutput(result);
process.exit(result.status || 1);
