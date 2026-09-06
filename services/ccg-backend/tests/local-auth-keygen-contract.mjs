import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-auth-keygen-'));
const outputDir = path.join(tempRoot, 'keys');
const scriptPath = new URL('../scripts/generate-local-auth-jwks.mjs', import.meta.url);

try {
  const first = await execFileAsync(process.execPath, [
    scriptPath.pathname,
    '--out-dir', outputDir,
    '--key-id', 'ccg-contract-ed25519-1',
  ]);
  assert.equal(first.stderr, '');
  assert.match(first.stdout, /Generated CCG Ed25519 signing keypair/);
  assert.match(first.stdout, /Private key contents were not printed/);

  const privatePath = path.join(outputDir, 'ccg-auth-private.jwk');
  const publicPath = path.join(outputDir, 'ccg-auth-public.jwk');
  const [privateText, publicText] = await Promise.all([
    fs.readFile(privatePath, 'utf8'),
    fs.readFile(publicPath, 'utf8'),
  ]);
  const privateJwk = JSON.parse(privateText);
  const publicJwk = JSON.parse(publicText);

  assert.equal(privateJwk.kty, 'OKP');
  assert.equal(privateJwk.crv, 'Ed25519');
  assert.equal(typeof privateJwk.d, 'string');
  assert.ok(privateJwk.d.length > 20);
  assert.equal(typeof privateJwk.x, 'string');
  assert.equal(publicJwk.kty, 'OKP');
  assert.equal(publicJwk.crv, 'Ed25519');
  assert.equal(publicJwk.d, undefined, 'Public deployment key must not contain private JWK material.');
  assert.equal(privateJwk.x, publicJwk.x, 'Generated public/private JWK pair must match.');
  assert.equal(privateJwk.kid, 'ccg-contract-ed25519-1');
  assert.equal(publicJwk.kid, 'ccg-contract-ed25519-1');
  assert.equal(first.stdout.includes(privateJwk.d), false, 'Private JWK material must never be printed to stdout.');

  if (process.platform !== 'win32') {
    const [privateStat, publicStat] = await Promise.all([fs.stat(privatePath), fs.stat(publicPath)]);
    assert.equal(privateStat.mode & 0o777, 0o600, 'Private JWK file must be owner-readable/writable only.');
    assert.equal(publicStat.mode & 0o777, 0o644, 'Public JWK file may be world-readable.');
  }

  await assert.rejects(
    execFileAsync(process.execPath, [
      scriptPath.pathname,
      '--out-dir', outputDir,
      '--key-id', 'ccg-contract-ed25519-1',
    ]),
    (error) => {
      assert.notEqual(error?.code, 0);
      assert.match(String(error?.stderr || ''), /Refusing to overwrite existing key file/);
      return true;
    }
  );

  console.log('CCG local-auth keygen contract passed: Ed25519 pairs match, private material is never printed, file permissions are restrictive, and accidental key rotation is refused.');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
