import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const repoRoot = new URL('../../../', import.meta.url);
const loaderUrl = new URL('js/ccg-auth-supabase-loader.js', repoRoot);
const loaderSource = await readFile(loaderUrl, 'utf8');

for (const page of ['login.html', 'register.html', 'forgot.html', 'reset.html']) {
  const html = await readFile(new URL(`auth/${page}`, repoRoot), 'utf8');
  assert.match(
    html,
    /<script src="\.\.\/js\/ccg-auth-supabase-loader\.js" defer><\/script>/,
    `${page} must use the provider-aware auth Supabase loader.`
  );
  assert.doesNotMatch(
    html,
    /<script src="\.\.\/js\/ccg-supabase-config\.js" defer><\/script>/,
    `${page} must not load Supabase config directly.`
  );
  assert.doesNotMatch(
    html,
    /<script src="\.\.\/js\/ccg-supabase-client\.js" defer><\/script>/,
    `${page} must not load the auto-bootstrapping Supabase client directly.`
  );
}

function makeScriptElement() {
  const listeners = new Map();
  return {
    src: '',
    async: true,
    defer: false,
    dataset: {},
    addEventListener(event, callback) {
      listeners.set(event, callback);
    },
    dispatch(event) {
      listeners.get(event)?.();
    }
  };
}

async function executeLoader({ href, runtimeConfig = null }) {
  const appended = [];
  const currentScript = makeScriptElement();
  currentScript.src = 'https://www.cheekycommodoregamer.co.uk/js/ccg-auth-supabase-loader.js';
  currentScript.dataset.ccgLoaded = '1';

  const scripts = [currentScript];
  const document = {
    currentScript,
    scripts,
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return makeScriptElement();
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        appended.push(script.src);
        queueMicrotask(() => script.onload?.());
        return script;
      }
    }
  };

  const window = {
    location: { href }
  };
  if (runtimeConfig) window.ccgAuthRuntimeConfig = runtimeConfig;

  const errors = [];
  const context = vm.createContext({
    window,
    document,
    URL,
    Array,
    Promise,
    queueMicrotask,
    console: {
      error(...args) {
        errors.push(args);
      }
    }
  });

  vm.runInContext(loaderSource, context, {
    filename: 'ccg-auth-supabase-loader.js'
  });

  const ready = await window.CCG_AUTH_SUPABASE_READY;
  return {
    appended,
    ready,
    errors,
    suppressed: window.__ccgAuthSupabaseBootstrapSuppressed === true
  };
}

const defaultResult = await executeLoader({
  href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html'
});
assert.equal(defaultResult.suppressed, false);
assert.equal(defaultResult.ready, true);
assert.deepEqual(defaultResult.appended, [
  'https://www.cheekycommodoregamer.co.uk/js/ccg-supabase-config.js',
  'https://www.cheekycommodoregamer.co.uk/js/ccg-supabase-client.js'
]);
assert.equal(defaultResult.errors.length, 0);

const explicitCcg = await executeLoader({
  href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
  runtimeConfig: {
    provider: 'ccg',
    ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk'
  }
});
assert.equal(explicitCcg.suppressed, true);
assert.equal(explicitCcg.ready, false);
assert.deepEqual(explicitCcg.appended, [], 'Explicit CCG auth must load zero Supabase scripts.');

const localhostCcg = await executeLoader({
  href: 'http://localhost:8080/auth/login.html?ccgAuthProvider=ccg&ccgAuthBaseUrl=http%3A%2F%2Flocalhost%3A8787'
});
assert.equal(localhostCcg.suppressed, true);
assert.equal(localhostCcg.ready, false);
assert.deepEqual(localhostCcg.appended, [], 'Local CCG pilot selection must load zero Supabase scripts.');

const liveQueryOnly = await executeLoader({
  href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html?ccgAuthProvider=ccg&ccgAuthBaseUrl=https%3A%2F%2Fevil.example'
});
assert.equal(liveQueryOnly.suppressed, false, 'Live query parameters alone must never switch the auth provider.');
assert.equal(liveQueryOnly.ready, true);
assert.equal(liveQueryOnly.appended.length, 2);

console.log(
  'Browser auth Supabase-loader contract passed: production defaults remain Supabase, explicit/local CCG auth loads zero Supabase scripts, and live query parameters cannot switch providers.'
);
