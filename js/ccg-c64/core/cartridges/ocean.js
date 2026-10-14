// SPDX-License-Identifier: GPL-3.0-or-later
// Ocean Type 1 bank-switching cartridge. Based on the documented CRT layout
// and the existing CCG cartridge device interface.

import { CartridgeDevice, modeFromLines } from './device.js';

export class OceanCartridge extends CartridgeDevice {
  constructor({ romLoBanks, romHiBanks, mode }) {
    super({ id: 'ocean', hwType: 5, label: 'Ocean type 1' });
    this.romLoBanks = romLoBanks;
    this.romHiBanks = romHiBanks;
    this.startMode = mode;
    this.hasHiBanks = romHiBanks.some(Boolean);
    this.powerUp();
  }

  static fromCRT(cart) {
    const mode = modeFromLines(cart.exrom, cart.game);
    if (mode !== '8k' && mode !== '16k') {
      throw new Error('Ocean cartridge requires an 8K or 16K game configuration.');
    }
    const lo = Array(64).fill(null);
    const hi = Array(64).fill(null);
    for (const chip of cart.chips) {
      if (!Number.isInteger(chip.bank) || chip.bank < 0 || chip.bank >= 64 ||
          chip.size !== 8192 || chip.data.length < 8192 ||
          (chip.loadAddr !== 0x8000 && chip.loadAddr !== 0xa000)) {
        throw new Error('Unexpected Ocean cartridge bank layout.');
      }
      const target = chip.loadAddr === 0x8000 ? lo : hi;
      if (target[chip.bank]) throw new Error('Duplicate Ocean cartridge bank.');
      target[chip.bank] = new Uint8Array(chip.data.subarray(0, 8192));
    }
    if (!lo[0] || (hi.some(Boolean) && !hi[16])) {
      throw new Error('Ocean cartridge is missing its initial ROM bank.');
    }
    return new OceanCartridge({
      romLoBanks: lo,
      romHiBanks: hi,
      mode: hi.some(Boolean) ? '16k' : mode,
    });
  }

  _select() {
    // 256K images with ROMH chips use the corresponding 0..15 / 16..31
    // pair. Other images bank ROML directly from 0..63.
    const loBank = this.hasHiBanks ? this.bank & 0x0f : this.bank;
    this.romLo = this.romLoBanks[loBank] ?? null;
    this.romHi = this.mode === '16k'
      ? (this.hasHiBanks ? this.romHiBanks[16 + (this.bank & 0x0f)] : this.romLo)
      : null;
    this.applyMapping();
  }

  powerUp() {
    this.bank = 0;
    this.mode = this.startMode;
    this._select();
  }

  resetLine() { this.powerUp(); }

  ioWrite(addr, value) {
    if (addr < 0xde00 || addr > 0xdeff) return false;
    this.bank = value & 0x3f;
    this._select();
    return true;
  }

  serialize() { return { id: this.id, bank: this.bank, mode: this.mode }; }

  deserialize(state) {
    this.bank = (state?.bank | 0) & 0x3f;
    this.mode = this.startMode;
    this._select();
  }
}
