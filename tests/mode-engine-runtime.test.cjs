'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.dataset = {};
    this.classList = new FakeClassList();
    this.children = [];
    this.parentElement = null;
    this.disabled = false;
    this.textContent = '';
    this.offsetWidth = 1;
    this.id = '';
    this._className = '';
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value || '');
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  appendChild(element) {
    element.parentElement = this;
    this.children.push(element);
    return element;
  }

  addEventListener() {}

  closest(selector) {
    let element = this;
    while (element) {
      if (selector === '[data-ccg-mode-toggle]' && element.getAttribute('data-ccg-mode-toggle') !== null) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
}

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.preload = '';
    this.volume = 1;
    this.currentTime = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    audioInstances.push(this);
  }

  play() {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
  }
}

const html = new FakeElement('html');
const body = new FakeElement('body');
const head = new FakeElement('head');
const toggle = new FakeElement('button');
const toggleLabel = new FakeElement('span');

toggle.setAttribute('data-ccg-mode-toggle', '');
toggle.appendChild(toggleLabel);
body.setAttribute('data-ccg-mode', 'c64');
body.setAttribute('data-mode', 'c64');

const createdElements = [];
const listeners = new Map();
const listenerCounts = new Map();
const audioInstances = [];

const document = {
  readyState: 'complete',
  documentElement: html,
  body,
  head,
  addEventListener(type, listener) {
    listeners.set(type, listener);
    listenerCounts.set(type, (listenerCounts.get(type) || 0) + 1);
  },
  getElementById(id) {
    return createdElements.find((element) => element.id === id) || null;
  },
  createElement(tagName) {
    const element = new FakeElement(tagName);
    createdElements.push(element);
    return element;
  },
  querySelector(selector) {
    if (selector === '.ccg-amiga-chrome') {
      return createdElements.find((element) => element.className === 'ccg-amiga-chrome') || null;
    }
    if (selector === '.ccg-mode-flash') {
      return createdElements.find((element) => element.className === 'ccg-mode-flash') || null;
    }
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-ccg-mode-toggle]') return [toggle];
    return [];
  }
};

const storedValues = new Map();
const dispatchedEvents = [];
const windowObject = {
  location: { pathname: '/games/1942/' },
  Audio: FakeAudio,
  matchMedia() {
    return { matches: true };
  },
  setTimeout(callback) {
    callback();
    return 1;
  },
  clearTimeout() {},
  dispatchEvent(event) {
    dispatchedEvents.push(event);
    return true;
  }
};

const context = {
  window: windowObject,
  document,
  Element: FakeElement,
  HTMLElement: FakeElement,
  navigator: {},
  localStorage: {
    getItem(key) {
      return storedValues.get(key) || null;
    },
    setItem(key, value) {
      storedValues.set(key, String(value));
    }
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  },
  console
};

vm.createContext(context);
const engineSource = fs.readFileSync('js/ccg-mode-engine.js', 'utf8');
vm.runInContext(engineSource, context, { filename: 'js/ccg-mode-engine.js' });

assert.ok(windowObject.CCGModeEngine, 'global mode controller is exposed');
assert.equal(windowObject.CCGModeEngine.ready, true, 'mode controller initializes after DOM ready');
assert.equal(listenerCounts.get('click'), 1, 'exactly one delegated click owner is registered');
assert.equal(body.getAttribute('data-ccg-mode'), 'c64', 'initial body mode remains C64');
assert.equal(html.getAttribute('data-ccg-mode'), 'c64', 'initial html mode is synchronized to C64');
assert.equal(toggle.dataset.ccgModeOwner, 'engine', 'toggle is marked as owned by the global engine');
assert.equal(audioInstances.length, 2, 'both short mode cues are preloaded');
assert.equal(audioInstances.reduce((sum, audio) => sum + audio.playCalls, 0), 0, 'restoring the saved mode does not play a sound');

const amigaAudio = audioInstances.find((audio) => audio.src === '/resources/audio/mode/lemmings-lets-go.mp3');
const c64Audio = audioInstances.find((audio) => audio.src === '/resources/css/audio/c64_speech_stayawhile.mp3');
assert.ok(amigaAudio, 'Amiga mode uses the Lemmings cue');
assert.ok(c64Audio, 'C64 mode uses the existing stay-a-while speech cue');
assert.ok(amigaAudio.volume <= 0.5, 'Amiga cue volume stays restrained');
assert.ok(c64Audio.volume <= 0.5, 'C64 cue volume stays restrained');

const clickListener = listeners.get('click');
assert.equal(typeof clickListener, 'function', 'delegated click handler exists');

function clickToggle() {
  let prevented = false;
  let stopped = false;
  clickListener({
    target: toggleLabel,
    preventDefault() {
      prevented = true;
    },
    stopImmediatePropagation() {
      stopped = true;
    }
  });
  assert.equal(prevented, true, 'mode click prevents competing default handling');
  assert.equal(stopped, true, 'mode click stops competing toggle handlers');
}

clickToggle();
assert.equal(body.getAttribute('data-ccg-mode'), 'amiga', 'first click switches body to Amiga mode');
assert.equal(body.getAttribute('data-mode'), 'amiga', 'body compatibility mode switches to Amiga');
assert.equal(html.getAttribute('data-ccg-mode'), 'amiga', 'first click switches html to Amiga mode');
assert.equal(html.getAttribute('data-mode'), 'amiga', 'html compatibility mode switches to Amiga');
assert.equal(storedValues.get('ccg-mode'), 'amiga', 'Amiga choice is persisted');
assert.equal(toggle.getAttribute('aria-pressed'), 'true', 'toggle exposes the Amiga active state');
assert.equal(toggle.dataset.ccgActiveMode, 'amiga', 'toggle dataset exposes Amiga mode');
assert.equal(dispatchedEvents.at(-1)?.detail?.mode, 'amiga', 'Amiga change event is dispatched');
assert.equal(amigaAudio.playCalls, 1, 'entering Amiga mode plays the Lemmings cue once');
assert.equal(c64Audio.playCalls, 0, 'C64 cue does not play while entering Amiga mode');

clickToggle();
assert.equal(body.getAttribute('data-ccg-mode'), 'c64', 'second click switches body back to C64 mode');
assert.equal(html.getAttribute('data-ccg-mode'), 'c64', 'second click switches html back to C64 mode');
assert.equal(storedValues.get('ccg-mode'), 'c64', 'C64 choice is persisted');
assert.equal(toggle.getAttribute('aria-pressed'), 'false', 'toggle exposes the C64 active state');
assert.equal(dispatchedEvents.at(-1)?.detail?.mode, 'c64', 'C64 change event is dispatched');
assert.equal(c64Audio.playCalls, 1, 'returning to C64 mode plays the stay-a-while cue once');
assert.ok(amigaAudio.pauseCalls >= 1, 'previous Amiga cue is stopped before the C64 cue plays');

const firstController = windowObject.CCGModeEngine;
const firstAudioCount = audioInstances.length;
vm.runInContext(engineSource, context, { filename: 'js/ccg-mode-engine.js#duplicate' });
assert.equal(windowObject.CCGModeEngine, firstController, 'duplicate script execution keeps the original controller');
assert.equal(listenerCounts.get('click'), 1, 'duplicate script execution does not add another click owner');
assert.equal(audioInstances.length, firstAudioCount, 'duplicate script execution does not create duplicate audio cues');

console.log('Mode engine runtime test passed: C64 → Amiga → C64 with one click owner and one cue per user-triggered change.');