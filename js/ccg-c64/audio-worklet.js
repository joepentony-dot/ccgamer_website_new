// SPDX-License-Identifier: GPL-3.0-or-later
// CCG browser C64 SID AudioWorklet adapter.
// Uses the GPL SID voice core retained in this source tree; CCG-specific
// transport, buffering and browser integration live here.

import { makeVoiceTrio, computeSyncPulses } from "./core/sid/sid-voice.js";
import { SIDFilter, SIDExternalFilter, clip16 } from "./core/sid/sid-filter.js";

const C64_CLOCK_HZ = 985248;
const RING_CAPACITY = 131072;
const RING_MASK = RING_CAPACITY - 1;
const HEADER_BYTES = 16;
const PREFILL_MS = 30;

class CCGSidProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ctrl = null;
    this.ring = null;
    this.readIndex = 0;
    this.currentCycle = 0;
    this.cycleFraction = 0;
    this.paused = true;
    this.filter = null;
    this.extfilt = new SIDExternalFilter();
    this.scaleFactor = 5;
    this.prefillSamples = 0;
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
    if (!this.filter) this.filter = new SIDFilter(is8580 ? 1 : 0);
    else this.filter.setChipModel(is8580 ? 1 : 0);
    this.filter.reset();
    this.extfilt.reset();
    this.scaleFactor = is8580 ? 5 : 3;
  }

  _applyWrite(reg, value) {
    reg &= 0x1f;
    value &= 0xff;
    if (reg < 21) {
      const voice = (reg / 7) | 0;
      this.voices[voice].write(reg % 7, value);
      return;
    }
    if (!this.filter) return;
    if (reg === 21) this.filter.writeFC_LO(value);
    else if (reg === 22) this.filter.writeFC_HI(value);
    else if (reg === 23) this.filter.writeRES_FILT(value);
    else if (reg === 24) this.filter.writeMODE_VOL(value);
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

    const s1 = v1.outputStageAudio();
    const s2 = v2.outputStageAudio();
    const s3 = v3.outputStageAudio();
    const filtered = this.extfilt.clockOut(this.filter.clockOut(s1, s2, s3));

    this.currentCycle = (this.currentCycle + 1) >>> 0;
    return clip16(((this.scaleFactor * filtered) / 2) | 0) / 32768;
  }

  _nextSample() {
    this.cycleFraction += C64_CLOCK_HZ / sampleRate;
    const cycles = Math.max(1, Math.floor(this.cycleFraction));
    this.cycleFraction -= cycles;

    let sum = 0;
    for (let i = 0; i < cycles; i++) sum += this._clockOneCycle();
    return Math.max(-1, Math.min(1, sum / cycles));
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
