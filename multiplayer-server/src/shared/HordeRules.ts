import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

export type HordeRulesApi = {
  ENEMIES: Record<string, { id: string; name: string; hp: number; damage: number; speed: number; score: number }>;
  WAVES: Array<{ level: number; title: string; quota: number; timedMs?: number; weapon?: string; boss?: string; groups?: Array<{ kind: string; weight: number }> }>;
  WEAPONS: Array<{ wave: number; id: string; name: string; role: string }>;
  createRun(options?: Record<string, unknown>): any;
  spawnNext(runState: any, now: number, random?: () => number): any;
  defeatEnemy(runState: any, enemyId: string, playerId: string, now: number): boolean;
  damageBoss(runState: any, amount: number, playerId: string, now: number): boolean;
  applyDamage(runState: any, playerId: string, amount: number, now: number): boolean;
  startRevive(runState: any, reviverId: string, targetId: string, now: number): boolean;
  cancelRevive(runState: any, targetId: string, reason: string, now: number): boolean;
  collectHealth(runState: any, pickupId: string, playerId: string, now: number): boolean;
  tick(runState: any, now: number, options?: Record<string, unknown>): any;
  quotaFor(level: number, count: number): number;
  activeCapFor(count: number): number;
  drainEvents(runState: any): any[];
  publicState(runState: any): any;
};

let cached: HordeRulesApi | null = null;

function locateRulesFile() {
  const candidates = [
    resolve(process.cwd(), "../arcade/lost-sizzler/js/horde-survivor.js"),
    resolve(process.cwd(), "arcade/lost-sizzler/js/horde-survivor.js"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Unable to locate arcade/lost-sizzler/js/horde-survivor.js");
  return found;
}

export function getHordeRules(): HordeRulesApi {
  if (cached) return cached;
  const file = locateRulesFile();
  const source = readFileSync(file, "utf8");
  vm.runInThisContext(source, { filename: file });
  const api = (globalThis as typeof globalThis & { CCGLostSizzlerHorde?: HordeRulesApi }).CCGLostSizzlerHorde;
  if (!api?.createRun || !api?.tick || !api?.spawnNext) throw new Error("Lost Sizzler Horde rules engine did not initialise");
  cached = api;
  return api;
}
