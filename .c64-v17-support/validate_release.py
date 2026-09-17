#!/usr/bin/env python3
"""Compile, package and optionally boot-smoke-test Dungeon Carnage 64 v1.7."""
from pathlib import Path
import argparse, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build'
PRG = BUILD / 'DUNGEON-CARNAGE-64.prg'
D64 = BUILD / 'DUNGEON-CARNAGE-64-v1.7.d64'
SCREENSHOT = BUILD / 'VICE-BOOT-SMOKE.png'

def run(cmd, **kwargs):
    print('+', ' '.join(str(x) for x in cmd))
    return subprocess.run(cmd, check=True, **kwargs)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--require-vice', action='store_true', help='fail if x64sc/VICE is unavailable')
    ap.add_argument('--cycles', type=int, default=2500000, help='VICE smoke-test cycle limit')
    args = ap.parse_args()
    BUILD.mkdir(exist_ok=True)

    run([sys.executable, str(ROOT/'tests/test_v17.py')])

    cl65 = shutil.which('cl65')
    if not cl65:
        print('BINARY VALIDATION BLOCKED: cl65 is not installed.')
        return 2

    run([cl65, '-Oirs', '-t', 'c64', '-C', str(ROOT/'c64-game.cfg'),
         '-m', str(BUILD/'DUNGEON-CARNAGE-64.map'),
         '-Ln', str(BUILD/'DUNGEON-CARNAGE-64.lbl'),
         '-o', str(PRG), str(ROOT/'src/main.c')])
    if PRG.stat().st_size < 3:
        raise SystemExit('compiled PRG is unexpectedly small')

    run([sys.executable, str(ROOT/'tools/make_d64.py'), str(PRG), str(D64)])
    if D64.stat().st_size != 174848:
        raise SystemExit('D64 size is not standard 35-track size')

    print(f'COMPILE/PACKAGE PASS: {PRG.stat().st_size} byte PRG -> {D64.name}')

    vice = shutil.which('x64sc')
    if not vice:
        msg = 'EMULATOR VALIDATION BLOCKED: x64sc/VICE is not installed.'
        print(msg)
        return 3 if args.require_vice else 0

    if SCREENSHOT.exists(): SCREENSHOT.unlink()
    cmd = [vice, '-default', '-console', '-silent', '-warp', '-limitcycles', str(args.cycles),
           '-exitscreenshot', str(SCREENSHOT), '-autostart', f'{D64}:DUNGEON CARNAGE']
    run(cmd)
    if not SCREENSHOT.exists() or SCREENSHOT.stat().st_size == 0:
        raise SystemExit('VICE exited without producing the boot-smoke screenshot')
    print(f'VICE BOOT-SMOKE PASS: {SCREENSHOT}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
