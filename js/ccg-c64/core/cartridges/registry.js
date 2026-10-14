// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2026 Morten Øien Eriksen

import { ActionReplayCartridge } from './action-replay.js';
import { EasyFlashCartridge } from './easyflash.js';
import { FinalCartridge3 } from './final3.js';
import { GenericCartridge } from './generic.js';
import { MagicDeskCartridge } from './magicdesk.js';
import { OceanCartridge } from './ocean.js';
import { FunPlayCartridge, SuperGamesCartridge, C64GSCartridge,
  DinamicCartridge, ZaxxonCartridge } from './legacy-banked.js';

const CRT_FACTORIES = new Map([
  [0, cart => GenericCartridge.fromCRT(cart)],
  [1, cart => ActionReplayCartridge.fromCRT(cart)],
  [3, cart => FinalCartridge3.fromCRT(cart)],
  [5, cart => OceanCartridge.fromCRT(cart)],
  [7, cart => FunPlayCartridge.fromCRT(cart)],
  [8, cart => SuperGamesCartridge.fromCRT(cart)],
  [15, cart => C64GSCartridge.fromCRT(cart)],
  [17, cart => DinamicCartridge.fromCRT(cart)],
  [18, cart => ZaxxonCartridge.fromCRT(cart)],
  [19, cart => MagicDeskCartridge.fromCRT(cart)],
  [32, cart => EasyFlashCartridge.fromCRT(cart)],
]);

export function createCartridgeFromCRT(cart) {
  const factory = CRT_FACTORIES.get(cart.hwType);
  if (!factory) {
    throw new Error(
      `Unsupported cartridge type ${cart.hwType} ("${cart.name}"). ` +
      'Supported: type 0 (generic 8K/16K/Ultimax), type 1 (Action Replay), ' +
      'type 3 (Final Cartridge III), type 5 (Ocean Type 1), ' +
      'type 7 (Fun Play), type 8 (Super Games), type 15 (C64GS), ' +
      'type 17 (Dinamic), type 18 (Zaxxon), ' +
      'type 19 (Magic Desk), type 32 (EasyFlash).'
    );
  }
  return factory(cart);
}

export function createCartridgeFromConfig(cfg) {
  if (!cfg || (!cfg.type && (!cfg.mode || cfg.mode === 'none'))) return null;
  if (!cfg.type && cfg.mode) return new GenericCartridge(cfg);
  switch (cfg.type) {
    case 'generic': return new GenericCartridge(cfg);
    case 'action-replay': return new ActionReplayCartridge(cfg.romBanks);
    case 'final3': return new FinalCartridge3(cfg.romLoBanks, cfg.romHiBanks);
    case 'magicdesk': return new MagicDeskCartridge(cfg.romLoBanks);
    case 'ocean': return new OceanCartridge({ romLoBanks: cfg.romLoBanks, romHiBanks: cfg.romHiBanks, mode: cfg.startMode ?? cfg.mode });
    case 'funplay': return new FunPlayCartridge(cfg.romBanks);
    case 'supergames': return new SuperGamesCartridge(cfg.romLoBanks, cfg.romHiBanks);
    case 'c64gs': return new C64GSCartridge(cfg.romBanks);
    case 'dinamic': return new DinamicCartridge(cfg.romBanks);
    case 'zaxxon': return new ZaxxonCartridge(cfg.romLo, cfg.romHiBanks);
    case 'easyflash': return new EasyFlashCartridge(cfg.romLoBanks, cfg.romHiBanks);
    default:
      throw new Error(`Unknown cartridge configuration "${cfg.type}"`);
  }
}
