// SPDX-License-Identifier: GPL-3.0-or-later
// Original C64 bank-switch hardware devices, isolated from the emulator UI.
// Bank rules are documented in the VICE C64 cartridge format manual.
import { CartridgeDevice, IO_UNHANDLED } from './device.js';

function read8kBanks(cart, { count, bankNumber = chip => chip.bank } = {}) {
  const banks = Array(count).fill(null);
  for (const chip of cart.chips) {
    const bank = bankNumber(chip);
    if (!Number.isInteger(bank) || bank < 0 || bank >= count ||
        chip.loadAddr !== 0x8000 || chip.size !== 8192 ||
        chip.data?.length !== 8192 || banks[bank]) {
      throw new Error('Unsupported or duplicate 8K cartridge CHIP layout.');
    }
    banks[bank] = new Uint8Array(chip.data);
  }
  if (banks.some(bank => bank === null)) {
    throw new Error('Missing required 8K cartridge bank.');
  }
  return banks;
}

export class FunPlayCartridge extends CartridgeDevice {
  constructor(banks) {
    super({ id: 'funplay', hwType: 7, label: 'Fun Play / Power Play' });
    this.romBanks = banks;
    this.powerUp();
  }
  static fromCRT(cart) {
    if (cart.exrom !== 0) throw new Error('Fun Play requires EXROM=0.');
    return new FunPlayCartridge(read8kBanks(cart, {
      count: 16,
      bankNumber: chip => ((chip.bank >> 3) & 7) | ((chip.bank & 1) << 3),
    }));
  }
  powerUp() {
    this.bank = 0;
    this.mode = '8k';
    this.romLo = this.romBanks[0];
    this.romHi = null;
    this.applyMapping();
  }
  resetLine() { this.powerUp(); }
  ioWrite(addr, value) {
    if (addr < 0xde00 || addr > 0xdeff) return false;
    if (value & 0x80) {
      this.mode = 'none';
      this.romLo = null;
    } else {
      this.bank = ((value >> 3) & 7) | ((value & 1) << 3);
      this.mode = '8k';
      this.romLo = this.romBanks[this.bank];
    }
    this.applyMapping();
    return true;
  }
  serialize() { return { id: this.id, bank: this.bank, mode: this.mode }; }
  deserialize(state) {
    this.bank = (state?.bank | 0) & 15;
    this.mode = state?.mode === 'none' ? 'none' : '8k';
    this.romLo = this.mode === '8k' ? this.romBanks[this.bank] : null;
    this.applyMapping();
  }
}

export class SuperGamesCartridge extends CartridgeDevice {
  constructor(lo, hi) {
    super({ id: 'supergames', hwType: 8, label: 'Super Games' });
    this.romLoBanks = lo;
    this.romHiBanks = hi;
    this.powerUp();
  }
  static fromCRT(cart) {
    if (cart.exrom !== 0 || cart.game !== 0) {
      throw new Error('Super Games requires a 16K cartridge configuration.');
    }
    const lo = Array(4).fill(null);
    const hi = Array(4).fill(null);
    for (const chip of cart.chips) {
      if (chip.loadAddr !== 0x8000 || chip.size !== 16384 ||
          chip.data?.length !== 16384 || chip.bank < 0 || chip.bank > 3 ||
          !Number.isInteger(chip.bank) || lo[chip.bank]) {
        throw new Error('Unsupported or duplicate Super Games CHIP layout.');
      }
      lo[chip.bank] = new Uint8Array(chip.data.subarray(0, 8192));
      hi[chip.bank] = new Uint8Array(chip.data.subarray(8192, 16384));
    }
    if (lo.some(bank => bank === null)) throw new Error('Missing Super Games bank.');
    return new SuperGamesCartridge(lo, hi);
  }
  _select() {
    this.romLo = this.mode === '16k' ? this.romLoBanks[this.bank] : null;
    this.romHi = this.mode === '16k' ? this.romHiBanks[this.bank] : null;
    this.applyMapping();
  }
  powerUp() {
    this.bank = 0;
    this.mode = '16k';
    this.locked = false;
    this._select();
  }
  resetLine() { this.powerUp(); }
  ioWrite(addr, value) {
    if (addr < 0xdf00 || addr > 0xdfff) return false;
    if (this.locked) return true;
    this.bank = value & 3;
    this.mode = (value & 4) ? 'none' : '16k';
    this.locked = Boolean(value & 8);
    this._select();
    return true;
  }
  serialize() { return { id: this.id, bank: this.bank, mode: this.mode, locked: this.locked }; }
  deserialize(state) {
    this.bank = (state?.bank | 0) & 3;
    this.mode = state?.mode === 'none' ? 'none' : '16k';
    this.locked = Boolean(state?.locked);
    this._select();
  }
}

export class C64GSCartridge extends CartridgeDevice {
  constructor(banks) {
    super({ id: 'c64gs', hwType: 15, label: 'C64 Game System' });
    this.romBanks = banks;
    this.powerUp();
  }
  static fromCRT(cart) {
    if (cart.exrom !== 0 || cart.game !== 1) {
      throw new Error('C64GS requires EXROM=0 GAME=1.');
    }
    return new C64GSCartridge(read8kBanks(cart, { count: 64 }));
  }
  _select(bank) {
    this.bank = bank & 63;
    this.romLo = this.romBanks[this.bank];
    this.romHi = null;
    this.mode = '8k';
    this.applyMapping();
  }
  powerUp() { this._select(0); }
  resetLine() { this.powerUp(); }
  ioRead(addr) {
    if (addr < 0xde00 || addr > 0xde3f) return IO_UNHANDLED;
    this._select(addr & 63);
    return IO_UNHANDLED;
  }
  ioWrite(addr) {
    if (addr < 0xde00 || addr > 0xde3f) return false;
    this._select(addr & 63);
    return true;
  }
  serialize() { return { id: this.id, bank: this.bank }; }
  deserialize(state) { this._select(state?.bank | 0); }
}

export class DinamicCartridge extends CartridgeDevice {
  constructor(banks) {
    super({ id: 'dinamic', hwType: 17, label: 'Dinamic' });
    this.romBanks = banks;
    this.powerUp();
  }
  static fromCRT(cart) {
    if (cart.exrom !== 0 || cart.game !== 1) {
      throw new Error('Dinamic requires EXROM=0 GAME=1.');
    }
    return new DinamicCartridge(read8kBanks(cart, { count: 16 }));
  }
  _select(bank) {
    this.bank = bank & 15;
    this.mode = '8k';
    this.romLo = this.romBanks[this.bank];
    this.romHi = null;
    this.applyMapping();
  }
  powerUp() { this._select(0); }
  resetLine() { this.powerUp(); }
  ioRead(addr) {
    if (addr < 0xde00 || addr > 0xde0f) return IO_UNHANDLED;
    this._select(addr & 15);
    return IO_UNHANDLED;
  }
  serialize() { return { id: this.id, bank: this.bank }; }
  deserialize(state) { this._select(state?.bank | 0); }
}

export class ZaxxonCartridge extends CartridgeDevice {
  constructor(romLo, hi) {
    super({ id: 'zaxxon', hwType: 18, label: 'Zaxxon' });
    this.baseRomLo = romLo;
    this.romHiBanks = hi;
    this.romLoReadHook = true;
    this.powerUp();
  }
  static fromCRT(cart) {
    if (cart.exrom !== 0 || cart.game !== 0 || cart.chips.length !== 3) {
      throw new Error('Zaxxon requires 16K mapping and exactly three CHIP packets.');
    }
    let lower = null;
    const hi = Array(2).fill(null);
    for (const chip of cart.chips) {
      if (chip.bank === 0 && chip.loadAddr === 0x8000 && chip.size === 4096 &&
          chip.data?.length === 4096 && !lower) {
        lower = new Uint8Array(8192);
        lower.set(chip.data, 0);
        lower.set(chip.data, 4096);
      } else if (chip.bank >= 0 && chip.bank <= 1 && chip.loadAddr === 0xa000 &&
                 chip.size === 8192 && chip.data?.length === 8192 && !hi[chip.bank]) {
        hi[chip.bank] = new Uint8Array(chip.data);
      } else {
        throw new Error('Unsupported or duplicate Zaxxon CHIP layout.');
      }
    }
    if (!lower || hi.some(bank => bank === null)) {
      throw new Error('Missing required Zaxxon CHIP packet.');
    }
    return new ZaxxonCartridge(lower, hi);
  }
  _select(bank) {
    this.bank = bank & 1;
    this.mode = '16k';
    this.romLo = this.baseRomLo;
    this.romHi = this.romHiBanks[this.bank];
    this.applyMapping();
  }
  powerUp() { this._select(0); }
  resetLine() { this.powerUp(); }
  // A *real* CPU ROML read changes ROMH bank. Inspection must not do so.
  readRomLo(addr) {
    this._select(addr >= 0x9000 ? 1 : 0);
    return this.peekRomLo(addr);
  }
  peekRomLo(addr) { return this.baseRomLo[addr & 0x1fff]; }
  serialize() { return { id: this.id, bank: this.bank }; }
  deserialize(state) { this._select(state?.bank | 0); }
}
