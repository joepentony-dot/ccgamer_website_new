#!/usr/bin/env python3
from pathlib import Path

root = Path('/tmp/dungeon-v17')
for rel in ('src/main.c', 'tests/test_v17.py'):
    p = root / rel
    s = p.read_text(encoding='utf-8')
    s2 = s.replace('static uint8_t near(', 'static uint8_t within_range(').replace('near(', 'within_range(')
    p.write_text(s2, encoding='utf-8')

src = (root / 'src/main.c').read_text(encoding='utf-8')
assert 'static uint8_t within_range(' in src
assert ' near(' not in src
print('Applied cc65 compatibility rename: near -> within_range')
