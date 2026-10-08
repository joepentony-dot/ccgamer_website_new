import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const pwa = fs.readFileSync("js/ccg-pwa.js", "utf8");
const release = fs.readFileSync("js/ccg-release-check.js", "utf8");

function extractFunction(source, name, nextName) {
  const start = source.indexOf("function " + name + "(");
  const end = source.indexOf(nextName, start);
  assert.ok(start >= 0 && end > start, "Missing function boundary: " + name);
  return source.slice(start, end);
}

function fakeDocument() {
  class Node {
    constructor(tag) {
      this.tag = tag;
      this.parent = null;
      this.children = [];
      this.className = "";
      this.dataset = {};
      this.listeners = {};
      this.attributes = {};
      this.classList = {
        add: (name) => { this.className = [...new Set([...this.className.split(" ").filter(Boolean), name])].join(" "); },
        remove: (name) => { this.className = this.className.split(" ").filter(token => token && token !== name).join(" "); }
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, cb) { (this.listeners[name] ||= []).push(cb); }
    append(...nodes) {
      for (const node of nodes) {
        if (node.parent) node.remove();
        this.children.push(node);
        node.parent = this;
      }
    }
    appendChild(node) { this.append(node); return node; }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this);
      this.parent = null;
    }
    click() { for (const listener of this.listeners.click || []) listener({ preventDefault() {} }); }
  }
  const body = new Node("body");
  return {
    body,
    createElement: tag => new Node(tag),
    querySelector(selector) {
      assert.ok([".ccg-pwa-panel--update", "[data-ccg-release-update]"].includes(selector));
      return body.children.find(node => node.className.split(" ").includes("ccg-pwa-panel--update")) || null;
    },
    panels: () => body.children.filter(node => node.className.split(" ").includes("ccg-pwa-panel--update"))
  };
}

function createHarness() {
  const document = fakeDocument();
  const window = { requestAnimationFrame(callback) { callback(); } };
  const state = { registration: { waiting: { postMessage() {} } }, updatePanel: null, reloadingForUpdate: false };
  const pwaContext = {
    document, window, state,
    buildPanel(kind) {
      const panel = document.createElement("aside");
      panel.className = "ccg-pwa-panel ccg-pwa-panel--" + kind;
      const actions = document.createElement("div");
      panel.append(actions);
      return { panel, actions };
    },
    activateUpdate() {},
    closeUpdatePanel() { state.updatePanel?.remove(); state.updatePanel = null; }
  };
  const releaseContext = {
    document, window,
    ensureCss() {},
    activateRelease() {},
    removePanel(panel) { panel.remove(); }
  };
  const pwaShow = vm.runInNewContext("(" + extractFunction(pwa, "showUpdatePanel", "function showNetworkNotice") + ")", pwaContext);
  const releaseShow = vm.runInNewContext("(" + extractFunction(release, "showUpdatePanel", "async function checkRelease") + ")", releaseContext);
  return { document, state, pwaShow, releaseShow };
}

test("PWA update first: release fingerprint checker cannot create a second overlay", () => {
  const h = createHarness();
  h.pwaShow();
  h.releaseShow("new-fingerprint");
  h.pwaShow();
  h.releaseShow("another-fingerprint");
  assert.equal(h.document.panels().length, 1);
  assert.equal(h.document.panels()[0], h.state.updatePanel);
});

test("release fingerprint first: service-worker checker cannot create a second overlay", () => {
  const h = createHarness();
  h.releaseShow("new-fingerprint");
  h.pwaShow();
  h.releaseShow("another-fingerprint");
  assert.equal(h.document.panels().length, 1);
  assert.equal(h.state.updatePanel, null);
  // Once the first notice is dismissed, a later independent update can appear.
  const releasePanel = h.document.panels()[0];
  const actions = releasePanel.children[1];
  actions.children[1].click(); // Later
  assert.equal(h.document.panels().length, 0);
  h.pwaShow();
  assert.equal(h.document.panels().length, 1);
});

test("service-worker Reload now re-baselines public release fingerprint", () => {
  const saved = new Map();
  const posted = [];
  const state = {
    registration: { waiting: { postMessage: value => posted.push(value) } },
    reloadingForUpdate: false
  };
  const fn = vm.runInNewContext(
    "(" + extractFunction(pwa, "activateUpdate", "function showUpdatePanel") + ")",
    {
      state,
      storageSet(key, value) { saved.set(key, value); },
      RELEASE_FINGERPRINT_KEY: "ccg_public_release_fingerprint",
      RELEASE_CHECK_KEY: "ccg_public_release_checked_at",
      closeUpdatePanel() {}
    }
  );
  const button = { disabled: false, textContent: "Reload now" };
  fn(button);
  assert.equal(button.disabled, true);
  assert.equal(state.reloadingForUpdate, true);
  assert.equal(saved.get("ccg_public_release_fingerprint"), "");
  assert.equal(saved.get("ccg_public_release_checked_at"), 0);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "SKIP_WAITING");
});
