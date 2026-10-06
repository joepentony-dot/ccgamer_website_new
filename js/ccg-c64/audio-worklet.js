// SPDX-License-Identifier: GPL-3.0-or-later
// CCG browser C64 SID AudioWorklet adapter.
// Uses the GPL SID voice core retained in this source tree; CCG-specific
// transport, buffering and browser integration live here.

import { makeVoiceTrio, computeSyncPulses } from "./core/sid/sid-voice.js";

const C64_CLOCK_HZ = 985248;
const RING_CAPACITY = 131072;
const RING_MASK = RING_CAPACITY - 1;
const HEADER_BYTES = 16;
const PREFILL_MS = 30;
const DEFAULT_GAIN = 1 / (524288 * 3);

class CCGSidProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ctrl = null;
    this.ring = null;
    this.readIndex = 0;
    this.currentCycle = 0;
    this.cycleFraction = 0;
    this.paused = true;
    this.volume = 0;
    this.filterRoute = 0;
    this.modeVol = 0;
    this.prefillSamples = 0;
    this.prevInput = 0;
    this.prevOutput = 0;
    this.voices = makeVoiceTrio();

    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === "init" && data.shared) {
        this.ctrl = new Int32Array(data.shared, 0, 4);
        this.ring = new Uint32Array(data.shared, HEADER_BYTES);
        this.readIndex = Atomics.load(this.ctrl, 1);
        this.currentCycle = 0;
        this.cycleFraction = 0;
        this.paused = false;
        this.prefillSamples = Math.ceil(sampleRate * PREFILL_MS / 1000);
        this._resetVoices(Boolean(data.is8580), true);
      } else if (data.type === "reset") {
        if (this.ctrl) {
          this.readIndex = Atomics.load(this.ctrl, 0);
          Atomics.store(this.ctrl, 1, this.readIndex);
        }
        this.currentCycle = 0;
        this.cycleFraction = 0;
        this.prefillSamples = Math.ceil(sampleRate * PREFILL_MS / 1000);
        this._resetVoices(Boolean(data.is8580), true);
      } else if (data.type === "pause") {
        this.paused = Boolean(data.paused);
      } else if (data.type === "power-off") {
        this.paused = true;
        this._resetVoices(false, true);
      }
    };
  }

  _resetVoices(is8580, powerCycle = false) {
    this.voices = makeVoiceTrio();
    for (const voice of this.voices) {
      voice.is8580 = is8580;
      if (!powerCycle) voice.reset();
    }
    this.volume = 0;
    this.filterRoute = 0;
    this.modeVol = 0;
    this.prevInput = 0;
    this.prevOutput = 0;
  }

  _applyWrite(reg, value) {
    reg &= 0x1f;
    value &= 0xff;
    if (reg < 21) {
      const voice = (reg / 7) | 0;
      this.voices[voice].write(reg % 7, value);
      return;
    }
    if (reg === 23) {
      this.filterRoute = value;
      return;
    }
    if (reg === 24) {
      this.modeVol = value;
      this.volume = value & 0x0f;
    }
  }

  _consumeDueEvents() {
    if (!this.ctrl || !this.ring) return;
    const writeIndex = Atomics.load(this.ctrl, 0);
    while (this.readIndex !== writeIndex) {
      const off = (this.readIndex & RING_MASK) * 2;
      const eventCycle = this.ring[off] >>> 0;
      const delta = (eventCycle - this.currentCycle) | 0;
      if (delta > 0) break;

      const packed = this.ring[off + 1] >>> 0;
      const chipIndex = (packed >>> 5) & 0x07;
      if (chipIndex === 0) {
        this._applyWrite(packed & 0x1f, (packed >>> 8) & 0xff);
      }
      this.readIndex = (this.readIndex + 1) & 0x7fffffff;
    }
    Atomics.store(this.ctrl, 1, this.readIndex);
  }

  _clockOneCycle() {
    this._consumeDueEvents();
    const [v1, v2, v3] = this.voices;
    computeSyncPulses(v1, v2, v3);
    v1.clockCore();
    v2.clockCore();
    v3.clockCore();

    let s1 = v1.outputStageAudio();
    let s2 = v2.outputStageAudio();
    let s3 = v3.outputStageAudio();

    // MODE/VOL bit 7 disables voice 3 when it is not routed through the
    // hardware filter. This first CCG audio pass does not yet model the
    // analog filter itself, but preserves the voice-3-off behaviour.
    if ((this.modeVol & 0x80) && !(this.filterRoute & 0x04)) s3 = 0;

    this.currentCycle = (this.currentCycle + 1) >>> 0;
    return (s1 + s2 + s3) * DEFAULT_GAIN * (this.volume / 15);
  }

  _nextSample() {
    this.cycleFraction += C64_CLOCK_HZ / sampleRate;
    const cycles = Math.max(1, Math.floor(this.cycleFraction));
    this.cycleFraction -= cycles;

    let sum = 0;
    for (let i = 0; i < cycles; i++) sum += this._clockOneCycle();
    let input = sum / cycles;

    // Lightweight DC blocking keeps the SID DAC's modelled offset from
    // consuming headroom. The analog reSID filter/output stage remains a
    // later qualification pass; this is the first live browser-audio path.
    const output = input - this.prevInput + 0.995 * this.prevOutput;
    this.prevInput = input;
    this.prevOutput = output;
    return Math.max(-1, Math.min(1, output));
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output.length) return true;
    const left = output[0];
    const right = output[1] || left;

    if (!this.ctrl || this.paused) {
      left.fill(0);
      if (right !== left) right.fill(0);
      return true;
    }

    for (let i = 0; i < left.length; i++) {
      if (this.prefillSamples > 0) {
        this.prefillSamples--;
        left[i] = 0;
        right[i] = 0;
        continue;
      }
      const sample = this._nextSample();
      left[i] = sample;
      right[i] = sample;
    }
    return true;
  }
}

registerProcessor("ccg-sid-processor", CCGSidProcessor);
