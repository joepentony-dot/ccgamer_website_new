// SPDX-License-Identifier: GPL-3.0-or-later
import { SidMessageTransport, SidMessageReceiver } from './sid-message-transport.js';

// Snapshot the machine's actual SID register shadows, not an independent synth.
export function sidSnapshot(machine) {
  const cycle = machine.sidCycleCounter >>> 0;
  const secondSid = machine.secondSidConfig?.() ?? null;
  const chips = [machine.mem.sid.regs];
  if (secondSid?.enabled && machine.sid2?.proxy?.regs) chips.push(machine.sid2.proxy.regs);
  const events = new Uint32Array(chips.length * 25 * 2);
  let i = 0;
  for (let chip = 0; chip < chips.length; chip++) {
    for (let r = 0; r < 25; r++) {
      events[i++] = cycle;
      events[i++] = (r | ((chips[chip][r] & 255) << 8) | (chip << 5) |
        (chip ? (secondSid.generation & 65535) << 16 : 0)) >>> 0;
    }
  }
  return { events, is8580: machine.sidIs8580, secondSid };
}

// One sender per worklet graph: epoch and ACK barrier survive machine switches.
export class SidMessageBridge {
  constructor(port, options, onChange = () => {}) {
    this.machine = null;
    this.sender = new SidMessageTransport(port, () => sidSnapshot(this.machine), options);
    this.enabled = false;
    this.port = port;
    this.onMessage = event => {
      const wasReady = this.ready;
      if (this.sender.acknowledge(event.data) && wasReady !== this.ready) onChange();
    };
    port.addEventListener('message', this.onMessage);
    port.start?.();
  }
  get ready() {
    return this.enabled && !this.sender.needsReseed && this.sender.sequence > 0 &&
      !(this.sender.inFlight?.sequence === 1);
  }
  bind(machine) {
    if (this.machine) this.machine.sidMessageSink = null;
    this.sender.stop();
    this.machine = machine;
    this.enabled = false;
    if (machine) machine.sidMessageSink = (cycle, packed) => this.sender.write(cycle, packed);
  }
  setActive(active) {
    const wanted = Boolean(active && this.machine);
    if (wanted === this.enabled) return;
    this.enabled = wanted;
    if (wanted) this.sender.start(); else this.sender.stop();
  }
  reset() { if (this.enabled) this.sender.reseed(); }
  flush() { return this.sender.flush(); }
  dispose() {
    this.bind(null);
    this.port.removeEventListener('message', this.onMessage);
  }
}

// Worklet-local ring with exactly the same event layout and counter semantics
// as the SharedArrayBuffer producer. No Atomics on a non-shared buffer.
export class SidLocalRing {
  constructor(capacity = 131072) {
    if (!Number.isInteger(capacity) || capacity < 2 || (capacity & (capacity - 1))) throw new RangeError('SID local ring capacity must be a power of two');
    this.capacity = capacity;
    this.ctrl = new Int32Array(4);
    this.events = new Uint32Array(capacity * 2);
  }
  append(events) {
    let wi = this.ctrl[0];
    for (let i = 0; i < events.length; i += 2) {
      const off = (wi & (this.capacity - 1)) * 2;
      this.events[off] = events[i]; this.events[off + 1] = events[i + 1];
      wi = (wi + 1) & 0x7fffffff;
    }
    this.ctrl[0] = wi;
  }
}

export function attachSidReceiver(processor, capacity) {
  let ring;
  return new SidMessageReceiver({ capacity,
    initialise(message) {
      processor.sidCtrl = null; processor.sidRing32 = null;
      processor.engineSel = 'wasm';
      processor._configureSecond(message.secondSid ?? {}, true);
      processor._fullReset(message.is8580);
      ring = new SidLocalRing(capacity);
      processor.sidLocalRing = ring;
      processor.sidCtrl = ring.ctrl; processor.sidRing32 = ring.events;
      processor._ensureWasm();
    },
    accept(events) { ring.append(events); },
    acknowledge(message) { processor.port.postMessage(message); },
  });
}
