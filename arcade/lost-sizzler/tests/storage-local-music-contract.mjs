import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,'..');
const assetsSource=fs.readFileSync(path.join(gameRoot,'js/audio-assets.js'),'utf8');
const sandbox={window:{}};
vm.runInNewContext(assetsSource,sandbox,{filename:'audio-assets.js'});

const catalogue=sandbox.window.CCG_AUDIO_ASSETS;
assert.ok(catalogue?.music?.playlists,'Bundled Lost Sizzler music playlists are missing.');

const expectedPlaylists=Object.freeze({
  normal:Object.freeze([
    'exploration-01.mp3',
    'exploration-02.mp3',
    'exploration-03.mp3',
    'exploration-04.mp3',
    'exploration-05.mp3'
  ]),
  danger:Object.freeze([
    'combat-01.mp3',
    'combat-02.mp3',
    'combat-03.mp3'
  ]),
  sanctuary:Object.freeze([
    'sanctuary-01.mp3',
    'sanctuary-02.mp3'
  ]),
  named:Object.freeze([
    'named-01.mp3',
    'named-02.mp3',
    'named-03.mp3'
  ]),
  stalker:Object.freeze([
    'count-loadula-01.mp3',
    'count-loadula-02.mp3',
    'count-loadula-03.mp3'
  ])
});

const expectedFiles=Object.freeze({
  'combat-01.mp3':{bytes:3360888,sha256:'70e5bd2e1dc2f70273b0f5ac60601df9afb8d262e124929002431a19f04d8224'},
  'combat-02.mp3':{bytes:5665656,sha256:'0b2155e7f82c2fa1fdcb9d1e5cedcbd611412abe6ba8fe042d0d072b230dd36e'},
  'combat-03.mp3':{bytes:3999864,sha256:'b4d73ca1b1c9daa21eb4699891f0732d2777283fca71a361ba52d976582dac90'},
  'exploration-01.mp3':{bytes:7227773,sha256:'6969f2115276a069c7aa48ce4a1001a2706c17ab7308ca7e042c88ba73139e15'},
  'exploration-02.mp3':{bytes:4186493,sha256:'a8a424a5f5051fb224336fe548a3bc701910535ac823c2baa3c26b84ebe505d0'},
  'exploration-03.mp3':{bytes:6875261,sha256:'196b3a4e19e5f160fdafb27c7b9380540d7a7e64282b102fd6efdf4705339f2c'},
  'exploration-04.mp3':{bytes:4794749,sha256:'336f40a2b39316a48c5cccab571b4ac5e728b8d2629113561384426d15510419'},
  'exploration-05.mp3':{bytes:5446781,sha256:'d022385d104c0c9b0363107880a26d7f5d9f8ccccf84d118e3fde10ace2cd218'},
  'named-01.mp3':{bytes:5085047,sha256:'4b5c112ac130b498404e3eb23d6c252c0e0d6446300b8545b982d0545158d57a'},
  'named-02.mp3':{bytes:3331703,sha256:'d9218b9ed563008569d16ca69b376f83bc71423df1b0cb7c786f900b0a4594ac'},
  'named-03.mp3':{bytes:5134967,sha256:'d06336ce08b7f562c56ca42faf35b3f891bab8b4154cdb8f14640b35a407230c'},
  'sanctuary-01.mp3':{bytes:5025147,sha256:'3a0f2dec847d63a7732ad523dccc8ad0b2cbdda9c6c742e18a2b0bddc7cc9f51'},
  'sanctuary-02.mp3':{bytes:4168059,sha256:'c356a99b59c4a9628cc4c748d41fc2bdc0eec20e8f6866431449fcb379fada68'},
  'count-loadula-01.mp3':{bytes:2001535,sha256:'e14a469c0170b345135ed4a24f99fcbf18e8fb777ba12fc7e52958ea23b6cd1a'},
  'count-loadula-02.mp3':{bytes:1946239,sha256:'7d00dcc19e6d851f2a2f78dbb35ec487e4a027e186179b579c1f94ce3518a4db'},
  'count-loadula-03.mp3':{bytes:3982975,sha256:'d66e9feb326d51fdaa1da6c5330463871d7df1b4d77fef579a27fc52be5f1e44'}
});

for(const [state,names] of Object.entries(expectedPlaylists)){
  const expected=names.map(name=>`assets/audio/music/${name}`);
  assert.deepEqual(
    Array.from(catalogue.music.playlists[state]||[]),
    expected,
    `Bundled ${state} playlist does not match the verified recovered local set.`
  );
}

assert.equal(catalogue.music.normal,'assets/audio/music/exploration.wav','Exploration WAV fallback must remain available.');
assert.equal(catalogue.music.danger,'assets/audio/music/danger.wav','Danger WAV fallback must remain available.');
assert.equal(catalogue.music.sanctuary,'assets/audio/music/sanctuary.wav','Sanctuary WAV fallback must remain available.');
assert.equal(catalogue.music.named,'assets/audio/music/named-enemy.wav','Named-enemy WAV fallback must remain available.');
assert.equal(catalogue.music.stalker,'assets/audio/music/count-loadula.wav','Count Loadula WAV fallback must remain available.');

const flattened=Object.values(catalogue.music.playlists).flatMap(value=>Array.from(value));
assert.equal(flattened.length,16,'Bundled Lost Sizzler playlist catalogue must contain exactly 16 recovered tracks.');
assert.equal(new Set(flattened).size,16,'Bundled Lost Sizzler playlist catalogue must not duplicate recovered tracks.');
assert.ok(flattened.every(url=>url.startsWith('assets/audio/music/')),'Every recovered playlist URL must remain package-local.');
assert.ok(flattened.every(url=>!url.includes('supabase.co')),'Bundled playlists must not contain Supabase Storage URLs.');

for(const [name,expected] of Object.entries(expectedFiles)){
  const file=path.join(gameRoot,'assets/audio/music',name);
  assert.ok(fs.existsSync(file),`Recovered local music file is missing: ${name}`);
  const stat=fs.statSync(file);
  assert.equal(stat.size,expected.bytes,`Recovered local music byte size changed: ${name}`);
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(sha256,expected.sha256,`Recovered local music SHA-256 changed: ${name}`);
}

console.log('Lost Sizzler verified local Storage music contract passed.');