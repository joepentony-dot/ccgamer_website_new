#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};
    for (let index = 0; index < args.length; index += 2) {
        const key = args[index].replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        result[key] = args[index + 1];
    }
    for (const required of ['baseUrl', 'output', 'report', 'screenshots']) {
        if (!result[required]) throw new Error(`Missing --${required.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
    }
    return result;
}

const args = parseArgs();
const screenshotsDir = path.resolve(args.screenshots);
fs.mkdirSync(screenshotsDir, { recursive: true });

const cases = [
    { name: 'mobile-touch', width: 390, height: 844, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' },
    { name: 'mobile-reduced-motion', width: 390, height: 844, isMobile: true, hasTouch: true, reducedMotion: 'reduce' },
    { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false, reducedMotion: 'no-preference' },
];

async function triggerTripleClick(page) {
    await page.evaluate(async () => {
        const logo = document.querySelector('.ccg-brand__logo');
        if (!logo) throw new Error('Logo trigger not found');
        const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
        for (let index = 0; index < 3; index += 1) {
            logo.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true,
                cancelable: true,
                composed: true,
                pointerType: 'touch',
                isPrimary: true,
                button: 0,
            }));
            await wait(170);
        }
    });
    await page.locator('.ccg-secret-modal.is-open').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1100);
}

async function elementViewportState(page, selector) {
    return page.evaluate(targetSelector => {
        const element = document.querySelector(targetSelector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const viewport = window.visualViewport;
        const width = viewport ? viewport.width : window.innerWidth;
        const height = viewport ? viewport.height : window.innerHeight;
        return {
            rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            viewport: { width, height },
            withinViewport: rect.top >= -2 && rect.left >= -2 && rect.right <= width + 2 && rect.bottom <= height + 2,
        };
    }, selector);
}

async function canvasMetrics(page) {
    return page.locator('[data-datasette-canvas]').evaluate(canvas => {
        const context = canvas.getContext('2d');
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let colouredPixels = 0;
        let brightPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
            const red = pixels[index];
            const green = pixels[index + 1];
            const blue = pixels[index + 2];
            if (red + green + blue > 80) colouredPixels += 1;
            if (red + green + blue > 500) brightPixels += 1;
        }
        return {
            width: canvas.width,
            height: canvas.height,
            colouredPixels,
            brightPixels,
        };
    });
}

async function runCase(browser, testCase) {
    const context = await browser.newContext({
        viewport: { width: testCase.width, height: testCase.height },
        screen: { width: testCase.width, height: testCase.height },
        isMobile: testCase.isMobile,
        hasTouch: testCase.hasTouch,
        reducedMotion: testCase.reducedMotion,
        deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.route('**/*', async route => {
        const url = route.request().url();
        if (url.startsWith(args.baseUrl)) {
            await route.continue();
        } else {
            await route.abort();
        }
    });

    await page.goto(new URL('home.html', args.baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(900);
    await page.evaluate(() => {
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.max(0, maximum - 320));
    });
    await page.waitForTimeout(150);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await triggerTripleClick(page);
    const loadMenuItemVisible = await page.locator('[data-ccg-secret-code="load"]').isVisible();
    await page.locator('[data-ccg-secret-code="load"]').click();
    await page.locator('.ccg-egg-overlay--datasette').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-ccg-datasette-ready="true"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(250);

    const frameState = await elementViewportState(page, '.ccg-egg-overlay--datasette .ccg-egg-overlay__frame');
    const mediaState = await page.evaluate(() => {
        const media = document.querySelector('.ccg-egg-overlay--datasette .ccg-egg-overlay__media');
        const root = document.querySelector('.ccg-datasette');
        if (!media || !root) return null;
        return {
            mediaClientWidth: media.clientWidth,
            mediaScrollWidth: media.scrollWidth,
            mediaClientHeight: media.clientHeight,
            mediaScrollHeight: media.scrollHeight,
            rootWidth: root.getBoundingClientRect().width,
            horizontalOverflow: media.scrollWidth > media.clientWidth + 2,
        };
    });
    const initialCanvas = await canvasMetrics(page);
    const initialSoundState = await page.locator('[data-datasette-sound]').getAttribute('aria-pressed');

    await page.locator('[data-datasette-play]').click();
    await page.waitForTimeout(450);
    const counterAfterPlay = await page.locator('[data-datasette-counter]').textContent();
    await page.locator('[data-datasette-stop]').click();
    const pausedState = await page.locator('.ccg-datasette').getAttribute('data-ccg-datasette-state');
    await page.locator('[data-datasette-rewind]').click();
    const counterAfterRewind = await page.locator('[data-datasette-counter]').textContent();

    await page.locator('[data-datasette-sound]').click();
    await page.waitForTimeout(150);
    const soundOnState = await page.locator('[data-datasette-sound]').getAttribute('aria-pressed');
    await page.locator('[data-datasette-sound]').click();
    const soundOffState = await page.locator('[data-datasette-sound]').getAttribute('aria-pressed');

    const target = await page.locator('.ccg-datasette').getAttribute('data-azimuth-target');
    await page.locator('[data-datasette-azimuth]').evaluate((slider, targetValue) => {
        slider.value = targetValue;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, target);
    await page.locator('[data-datasette-play]').click();
    await page.waitForFunction(() => document.querySelector('.ccg-datasette')?.dataset.ccgDatasetteState === 'success', null, { timeout: 7000 });

    const rewardVisible = await page.locator('[data-datasette-reward]').isVisible();
    await page.waitForTimeout(testCase.reducedMotion === 'reduce' ? 150 : 650);
    const rewardHref = await page.locator('[data-datasette-game-link]').getAttribute('href');
    const rewardTitle = (await page.locator('[data-datasette-game-title]').textContent())?.trim() || '';
    const rewardTitleState = await elementViewportState(page, '[data-datasette-game-title]');
    const rewardLinkState = await elementViewportState(page, '[data-datasette-game-link]');
    const successCanvas = await canvasMetrics(page);
    const successScreenshot = path.join(screenshotsDir, `${testCase.name}-datasette-success.png`);
    await page.screenshot({ path: successScreenshot, fullPage: false });

    await page.locator('.ccg-egg-overlay--datasette .ccg-egg-overlay__exit').click();
    await page.locator('.ccg-egg-overlay--datasette').waitFor({ state: 'detached', timeout: 5000 });
    await page.waitForTimeout(250);
    const scrollAfter = await page.evaluate(() => window.scrollY);

    let typedCommandWorks = true;
    if (testCase.name === 'desktop') {
        await page.keyboard.type('load', { delay: 90 });
        await page.locator('.ccg-egg-overlay--datasette').waitFor({ state: 'visible', timeout: 5000 });
        typedCommandWorks = await page.locator('[data-ccg-datasette-ready="true"]').isVisible({ timeout: 10000 });
        await page.locator('.ccg-egg-overlay--datasette .ccg-egg-overlay__exit').click();
        await page.locator('.ccg-egg-overlay--datasette').waitFor({ state: 'detached', timeout: 5000 });
    }

    const checks = {
        loadMenuItemVisible,
        overlayFrameWithinViewport: Boolean(frameState?.withinViewport),
        noHorizontalOverflow: mediaState?.horizontalOverflow === false,
        canvasHasDimensions: initialCanvas.width >= 200 && initialCanvas.height >= 100,
        canvasContainsColour: initialCanvas.colouredPixels > 500,
        canvasContainsBrightPixels: initialCanvas.brightPixels > 50,
        soundStartsOff: initialSoundState === 'false',
        counterAdvancesWhenPlaying: Number.parseInt(counterAfterPlay || '0', 10) > 0,
        stopPausesLoader: pausedState === 'paused',
        rewindResetsCounter: (counterAfterRewind || '').trim() === '000',
        soundCanBeEnabled: soundOnState === 'true',
        soundCanBeDisabled: soundOffState === 'false',
        loaderCompletesAtTarget: rewardVisible,
        rewardHasGameTitle: rewardTitle.length > 1,
        rewardTitleVisibleWithoutManualScroll: Boolean(rewardTitleState?.withinViewport),
        rewardLaunchVisibleWithoutManualScroll: Boolean(rewardLinkState?.withinViewport),
        rewardUsesCanonicalGameRoute: /^\/games\/[a-z0-9][a-z0-9-]*\/$/.test(new URL(rewardHref, args.baseUrl).pathname),
        successCanvasStillDrawn: successCanvas.colouredPixels > 500,
        scrollPositionRestored: Math.abs(scrollAfter - scrollBefore) <= 2,
        typedCommandWorks,
    };

    await context.close();
    return {
        ...testCase,
        scrollBefore,
        scrollAfter,
        target,
        frameState,
        mediaState,
        initialCanvas,
        successCanvas,
        counterAfterPlay,
        pausedState,
        counterAfterRewind,
        rewardHref,
        rewardTitle,
        rewardTitleState,
        rewardLinkState,
        checks,
        passed: Object.values(checks).every(Boolean),
        screenshot: successScreenshot,
    };
}

const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});

const results = [];
try {
    for (const testCase of cases) results.push(await runCase(browser, testCase));
} finally {
    await browser.close();
}

const failedChecks = [];
for (const result of results) {
    for (const [name, passed] of Object.entries(result.checks)) {
        if (!passed) failedChecks.push(`${result.name}: ${name}`);
    }
}

const evidence = {
    generatedAt: new Date().toISOString(),
    verdict: failedChecks.length ? 'FAIL' : 'PASS',
    failedChecks,
    testedCases: results.length,
    results,
};
fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(evidence, null, 2)}\n`);

const rows = results.map(result => `| ${result.name} | ${result.width}×${result.height} | ${result.passed ? 'PASS' : 'FAIL'} | ${result.rewardTitle || 'n/a'} |`).join('\n');
const report = `# Easter Egg E1 — Datasette Loading Validation\n\n## Verdict\n\n**${evidence.verdict}**\n\nThe LOAD command was tested through the three-click menu on mobile, reduced-motion mobile and desktop. The suite operated the transport buttons, toggled generated sound, tuned the azimuth challenge to completion, verified a canonical random-game reward and checked viewport/scroll restoration.\n\n| Case | Viewport | Result | Reward |\n|---|---:|---:|---|\n${rows}\n\n## Required behaviour\n\n- LOAD is present in the Easter egg menu and remains available as a typed command.\n- The datasette interface stays inside the visible viewport without horizontal overflow.\n- PLAY, STOP and REW operate the tape counter and state.\n- Sound remains off until the visitor enables it.\n- The signal canvas renders under normal and reduced-motion settings.\n- Holding the correct azimuth completes the loader and selects a canonical game route.\n- Closing restores the original page position.\n\n## Failed checks\n\n${failedChecks.length ? failedChecks.map(item => `- ${item}`).join('\n') : '- None'}\n`;
fs.writeFileSync(path.resolve(args.report), report);
console.log(JSON.stringify({ verdict: evidence.verdict, failedChecks, testedCases: results.length }, null, 2));
if (failedChecks.length) process.exit(1);
