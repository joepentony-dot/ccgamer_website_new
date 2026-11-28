// SPDX-License-Identifier: GPL-3.0-or-later
import { SidMessageBridge } from './sid-message-bridge.js';

// Browser audio graph only. The existing C64 worklet remains the synthesizer.
export class SidBrowserAudio {
  constructor({ browser, workletUrl, onChange = () => {}, timeoutMs = 5000, timers = globalThis }) {
    this.browser = browser; this.workletUrl = workletUrl; this.onChange = onChange;
    this.timeoutMs = timeoutMs; this.timers = timers;
    this.context = null; this.node = null; this.gain = null; this.bridge = null;
    this.machine = null; this.wiredMachine = null; this.pending = null; this.error = null;
    this.muted = false; this.held = false; this.running = false; this.hidden = false;
    this.generation = 0;
  }
  get supported() { return Boolean((this.browser.AudioContext || this.browser.webkitAudioContext) && this.browser.AudioWorkletNode); }
  get ready() { return Boolean(this.context && this.context.state !== 'closed' && this.node && this.gain && this.machine && this.wiredMachine === this.machine); }
  get needsGesture() { return this.ready && this.context.state !== 'running'; }
  get status() {
    if (!this.supported) return 'AUDIO UNAVAILABLE';
    if (this.pending) return 'STARTING AUDIO';
    if (this.error) return 'TAP TO RETRY SOUND';
    if (!this.running) return 'STANDBY';
    if (!this.ready || this.needsGesture) return 'TAP TO ENABLE SOUND';
    if (this.held || this.hidden) return 'AUDIO PAUSED';
    if (this.muted) return 'MUTED';
    return this.bridge && !this.bridge.ready ? 'SYNCING SOUND' : 'SID ACTIVE';
  }
  // Call directly within the user event, not after awaiting an async module.
  resume() {
    const context = this.context;
    if (!context || context.state === 'running' || context.state === 'closed') return;
    try { Promise.resolve(context.resume()).then(() => { if (this.context === context) this.sync(); }, () => { if (this.context === context) this.sync(); }); }
    catch { this.sync(); }
  }
  async ensure() {
    if (this.node && this.gain && this.context?.state !== 'closed') return true;
    if (this.pending) { this.resume(); return this.pending; }
    if (!this.supported) return false;
    if (this.context?.state === 'closed') this.disposeGraph();
    const generation = ++this.generation;
    this.error = null;
    let context;
    try {
      const Context = this.browser.AudioContext || this.browser.webkitAudioContext;
      // Use the hardware rate (e.g. 44.1 or 48 kHz), not a fixed iOS rate.
      context = new Context(this.machine?.sidShared ? { sampleRate: 48000, latencyHint: 'interactive' } : { latencyHint: 'interactive' });
      this.context = context;
      context.addEventListener?.('statechange', () => {
        if (this.context !== context) return;
        if (context.state === 'closed') this.fail(new Error('Browser closed the audio context'));
        else this.sync();
      });
      this.resume();
    } catch (error) { this.fail(error); return false; }
    const create = async () => {
      let timer;
      try {
        await Promise.race([Promise.resolve().then(() => context.audioWorklet.addModule(this.workletUrl)), new Promise((_, reject) => { timer = this.timers.setTimeout(() => reject(new Error('Audio worklet load timed out')), this.timeoutMs); })]);
        if (generation !== this.generation || this.context !== context) return false;
        const node = new this.browser.AudioWorkletNode(context, 'sid-processor', { outputChannelCount: [2] });
        const gain = context.createGain(); gain.gain.value = 0;
        node.connect(gain); gain.connect(context.destination);
        this.node = node; this.gain = gain;
        node.addEventListener?.('processorerror', () => { if (this.node === node) this.fail(new Error('SID processor failed')); });
        return true;
      } catch (error) {
        if (generation === this.generation) this.fail(error);
        return false;
      } finally {
        if (timer !== undefined) this.timers.clearTimeout(timer);
        if (generation === this.generation) { this.pending = null; this.onChange(); }
      }
    };
    this.pending = create(); this.onChange(); return this.pending;
  }
  fail(error) { this.disposeGraph(); this.error = error; this.onChange(); }
  disposeGraph() {
    this.generation++; this.pending = null;
    this.bridge?.dispose(); this.bridge = null;
    const ctx = this.context;
    try { this.node?.disconnect(); } catch {}
    try { this.gain?.disconnect(); } catch {}
    this.context = null; this.node = null; this.gain = null; this.wiredMachine = null;
    try { if (ctx && ctx.state !== 'closed') Promise.resolve(ctx.close()).catch(() => {}); } catch {}
  }
  async bind(machine) {
    // Always detach the previous producer before waiting on the graph.
    this.bridge?.bind(null);
    this.machine = machine; this.wiredMachine = null;
    this.sync();
    if (!machine || !await this.ensure() || this.machine !== machine) return false;
    try {
      if (machine.sidShared) {
        this.bridge?.dispose(); this.bridge = null;
        this.node.port.postMessage({ type: 'init', shared: machine.sidShared, is8580: machine.sidIs8580, engine: 'wasm' });
      } else {
        this.bridge ??= new SidMessageBridge(this.node.port, undefined, () => this.sync());
        this.bridge.bind(machine);
      }
      this.wiredMachine = machine; this.sync(); return true;
    } catch (error) { this.fail(error); return false; }
  }
  sync() {
    const audible = this.running && !this.held && !this.hidden && !this.muted && this.ready && this.context.state === 'running';
    try {
      this.bridge?.setActive(audible);
      if (this.gain && this.context) this.gain.gain.setTargetAtTime(audible && (!this.bridge || this.bridge.ready) ? 0.72 : 0, this.context.currentTime, 0.01);
    } catch (error) { this.fail(error); return; }
    this.onChange();
  }
  setState({ running = this.running, held = this.held, hidden = this.hidden, muted = this.muted } = {}) {
    this.running = running; this.held = held; this.hidden = hidden; this.muted = muted; this.sync();
  }
  flush() { try { if (!this.bridge) return; const before = this.bridge.ready; this.bridge.flush(); if (before !== this.bridge.ready || !this.bridge.ready) this.sync(); } catch (error) { this.fail(error); } }
  reset() {
    try { if (this.bridge) { this.bridge.reset(); this.sync(); } else if (this.ready) this.node.port.postMessage({ type: 'reset', is8580: this.machine.sidIs8580 }); } catch (error) { this.fail(error); }
  }
  resync() { try { if (this.ready && !this.bridge) this.node.port.postMessage({ type: 'resync' }); } catch (error) { this.fail(error); } }
  powerOff() { this.running = false; this.bridge?.bind(null); this.machine = null; this.wiredMachine = null; this.sync(); }
  // The explicit Sound button is also a retry action; never toggle mute on a
  // suspended or failed graph. Resume is invoked before any await.
  async activate(machine) {
    if (!this.supported || !machine) return false;
    if (this.ready && this.context.state === 'running') { this.muted = !this.muted; this.sync(); return true; }
    this.muted = false;
    if (this.ready) { this.resume(); this.sync(); return true; }
    const result = await this.bind(machine); this.resume(); this.sync(); return result;
  }
}
