import assert from "node:assert/strict";
import test from "node:test";
import { initHelioHostScoreLogin, signOutHelioHostMember } from "../resources/js/auth/heliohost-score-login.js";

const origin = "https://www.cheekycommodoregamer.co.uk";
const api = "https://api.cheekycommodoregamer.co.uk";
const csrf = "a".repeat(64);
const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "Content-Type": "application/json" }
});

test("Arena sign-out uses the isolated credentialed session and checks that it ended", async () => {
  const calls = [];
  const replies = [json({ csrf }), json({ authenticated: false, csrf }), json({}, 401)];
  assert.equal(await signOutHelioHostMember({
    origin,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return replies.shift();
    }
  }), true);
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    [api + "/v1/member/csrf", "GET"],
    [api + "/v1/member/logout", "POST"],
    [api + "/v1/member/me", "GET"]
  ]);
  assert.equal(calls[1].options.headers["X-CCG-CSRF"], csrf);
  assert.equal(calls[1].options.body, undefined);
  for (const { options } of calls) {
    assert.equal(options.mode, "cors");
    assert.equal(options.credentials, "include");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
  }
});

test("sign-out refuses other origins, missing CSRF, and any unconfirmed logout", async () => {
  assert.equal(await signOutHelioHostMember({
    origin: "https://other.example",
    fetchImpl: () => assert.fail("An off-origin page must never contact the API")
  }), false);
  for (const [replies, count] of [
    [[json({})], 1],
    [[json({ csrf }), json({}, 503)], 2],
    [[json({ csrf }), json({ authenticated: false, csrf }), json({ account: {} })], 3]
  ]) {
    let calls = 0;
    assert.equal(await signOutHelioHostMember({
      origin,
      fetchImpl: async () => {
        calls++;
        return replies.shift();
      }
    }), false);
    assert.equal(calls, count);
  }
});

test("the sign-out button performs no eager requests and locks both controls in flight", async () => {
  const elements = new Map([
    "scoreMemberLogin", "scoreLoginStatus", "scoreLoginSubmit", "scoreLogout",
    "scoreReturnLink", "scoreEmail", "scorePassword"
  ].map(id => [id, {
    disabled: true,
    value: "",
    handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; }
  }]));
  const login = elements.get("scoreLoginSubmit");
  const logout = elements.get("scoreLogout");
  const password = elements.get("scorePassword");
  password.value = "unsent-test-input";
  let requests = 0;
  let allowToken;
  const token = new Promise(resolve => { allowToken = resolve; });
  const replies = [token, json({ authenticated: false, csrf }), json({}, 401)];
  assert.equal(initHelioHostScoreLogin(
    { getElementById: id => elements.get(id) },
    { origin, search: "" },
    async () => {
      requests++;
      return replies.shift();
    }
  ), true);
  assert.equal(requests, 0);
  assert.equal(logout.disabled, false);
  const pending = logout.handlers.click();
  assert.equal(password.value, "");
  assert.equal(login.disabled, true);
  assert.equal(logout.disabled, true);
  await logout.handlers.click();
  assert.equal(requests, 1);
  allowToken(json({ csrf }));
  await pending;
  assert.equal(elements.get("scoreLoginStatus").textContent, "Signed out of the Arena.");
  assert.equal(login.disabled, false);
  assert.equal(logout.disabled, false);
});
