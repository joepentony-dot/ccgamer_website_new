(function () {
  "use strict";

  const PAGE_KEY = "emulation-guide";
  const PAGE_TYPE = "emulation";
  const LIMIT = 8;
  let renderToken = 0;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatDate(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  async function getContext() {
    if (!window.ccgSupabase) throw new Error("Community service unavailable");
    await window.ccgSupabase.waitForAuth();
    return window.ccgSupabase.getCurrentUserContext();
  }

  async function loadMessages(client) {
    const response = await client
      .from("comments")
      .select("id,user_id,body,created_at,deleted,page_type,page_id")
      .eq("game_key", PAGE_KEY)
      .eq("page_type", PAGE_TYPE)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (response.error) throw response.error;

    const rows = response.data || [];
    const userIds = Array.from(new Set(rows.map(function (row) { return row.user_id; }).filter(Boolean)));
    const profiles = {};

    if (userIds.length) {
      const profileResult = await client
        .from("profiles")
        .select("id,username,display_name")
        .in("id", userIds);

      if (!profileResult.error) {
        (profileResult.data || []).forEach(function (profile) {
          profiles[profile.id] = profile;
        });
      }
    }

    return rows.map(function (row) {
      return Object.assign({}, row, { profile: profiles[row.user_id] || null });
    });
  }

  function renderMessageList(messages) {
    const list = el("div", "emu-community-message-list");

    if (!messages.length) {
      list.appendChild(el("p", "emu-community-empty", "No messages yet. If this guide helped you, you can be the first to leave one."));
      return list;
    }

    messages.forEach(function (message) {
      const article = el("article", "emu-community-message");
      const head = el("div", "emu-community-message__head");
      const profile = message.profile || {};
      const rawName = profile.display_name || profile.username || "CCG member";
      head.appendChild(el("span", "emu-community-message__name", rawName));
      head.appendChild(el("time", "", formatDate(message.created_at)));

      const body = el("p", "", message.body || "");
      article.appendChild(head);
      article.appendChild(body);
      list.appendChild(article);
    });

    return list;
  }

  function goToLogin() {
    const returnTo = window.location.pathname + window.location.search + "#emulation-community";
    if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.goToLogin === "function") {
      window.ccgCommunityAuth.goToLogin(returnTo);
      return;
    }
    window.location.href = "/auth/login.html?returnTo=" + encodeURIComponent(returnTo);
  }

  function buildGuestAction() {
    const wrap = el("div", "emu-community-guest");
    wrap.appendChild(el("p", "", "Want to leave a thank-you, tip or question?"));
    const button = el("button", "ccg-btn ccg-btn--secondary emu-community-login", "Log in to post");
    button.type = "button";
    button.addEventListener("click", goToLogin);
    wrap.appendChild(button);
    return wrap;
  }

  function buildForm(client, context, mount) {
    const form = el("form", "emu-community-form");
    const label = el("label", "", "Leave a message");
    const textarea = el("textarea", "");
    textarea.name = "message";
    textarea.maxLength = 600;
    textarea.required = true;
    textarea.placeholder = "A quick thank-you, emulator tip or question…";
    label.appendChild(textarea);

    const actions = el("div", "emu-community-form__actions");
    const submit = el("button", "ccg-btn ccg-btn--primary", "Post message");
    submit.type = "submit";
    const status = el("span", "emu-community-status", "");
    status.setAttribute("aria-live", "polite");

    actions.appendChild(submit);
    actions.appendChild(status);
    form.appendChild(label);
    form.appendChild(actions);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const body = textarea.value.trim();
      if (!body) return;

      submit.disabled = true;
      status.textContent = "Posting…";

      try {
        const freshContext = await getContext();
        if (!freshContext.user) {
          goToLogin();
          return;
        }
        if (!freshContext.permissions || !freshContext.permissions.canComment) {
          throw new Error("Your account cannot post comments.");
        }

        const result = await client.from("comments").insert({
          user_id: freshContext.user.id,
          game_key: PAGE_KEY,
          page_type: PAGE_TYPE,
          page_id: PAGE_KEY,
          body: body
        });

        if (result.error) throw result.error;
        textarea.value = "";
        status.textContent = "Posted ✓";
        if (window.ccgCommunityAuth && typeof window.ccgCommunityAuth.showToast === "function") {
          window.ccgCommunityAuth.showToast("Thanks — your emulation message is now live.", "success");
        }
        await render(mount);
      } catch (error) {
        status.textContent = error && error.message ? error.message : "Unable to post just now.";
      } finally {
        submit.disabled = false;
      }
    });

    return form;
  }

  async function render(mount) {
    const token = ++renderToken;
    mount.replaceChildren(el("p", "emu-community-status", "Loading community messages…"));

    try {
      const context = await getContext();
      const client = await window.ccgSupabase.getClient();
      const messages = await loadMessages(client);
      if (token !== renderToken) return;

      const fragment = document.createDocumentFragment();

      if (context.user && context.permissions && context.permissions.canComment) {
        fragment.appendChild(buildForm(client, context, mount));
      } else {
        fragment.appendChild(buildGuestAction());
      }

      fragment.appendChild(renderMessageList(messages));
      mount.replaceChildren(fragment);
    } catch (error) {
      if (token !== renderToken) return;
      mount.replaceChildren(el("p", "emu-community-status", "Community messages are temporarily unavailable. The rest of the emulation guide still works normally."));
    }
  }

  function init() {
    const mount = document.getElementById("ccg-emulation-community");
    if (!mount) return;

    render(mount);
    window.addEventListener("ccg:auth-ready", function () { render(mount); });
    window.addEventListener("ccg:auth-changed", function () { render(mount); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();