import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const serviceRoot = process.cwd();
const candidates =
  process.platform === "win32"
    ? [path.join(serviceRoot, ".venv", "Scripts", "python.exe"), "python"]
    : [path.join(serviceRoot, ".venv", "bin", "python"), "python3", "python"];

const pythonCommand = candidates.find((candidate) =>
  candidate.includes(path.sep) ? existsSync(candidate) : true
);

if (!pythonCommand) {
  console.error("Unable to find a usable Python interpreter for ai-engine.");
  process.exit(1);
}

const child = spawn(pythonCommand, ["-m", "app.main"], {
  cwd: serviceRoot,
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Failed to start ai-engine with ${pythonCommand}:`, error);
  process.exit(1);
});
