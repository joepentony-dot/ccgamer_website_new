import fs from "node:fs";
import process from "node:process";
import { chromium } from "playwright-core";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
    if (item.startsWith("--")) pairs.push([item.slice(2), all[index + 1]]);
    return pairs;
}, []));

const baseURL = args["base-url"] || "http://127.0.0.1:4173/";
const outputPath = args.output || "docs/seo-baseline/easter-egg-e11-evidence.json";
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

const cases = [
    { name: "desktop", viewport: { width: 1366, height: 768 }, mobile: false, reducedMotion: "no-preference" },
    { name: "mobile", viewport: { width: 390, height: 844 }, mobile: true, reducedMotion: "no-preference" },
    { name: "short-mobile", viewport: { width: 360, height: 640 }, mobile: true, reducedMotion: "reduce" },
];

const experiences = [
    ["bbs", ".ccg-e11--bbs"],
    ["guru", ".ccg-e11--guru"],
    ["sid", ".ccg-e11--sid"],
    ["1541", ".ccg-e11--1541"],
    ["cracktro", ".ccg-e11--cracktro"],
    ["workbench", ".ccg-e11--workbench"],
    ["sprite", ".ccg-e11--sprite"],
    ["modem", ".ccg-e11--modem"],
    ["readerror", ".ccg-e11--diskerror"],
    ["kickstart", ".ccg-e11--kickstart"],
];

async function openSecretMenu(page, mobile) {
    await page.evaluate(async isMobile => {
        const logo = document.querySelector(".ccg-brand__logo");
        if (!logo) throw new Error("CCG brand logo not found");
        for (let index = 0; index < 3; index += 1) {
            logo.dispatchEvent(new PointerEvent("pointerdown", {
                bubbles: true,
                cancelable: true,
                composed: true,
                isPrimary: true,
                pointerId: 1,
                pointerType: isMobile ? "touch" : "mouse",
            }));
            await new Promise(resolve => setTimeout(resolve, 180));
        }
    }, mobile);
    await page.waitForSelector(".ccg-secret-modal.is-open", { timeout: 10000 });
    await page.waitForTimeout(1050);
}

async function interact(page, code) {
    if (code === "bbs") {
        if (await page.locator(".ccg-e11--bbs .ccg-e11__bbs-status").count() !== 1) throw new Error("Premium BBS status panel missing");
        const input = page.locator(".ccg-e11--bbs [data-terminal-input]");
        await input.fill("HELP");
        await input.press("Enter");
        await page.waitForFunction(() => document.querySelector(".ccg-e11--bbs")?.textContent.includes("CCG-BBS COMMAND DIRECTORY"));
        await input.fill("FILES C64");
        await input.press("Enter");
        await page.waitForFunction(() => document.querySelector(".ccg-e11--bbs")?.textContent.includes("SID-LAB.PRG"));
        await input.fill("PRIVATE");
        await input.press("Enter");
        await page.waitForFunction(() => document.querySelector(".ccg-e11--bbs")?.textContent.includes("LEVEL 1541"));
        await input.fill("1541");
        await input.press("Enter");
        await page.waitForSelector(".ccg-e11--1541", { timeout: 5000 });
    }

    if (code === "guru") {
        await page.locator('.ccg-e11--guru [data-guru="details"]').click();
        await page.locator("[data-guru-details]").waitFor({ state: "visible" });
        if (await page.locator(".ccg-e11__guru-registers").count() !== 1) throw new Error("Guru register monitor missing");
        await page.locator('.ccg-e11--guru [data-guru="dump"]').click();
        await page.locator("[data-guru-dump]").waitFor({ state: "visible" });
        const reboot = page.locator('.ccg-e11--guru [data-guru="reboot"]');
        await reboot.click();
        await page.waitForSelector(".ccg-e11--guru.is-recovered");
        if (await reboot.textContent() !== "OPEN WORKBENCH") throw new Error("Guru recovery did not expose Workbench handoff");
        await reboot.click();
        await page.waitForSelector(".ccg-e11--workbench", { timeout: 5000 });
    }

    if (code === "sid") {
        if (await page.locator(".ccg-e11--sid [data-sid-preset]").count() < 3) throw new Error("SID premium presets missing");
        await page.locator('.ccg-e11--sid [data-sid-preset="LEAD"]').click();
        await page.locator(".ccg-e11--sid [data-note]").first().click();
        await page.waitForFunction(() => {
            const text = document.querySelector("[data-sid-status]")?.textContent || "";
            return /HZ|AUDIO UNAVAILABLE/.test(text);
        });
        await page.locator(".ccg-e11--sid [data-sid-panic]").click();
    }

    if (code === "1541") {
        if (await page.locator(".ccg-e11--1541 [data-drive-track]").count() !== 1) throw new Error("1541 telemetry missing");
        await page.locator('.ccg-e11--1541 [data-e11-action="DIRECTORY"]').click();
        await page.waitForFunction(() => document.querySelector(".ccg-e11--1541")?.textContent.includes("BLOCKS FREE"));
        await page.locator('.ccg-e11--1541 [data-e11-action="VALIDATE"]').click();
        await page.waitForFunction(() => document.querySelector(".ccg-e11--1541")?.textContent.includes("31 FILE ENTRIES CHECKED"));
    }

    if (code === "cracktro") {
        await page.locator(".ccg-e11--cracktro [data-cracktro-sound]").click();
        const fx = page.locator(".ccg-e11--cracktro [data-cracktro-effect]");
        const beforeFx = await fx.textContent();
        await fx.click();
        const afterFx = await fx.textContent();
        if (beforeFx === afterFx) throw new Error("Cracktro FX control did not change effect");
        await page.locator(".ccg-e11--cracktro [data-cracktro-pause]").click();
        const pauseText = await page.locator(".ccg-e11--cracktro [data-cracktro-pause]").textContent();
        if (pauseText !== "RESUME") throw new Error("Cracktro pause control did not change state");
    }

    if (code === "workbench") {
        await page.locator('.ccg-e11--workbench [data-wb-open="games"]').click();
        await page.locator(".ccg-e11--workbench [data-wb-window]").waitFor({ state: "visible" });
        await page.locator('.ccg-e11--workbench [data-wb-open="prefs"]').click();
        await page.locator('.ccg-e11--workbench [data-wb-palette="dark"]').click();
        const palette = await page.locator(".ccg-e11--workbench").getAttribute("data-wb-palette");
        if (palette !== "dark") throw new Error("Workbench palette preference did not apply");
        await page.locator('.ccg-e11--workbench [data-wb-open="tools"]').click();
        await page.locator('.ccg-e11--workbench [data-wb-tool="sid"]').click();
        await page.waitForSelector(".ccg-e11--sid", { timeout: 5000 });
    }

    if (code === "sprite") {
        if (await page.locator(".ccg-e11--sprite [data-sprite-preview]").count() !== 1) throw new Error("Sprite live preview missing");
        if (await page.locator(".ccg-e11--sprite [data-sprite-colour]").count() !== 16) throw new Error("Sprite C64 palette incomplete");
        const data = page.locator(".ccg-e11--sprite [data-sprite-data]");
        const before = await data.inputValue();
        const first = page.locator(".ccg-e11--sprite .ccg-e11__pixel").nth(0);
        const second = page.locator(".ccg-e11--sprite .ccg-e11__pixel").nth(1);
        const firstBox = await first.boundingBox();
        const secondBox = await second.boundingBox();
        if (!firstBox || !secondBox) throw new Error("Sprite pixels were not measurable");
        await page.evaluate(({ firstPoint, secondPoint }) => {
            const grid = document.querySelector(".ccg-e11--sprite [data-sprite-grid]");
            const firstCell = document.querySelector(".ccg-e11--sprite .ccg-e11__pixel");
            firstCell.dispatchEvent(new PointerEvent("pointerdown", {
                bubbles: true,
                cancelable: true,
                pointerId: 7,
                pointerType: "touch",
                isPrimary: true,
                clientX: firstPoint.x,
                clientY: firstPoint.y,
            }));
            grid.dispatchEvent(new PointerEvent("pointermove", {
                bubbles: true,
                cancelable: true,
                pointerId: 7,
                pointerType: "touch",
                isPrimary: true,
                clientX: secondPoint.x,
                clientY: secondPoint.y,
            }));
            window.dispatchEvent(new PointerEvent("pointerup", {
                bubbles: true,
                pointerId: 7,
                pointerType: "touch",
                isPrimary: true,
                clientX: secondPoint.x,
                clientY: secondPoint.y,
            }));
        }, {
            firstPoint: { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 },
            secondPoint: { x: secondBox.x + secondBox.width / 2, y: secondBox.y + secondBox.height / 2 },
        });
        const after = await data.inputValue();
        if (before === after || !after.startsWith("192,")) throw new Error("Sprite touch-drag byte export did not update adjacent pixels");
    }

    if (code === "modem") {
        if (await page.locator(".ccg-e11--modem .ccg-e11__modem-panel").count() !== 1) throw new Error("Premium modem panel missing");
        await page.locator('.ccg-e11--modem [data-e11-action="ATDT0161641985"]').click();
        await page.waitForTimeout(120);
        await page.locator('.ccg-e11--modem [data-e11-action="ATH"]').click();
        await page.waitForTimeout(1050);
        const hungUpText = await page.locator(".ccg-e11--modem").textContent();
        if (hungUpText.includes("CONNECT 2400")) throw new Error("Modem connected after HANG UP cancelled dialing");
        await page.locator('.ccg-e11--modem [data-e11-action="ATDT0161641985"]').click();
        await page.waitForFunction(() => document.querySelector(".ccg-e11--modem")?.textContent.includes("CONNECT 2400"), null, { timeout: 5000 });
        const carrierLit = await page.locator('.ccg-e11--modem [data-modem-led="CD"]').evaluate(element => element.classList.contains("is-on"));
        if (!carrierLit) throw new Error("Modem carrier LED did not light after connection");
        await page.locator('.ccg-e11--modem [data-e11-action="BBS"]').click();
        await page.waitForSelector(".ccg-e11--bbs", { timeout: 5000 });
    }

    if (code === "readerror") {
        const input = page.locator(".ccg-e11--diskerror [data-error-input]");
        await input.fill("INITIALIZE");
        await input.press("Enter");
        await page.waitForFunction(() => document.querySelector(".ccg-e11--diskerror")?.textContent.includes("DRIVE RECOVERED"));
        if (!await page.locator(".ccg-e11--diskerror").evaluate(element => element.classList.contains("is-recovered"))) throw new Error("Disk Error recovery state missing");
        await input.fill("RUN");
        await input.press("Enter");
        await page.waitForSelector(".ccg-e11--1541", { timeout: 5000 });
    }

    if (code === "kickstart") {
        const insert = page.locator(".ccg-e11--kickstart [data-kick-insert]");
        if (await page.locator(".ccg-e11--kickstart [data-kick-progress]").count() !== 1) throw new Error("Kickstart boot progress missing");
        await insert.click();
        await page.waitForFunction(() => document.querySelector("[data-kick-insert]")?.textContent === "OPEN WORKBENCH", null, { timeout: 4000 });
        if (!await page.locator(".ccg-e11--kickstart").evaluate(element => element.classList.contains("is-ready"))) throw new Error("Kickstart did not reach ready state");
        await insert.click();
        await page.waitForSelector(".ccg-e11--workbench", { timeout: 5000 });
    }
}

const browser = await chromium.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ["--no-sandbox"],
});

const results = [];

for (const item of cases) {
    const context = await browser.newContext({
        viewport: item.viewport,
        isMobile: item.mobile,
        hasTouch: item.mobile,
        reducedMotion: item.reducedMotion,
    });
    const page = await context.newPage();
    await page.goto(baseURL + "home.html", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".ccg-brand__logo", { state: "visible", timeout: 15000 });
    await page.addStyleTag({ content: '[data-ccg-consent-ui="banner"]{display:none!important;pointer-events:none!important}' });
    await page.evaluate(() => window.scrollTo(0, Math.min(700, Math.max(0, document.documentElement.scrollHeight - innerHeight - 80))));
    const initialScroll = await page.evaluate(() => scrollY);

    for (const [code, selector] of experiences) {
        console.log(`[E11] ${item.name}: launching ${code}`);
        await page.evaluate(() => {
            let probe = document.querySelector("[data-e11-return-probe]");
            if (!probe) {
                probe = document.createElement("button");
                probe.type = "button";
                probe.dataset.e11ReturnProbe = "true";
                probe.textContent = "E11 focus return probe";
                probe.style.position = "fixed";
                probe.style.left = "4px";
                probe.style.bottom = "4px";
                document.body.appendChild(probe);
            }
            probe.focus({ preventScroll: true });
        });
        await openSecretMenu(page, item.mobile);
        const menuEntry = page.locator('[data-ccg-secret-code="' + code + '"]');
        if (await menuEntry.count() !== 1) throw new Error(item.name + ": missing secret menu entry " + code);
        await menuEntry.click();

        await page.waitForSelector(".ccg-egg-overlay--e11", { state: "visible", timeout: 10000 });
        await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
        await page.waitForTimeout(80);

        const geometry = await page.locator(".ccg-egg-overlay--e11 .ccg-egg-overlay__frame").evaluate(element => {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
                viewportWidth: innerWidth,
                viewportHeight: innerHeight,
            };
        });
        const contained = geometry.left >= -2 && geometry.top >= -2 &&
            geometry.right <= geometry.viewportWidth + 2 &&
            geometry.bottom <= geometry.viewportHeight + 2;
        if (!contained) throw new Error(item.name + ": " + code + " escaped the viewport");

        await interact(page, code);

        await page.locator(".ccg-egg-overlay__exit").click();
        await page.waitForSelector(".ccg-egg-overlay--e11", { state: "detached", timeout: 5000 });
        await page.waitForTimeout(180);
        const focusRestored = await page.evaluate(() => document.activeElement?.matches?.("[data-e11-return-probe]") === true);
        if (!focusRestored) throw new Error(item.name + ": " + code + " did not restore the original focus target");
        const restoredScroll = await page.evaluate(() => scrollY);
        if (Math.abs(restoredScroll - initialScroll) > 3) {
            throw new Error(item.name + ": " + code + " did not restore scroll position");
        }

        results.push({
            case: item.name,
            code,
            contained,
            width: geometry.width,
            height: geometry.height,
        });
        console.log(`[E11] ${item.name}: ${code} PASS`);
    }

    const discoveries = await page.evaluate(() => {
        try {
            const value = JSON.parse(localStorage.getItem("ccg:easter-eggs:discovered:v1") || "[]");
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    });
    for (const [code] of experiences) {
        if (!discoveries.includes(code)) throw new Error(item.name + ": discovery tracking missed " + code);
    }

    await context.close();
}

await browser.close();

const evidence = {
    generatedAt: new Date().toISOString(),
    verdict: "PASS",
    experienceCount: experiences.length,
    caseCount: cases.length,
    results,
};
fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({
    verdict: evidence.verdict,
    checks: results.length,
    experienceCount: experiences.length,
    caseCount: cases.length,
}, null, 2));
