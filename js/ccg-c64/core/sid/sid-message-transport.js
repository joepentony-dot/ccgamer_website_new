// SPDX-License-Identifier: GPL-3.0-or-later
// CCG non-isolated SID transport candidate. Not yet integrated with the emulator.
// A batch is cycle/packed-register pairs, identical to the existing shared ring.
export class SidMessageTransport {
  constructor(port, snapshot, { capacity = 32768, batchSize = 8192, ackTimeoutMs = 3000, now = () => performance.now() } = {}) {
    if (!Number.isInteger(capacity) || capacity < 25 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > capacity) throw new RangeError('Invalid SID queue bounds');
    this.port = port; this.snapshot = snapshot; this.capacity = capacity; this.batchSize = batchSize;
    this.queue = new Uint32Array(capacity * 2);
    this.head = 0; this.count = 0; this.epoch = 0; this.sequence = 0; this.inFlight = null;
    this.active = false; this.needsReseed = false;
    if (!Number.isFinite(ackTimeoutMs) || ackTimeoutMs <= 0) throw new RangeError('Invalid SID ACK timeout');
    this.ackTimeoutMs = ackTimeoutMs; this.now = now; this.waitSince = null;
  }
  start() {
    this.active = true;
    this.waitSince = this.inFlight ? this.now() : null;
    this.reseed();
  }
  stop() {
    this.active = false; this.count = 0; this.head = 0; this.needsReseed = false; this.waitSince = null;
    // Preserve an outstanding acknowledgement barrier. Never enqueue another
    // batch while the receiver is suspended with the prior one outstanding.
  }
  reseed() {
    this.epoch++; this.sequence = 0; this.head = 0; this.count = 0;
    this.needsReseed = true;
    if (this.active && !this.inFlight) this.flush();
  }
  write(cycle, packed) {
    if (!this.active || this.needsReseed) return;
    if (this.count === this.capacity) {
      // A stalled audio thread must not create an unbounded message backlog.
      // Rebuild from current SID registers rather than sending stale history.
      this.reseed();
      return;
    }
    const offset = ((this.head + this.count) % this.capacity) * 2;
    this.queue[offset] = cycle >>> 0; this.queue[offset + 1] = packed >>> 0;
    this.count++;
  }
  flush() {
    if (!this.active) return false;
    if (this.inFlight) {
      if (this.waitSince !== null && this.now() - this.waitSince >= this.ackTimeoutMs) throw new Error('SID worklet did not acknowledge audio events');
      return false;
    }
    if (this.needsReseed) {
      const state = this.snapshot();
      if (!state || !(state.events instanceof Uint32Array) || state.events.length % 2 || state.events.length > this.capacity * 2) throw new Error('Invalid SID snapshot');
      const events = state.events.slice();
      const token = { epoch: this.epoch, sequence: ++this.sequence };
      this.port.postMessage({ type: 'sid-message-init', ...token, is8580: Boolean(state.is8580), secondSid: state.secondSid ?? null, events }, [events.buffer]);
      this.inFlight = token; this.waitSince = this.now(); this.needsReseed = false;
      return true;
    }
    if (!this.count) return false;
    const n = Math.min(this.count, this.batchSize), events = new Uint32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const from = ((this.head + i) % this.capacity) * 2;
      events[i * 2] = this.queue[from]; events[i * 2 + 1] = this.queue[from + 1];
    }
    const token = { epoch: this.epoch, sequence: ++this.sequence };
    this.port.postMessage({ type: 'sid-message-events', ...token, events }, [events.buffer]);
    this.head = (this.head + n) % this.capacity; this.count -= n; this.inFlight = token; this.waitSince = this.now();
    return true;
  }
  acknowledge(message) {
    const token = this.inFlight;
    if (message?.type !== 'sid-message-ack' || !token || message.epoch !== token.epoch || message.sequence !== token.sequence) return false;
    this.inFlight = null; this.waitSince = null;
    // Do not recursively pump; the application flushes once per animation frame.
    return true;
  }
}

// Worklet-side adapter. Local ArrayBuffer is never sent across threads;
// the existing synthesis engine can consume this ring using ordinary reads/writes.
export class SidMessageReceiver {
  constructor({ capacity = 131072, initialise, accept, acknowledge }) {
    this.capacity = capacity; this.initialise = initialise; this.accept = accept; this.acknowledge = acknowledge;
    this.epoch = -1; this.sequence = 0;
  }
  receive(message) {
    if (!['sid-message-init', 'sid-message-events'].includes(message?.type)) return false;
    const { epoch, sequence, events } = message;
    if (!Number.isSafeInteger(epoch) || epoch < 0 || !Number.isSafeInteger(sequence) || sequence < 1 || !(events instanceof Uint32Array) || events.length % 2 || events.length > this.capacity * 2) return false;
    if (message.type === 'sid-message-init') {
      if (epoch <= this.epoch || sequence !== 1) return false;
      this.initialise(message);
      this.epoch = epoch; this.sequence = 0;
    }
    if (epoch !== this.epoch || sequence !== this.sequence + 1) return false;
    this.accept(events);
    this.sequence = sequence;
    this.acknowledge({ type: 'sid-message-ack', epoch, sequence });
    return true;
  }
}
