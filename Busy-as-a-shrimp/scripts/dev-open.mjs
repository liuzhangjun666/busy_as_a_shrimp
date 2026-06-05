import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const port = process.argv[2] || 3000;
const WEB_URL = `http://localhost:${port}`;
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  // Linux (including Docker) - attempt to open browser, silently ignore if not available
  const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.on("error", () => {
    /* silently ignore, e.g. inside a Docker container */
  });
  child.unref();
}

async function waitForWebReady(url, timeoutMs = 60000) {
  const startAt = Date.now();
  while (Date.now() - startAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  const alreadyReady = await waitForWebReady(WEB_URL, 2000);
  if (alreadyReady) {
    openBrowser(WEB_URL);
    // Don't return, we still need to start the next dev server
  }

  const child = spawn(process.execPath, [nextBin, "dev", "-p", port.toString()], {
    stdio: "inherit"
  });

  if (!alreadyReady) {
    let opened = false;
    waitForWebReady(WEB_URL)
      .then((ready) => {
        if (ready && !opened) {
          openBrowser(WEB_URL);
          opened = true;
        }
      })
      .catch(() => {
        // Ignore browser-open failures and keep dev server running.
      });
  }

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

void main();
