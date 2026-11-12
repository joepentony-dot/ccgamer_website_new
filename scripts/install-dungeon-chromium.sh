#!/usr/bin/env bash
set -euo pipefail

npm install --no-save --no-package-lock playwright@1.55.0
npx --no-install playwright install chromium

probe_chromium() {
  timeout 45s node <<'JS'
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ timeout: 30_000 });
  try {
    const page = await browser.newPage();
    await page.setContent("<canvas></canvas>");
    if (!await page.locator("canvas").evaluate(canvas => Boolean(canvas.getContext("2d")))) {
      throw new Error("Chromium could not create a 2D canvas context");
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
JS
}

if ! probe_chromium; then
  echo "Pinned Chromium probe failed; installing Playwright system dependencies."
  sudo rm -f /etc/apt/sources.list.d/google-chrome.list
  npx --no-install playwright install-deps chromium
  probe_chromium
fi
