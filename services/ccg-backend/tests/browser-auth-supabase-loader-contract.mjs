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
    `${page} must use the Supabase auth bootstrap.`
  );
  assert.doesNotMatch(
    html,
    /ccgAuthProvider=ccg|ccgAuthBaseUrl=/,
    `${page} must not advertise the retired CCG/Render auth provider.`
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

  const window = { location: { href } };
  if (runtimeConfig) window.ccgAuthRuntimeConfig = runtimeConfig;

  const errors = [];
  const context = vm.createContext({
    window,
    document,
    URL,
    Array,
    Object,
    Promise,
    queueMicrotask,
    console: {
      error(...args) {
        errors.push(args);
      }
    }
  });

  vm.runInContext(loaderSource, context, { filename: 'ccg-auth-supabase-loader.js' });
  const ready = await window.CCG_AUTH_SUPABASE_READY;
  return {
    appended,
    ready,
    errors,
    suppressed: window.__ccgAuthSupabaseBootstrapSuppressed === true,
    providerLock: window.__ccgAuthProviderLocked,
    runtimeProvider: window.ccgAuthRuntimeConfig?.provider,
    descriptor: Object.getOwnPropertyDescriptor(window, 'ccgAuthRuntimeConfig')
  };
}

for (const scenario of [
  {
    name: 'default production login',
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html'
  },
  {
    name: 'former explicit CCG runtime config',
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
    runtimeConfig: { provider: 'ccg', ccgBaseUrl: 'https://staging-auth.cheekycommodoregamer.co.uk' }
  },
  {
    name: 'former localhost CCG pilot query',
    href: 'http://localhost:8080/auth/login.html?ccgAuthProvider=ccg&ccgAuthBaseUrl=http%3A%2F%2Flocalhost%3A8787'
  },
  {
    name: 'live hostile provider query',
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html?ccgAuthProvider=ccg&ccgAuthBaseUrl=https%3A%2F%2Fevil.example'
  }
]) {
  const result = await executeLoader(scenario);
  assert.equal(result.suppressed, false, `${scenario.name}: Supabase bootstrap must never be suppressed.`);
  assert.equal(result.ready, true, `${scenario.name}: Supabase bootstrap must complete.`);
  assert.equal(result.providerLock, 'supabase', `${scenario.name}: provider lock must be Supabase.`);
  assert.equal(result.runtimeProvider, 'supabase', `${scenario.name}: runtime config must be forced to Supabase.`);
  assert.equal(result.descriptor?.writable, false, `${scenario.name}: runtime provider lock must not be writable.`);
  assert.equal(result.descriptor?.configurable, false, `${scenario.name}: runtime provider lock must not be configurable.`);
  assert.deepEqual(result.appended, [
    'https://www.cheekycommodoregamer.co.uk/js/ccg-supabase-config.js',
    'https://www.cheekycommodoregamer.co.uk/js/ccg-supabase-client.js'
  ]);
  assert.equal(result.errors.length, 0);
}

console.log(
  'Browser auth Supabase-loader contract passed: login, registration and recovery always load Supabase and the retired CCG/Render provider cannot be selected by runtime config or URL parameters.'
);
