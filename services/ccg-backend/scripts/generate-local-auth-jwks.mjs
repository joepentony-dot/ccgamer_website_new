import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function usage() {
  return 'Usage: node scripts/generate-local-auth-jwks.mjs --out-dir <directory> [--key-id <id>]';
}

function parseArgs(argv) {
  let outDir = '';
  let keyId = 'ccg-ed25519-1';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-dir') {
      outDir = String(argv[++index] || '').trim();
      continue;
    }
    if (arg === '--key-id') {
      keyId = String(argv[++index] || '').trim();
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!outDir) throw new Error('--out-dir is required.');
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(keyId)) throw new Error('Invalid --key-id.');
  return Object.freeze({ outDir: path.resolve(outDir), keyId });
}

async function writeExclusive(filePath, value, mode) {
  const handle = await fs.open(filePath, 'wx', mode);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

async function main() {
  const { outDir, keyId } = parseArgs(process.argv.slice(2));
  await fs.mkdir(outDir, { recursive: true, mode: 0o700 });

  const privatePath = path.join(outDir, 'ccg-auth-private.jwk');
  const publicPath = path.join(outDir, 'ccg-auth-public.jwk');

  for (const filePath of [privatePath, publicPath]) {
    try {
      await fs.access(filePath);
      throw new Error(`Refusing to overwrite existing key file: ${filePath}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const privateJwk = privateKey.export({ format: 'jwk' });
  const publicJwk = publicKey.export({ format: 'jwk' });

  const privateOutput = Object.freeze({
    ...privateJwk,
    kid: keyId,
    use: 'sig',
    alg: 'EdDSA',
  });
  const publicOutput = Object.freeze({
    ...publicJwk,
    kid: keyId,
    use: 'sig',
    alg: 'EdDSA',
  });

  if (
    privateOutput.kty !== 'OKP' ||
    privateOutput.crv !== 'Ed25519' ||
    !privateOutput.d ||
    !privateOutput.x ||
    publicOutput.kty !== 'OKP' ||
    publicOutput.crv !== 'Ed25519' ||
    !publicOutput.x ||
    publicOutput.d ||
    privateOutput.x !== publicOutput.x
  ) {
    throw new Error('Generated Ed25519 JWK pair failed validation.');
  }

  await writeExclusive(privatePath, privateOutput, 0o600);
  try {
    await writeExclusive(publicPath, publicOutput, 0o644);
  } catch (error) {
    await fs.rm(privatePath, { force: true });
    throw error;
  }

  console.log(`Generated CCG Ed25519 signing keypair (${keyId}).`);
  console.log(`Private JWK: ${privatePath}`);
  console.log(`Public JWK: ${publicPath}`);
  console.log('Private key contents were not printed. Upload the files as deployment secrets and keep them out of Git.');
}

main().catch((error) => {
  console.error(`CCG local-auth key generation failed: ${error.message}`);
  console.error(usage());
  process.exitCode = 1;
});
