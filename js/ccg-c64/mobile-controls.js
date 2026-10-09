// C64 joystick UP is an ordinary direction bit (0x01), not a second C64 fire button.
// This curated list contains only title-specific, documented control mappings.
// Do not infer controls from game format, genre, or executable byte patterns.
// Bruce Lee instructions: https://www.lemon64.com/doc/bruce-lee/112
// Bruce Lee II: https://www.tekstadventure.nl/branko/blog/2016/02/game-guide-playing-bruce-lee-ii-on-the-commodore-64
// Kung-Fu Master: https://www.c64-wiki.com/wiki/Kung-Fu_Master
const UP_TO_JUMP = new Set(["bruce lee", "bruce lee ii", "bruce lee trilogy", "kung-fu master", "kung fu master"]);
// These games use the UP direction for navigation, rather than a jump action.
const UP_NOT_JUMP = new Set(["paradroid", "uridium"]);

function plainGameTitle(game) {
  return String(game?.title || game?.name || "")
    .replace(/\.(prg|d64|d71|d81|g64|crt|tap|t64)$/i, "")
    .trim().toLocaleLowerCase("en-GB");
}

export function jumpProfileForGame(game) {
  const title = plainGameTitle(game);
  if (UP_TO_JUMP.has(title)) return "up-jump";
  if (UP_NOT_JUMP.has(title)) return "other";
  return "unverified";
}

// An extra UP button does nothing until pressed. Show it for unknown games
// rather than incorrectly claiming their control schemes have been scanned.
export function defaultJumpEnabled(game) {
  return jumpProfileForGame(game) !== "other";
}

export function controlGameKey(game) {
  if (typeof game?.id === "string" && game.id.trim()) {
    return "id:" + game.id.trim().toLocaleLowerCase("en-GB");
  }
  return "title:" + (plainGameTitle(game) || "unselected");
}

// Pointer-specific ownership prevents a second button with the same bit
// (D-pad UP + JUMP) releasing a direction that another finger still holds.
export function combinedTouchMask(pointerHolds) {
  let mask = 0;
  for (const held of pointerHolds.values()) mask |= held.mask;
  return mask & 0x1F;
}
