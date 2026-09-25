import { createLostSizzlerSupabaseCompat } from './lost-sizzler-supabase-compat.mjs';

function targetDescriptor(target) {
  try {
    return Object.getOwnPropertyDescriptor(target, 'ccgSupabase') || null;
  } catch {
    return null;
  }
}

/**
 * Explicitly install the CCG-owned compatibility bridge for a controlled Lost
 * Sizzler pilot. Importing this module does nothing by itself.
 *
 * The installer refuses to replace an existing window.ccgSupabase bridge unless
 * replaceExisting is deliberately enabled. uninstall() restores the exact
 * previous property descriptor, making rollback deterministic during pilots.
 */
export function installLostSizzlerCcgPilot({
  target = globalThis,
  replaceExisting = false,
  ...bridgeOptions
} = {}) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    throw new Error('pilot target must be an object');
  }

  const previous = targetDescriptor(target);
  const existing = target.ccgSupabase;
  if (existing && !replaceExisting) throw new Error('ccgSupabase already installed');

  const bridge = createLostSizzlerSupabaseCompat(bridgeOptions);
  let installed = false;

  try {
    Object.defineProperty(target, 'ccgSupabase', {
      configurable: true,
      enumerable: previous?.enumerable ?? true,
      writable: true,
      value: bridge,
    });
    installed = target.ccgSupabase === bridge;
  } catch (error) {
    throw new Error(`could_not_install_ccg_pilot: ${String(error?.message || error)}`);
  }

  if (!installed) throw new Error('could_not_install_ccg_pilot');

  return Object.freeze({
    bridge,
    uninstall() {
      if (target.ccgSupabase !== bridge) return false;
      if (previous) Object.defineProperty(target, 'ccgSupabase', previous);
      else delete target.ccgSupabase;
      return true;
    },
  });
}
