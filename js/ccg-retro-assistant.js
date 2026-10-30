/* CCG Retro Assistant: isolated, opt-in, archive-first homepage widget.
   No credentials, third-party scripts, or catalogue requests before interaction. */
(function (root) {
  'use strict';

  const STOP = new Set(['a','an','the','and','or','for','from','like','find','show','me','some','please','what','which','was','were','are','is','games','game','of','with','on','to','in','do','did','can','you','any','i','want','about','best','great','good','old','classic','retro','my']);
  const ALIASES = Object.freeze({platformers:'platform',platformer:'platform',shooters:'shooter',shmups:'shooter',shmup:'shooter',puzzlers:'puzzle',racer:'racing',racers:'racing'});
  function words(s) {
    return String(s || '').toLowerCase()
      .replace(/\bshoot[\s'-]*em[\s'-]*ups?\b/g, 'shooter')
      .replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
      .filter(t => t.length > 1 && !STOP.has(t)).map(t => ALIASES[t] || t);
  }
  // Only carry context when the follow-up consists of platform, year or player
  // filters. A new title/genre request starts a fresh search, not a guessed one.
  function contextualQuestion(previous, question) {
    const current = String(question || '').trim();
    const prior = String(previous || '').trim();
    if (!prior || !/^(?:what about|how about|and|also|anything|any)\b/i.test(current)) return current;
    const fragment = current.replace(/^(?:what about|how about|and|also|anything(?:\s+from|\s+on)?|any(?:\s+from|\s+on)?)\s+/i, '')
      .replace(/[?!.\s]+$/g, '').trim();
    const leftover = fragment.replace(/\b(?:on|from|in|for|the|games?|commodore|64|c64|amiga|two|2|player|players|multiplayer|co|op|19[78]\d|199\d|200\d)\b/gi, '').replace(/[\s-]+/g, '');
    if (!fragment || leftover) return current;
    let base = prior.replace(/[?!.\s]+$/g, '');
    if (/\b(amiga|c64|commodore\s*64)\b/i.test(fragment)) base = base.replace(/\b(amiga|c64|commodore\s*64)\b/gi, ' ');
    if (/\b(?:19[78]\d|199\d|200\d)\b/.test(fragment)) base = base.replace(/\b(?:19[78]\d|199\d|200\d)\b/g, ' ');
    if (/\b(?:two[\s-]*players?|2[\s-]*players?|multiplayer|co[\s-]*op)\b/i.test(fragment)) base = base.replace(/\b(?:two[\s-]*players?|2[\s-]*players?|multiplayer|co[\s-]*op)\b/gi, ' ');
    return (base + ' ' + fragment).replace(/\s+/g, ' ').trim();
  }
  function field(v) { return Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : ''; }
  function matchingGames(items, question, max = 5, offset = 0) {
    if (!Array.isArray(items)) return [];
    const q = String(question || '').toLowerCase();
    const tokens = [...new Set(words(q))];
    const queryAmiga = /\bamiga\b/.test(q);
    const queryC64 = /\b(c64|commodore 64)\b/.test(q);
    const queryMulti = /\b(two.player|2.player|multiplayer|co.op|versus|competitive)\b/.test(q);
    const year = q.match(/\b(19[78]\d|199\d|200\d)\b/)?.[1];
    const scored = items.map((game, index) => {
      if (!game || typeof game !== 'object' || !/^[a-z0-9-]{1,100}$/.test(game.slug || '')) return null;
      const platform = String(game.system || '').toLowerCase();
      if (queryAmiga && !platform.includes('amiga')) return null;
      if (queryC64 && !/(c64|commodore)/.test(platform)) return null;
      if (year && String(game.year) !== year) return null;
      const title = String(game.title || '').toLowerCase();
      const genre = field(game.genres).toLowerCase();
      const collections = field(game.collections).toLowerCase();
      const publisher = field(game.credits?.publisher).toLowerCase();
      const desc = String(game.description || '').toLowerCase().slice(0, 1000);
      const players = field(game.players || game.player_count || game.number_of_players).toLowerCase();
      const isMulti = /\b(2.players?|two.players?|multiplayer|co.op|two.player|split.screen|versus)\b/.test(`${players} ${desc}`);
      if (queryMulti && !isMulti) return null;
      let points = 0;
      for (const token of tokens) {
        if (token === 'c64' || token === 'amiga' || token === year) continue;
        if (title.includes(token)) points += 10;
        if (genre.includes(token)) points += 5;
        if (publisher.includes(token)) points += 4;
        if (collections.includes(token)) points += 3;
        if (desc.includes(token)) points += 1;
      }
      if (queryMulti && isMulti) points += 7;
      if (year) points += 3;
      if ((queryC64 || queryAmiga) && !tokens.length) points += 1;
      return points > 0 ? { game, points, index } : null;
    }).filter(Boolean).sort((a,b) => b.points-a.points || a.index-b.index);
    const start = Math.max(0, Math.trunc(Number(offset) || 0));
    return scored.slice(start, start + Math.max(1, Math.min(8, max))).map(x => x.game);
  }

  // Short, source-backed answers: canonical catalogue fields only. Magazine
  // scores are deliberately NOT inferred from the separate CCG rating.
  function archiveFact(items, question) {
    if (!Array.isArray(items)) return null;
    const q = String(question || '').toLowerCase();
    const game = items.filter(g => g && /^[a-z0-9-]{1,100}$/.test(g.slug || '') &&
      typeof g.title === 'string' && g.title.length >= 3 && q.includes(g.title.toLowerCase()))
      .sort((a,b) => b.title.length - a.title.length)[0];
    if (!game) return null;
    const label = game.title + (game.system ? ' (' + game.system + ')' : '');
    const publisher = field(game.credits?.publisher || game.publisher);
    const musician = field(game.credits?.musician || game.musician);
    if (/\b(?:zzap|crash|magazine|amiga format)\b.*\b(?:score|rating|percent|review)\b/.test(q))
      return { reply: 'I cannot verify a magazine score for ' + label + ' from this catalogue. Check the original magazine material on its game page where available.', game };
    if (/\b(?:publisher|published|who released)\b/.test(q) && publisher)
      return { reply: label + ' is listed as published by ' + publisher + ' in the CCG catalogue.', game };
    if (/\b(?:composer|composed|music by|wrote the music|soundtrack)\b/.test(q) && musician)
      return { reply: 'The CCG catalogue credits ' + musician + ' for the music on ' + label + '.', game };
    if (/\b(?:when|what year|which year|release year)\b/.test(q) && /^\d{4}$/.test(String(game.year)))
      return { reply: label + ' is listed in the CCG catalogue as a ' + game.year + ' release.', game };
    if (/\b(?:ccg rating|cheeky.*rating|your rating|ccg score)\b/.test(q) && Number.isFinite(Number(game.ccg_rating)))
      return { reply: 'The CCG catalogue rating for ' + label + ' is ' + game.ccg_rating + '. This is not a magazine percentage.', game };
    return null;
  }
  // Hardware facts checked against the C64 Programmer's Reference Guide
  // (commodore.ca/manuals) and Amiga Paula audio documentation (sprites.org).
  function hardwareFact(question) {
    const q = String(question || '').toLowerCase();
    if (/\b(?:sid|c64 sound chip|commodore 64 sound chip)\b/.test(q))
      return 'The Commodore 64 uses the SID sound chip. It has three independently programmable synthesiser voices.';
    if (/\b(?:paula|amiga sound chip|amiga audio chip)\b/.test(q))
      return 'The Amiga uses the Paula custom chip for four channels of 8-bit sampled audio.';
    return null;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { matchingGames, words, contextualQuestion, archiveFact, hardwareFact };
  if (!root.document || root.__ccgRetroAssistantLoaded) return;
  root.__ccgRetroAssistantLoaded = true;

  const doc = root.document;
  const script = doc.currentScript || doc.querySelector('script[data-ccg-retro-assistant]');
  const aiEnabled = script?.dataset.aiEnabled === 'true';
  const siteKey = script?.dataset.turnstileSitekey || '';
  const endpoint = script?.dataset.endpoint || '';
  let opened = false;
  let loadedGames = null;
  let loadingGames = null;
  let waiting = false;
  let lastArchiveQuestion = '';
  let lastArchiveOffset = 0;
  let turnstileToken = '';
  let turnstileWidgetId = null;
  let panel, trigger, chat, input, form, status, closeButton;
  let lastFocused = null;

  function node(tag, className, textValue) {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    if (textValue !== undefined) el.textContent = textValue;
    return el;
  }
  function addMessage(text, who) {
    const article = node('div', 'ccg-ra__message ccg-ra__message--' + who);
    article.textContent = String(text).slice(0, 1100);
    chat.appendChild(article);
    chat.scrollTop = chat.scrollHeight;
    return article;
  }
  function card(game) {
    const a = node('a', 'ccg-ra__result');
    a.href = '/games/' + encodeURIComponent(game.slug) + '/';
    const title = node('span', 'ccg-ra__result-title', game.title || game.slug);
    const meta = node('span', 'ccg-ra__result-meta', [game.system,game.year,field(game.genres)].filter(Boolean).join(' · ').slice(0,150));
    a.append(title, meta);
    chat.appendChild(a);
  }
  function welcome() {
    addMessage('Welcome to Ask CCG. Tell me the sort of C64 or Amiga game you fancy, or describe a forgotten favourite. I’ll check the CCG archive and link to matching game pages.', 'bot');
  }
  function loadCatalogue() {
    if (loadedGames) return Promise.resolve(loadedGames);
    if (loadingGames) return loadingGames;
    const controller = new AbortController();
    const timer = root.setTimeout(() => controller.abort(), 12000);
    loadingGames = root.fetch('/games/games.json', { signal: controller.signal, cache: 'force-cache', credentials: 'omit' })
      .then(r => { if (!r.ok) throw new Error('Archive unavailable'); return r.json(); })
      .then(g => {
        if (!Array.isArray(g)) throw new Error('Invalid archive');
        loadedGames = g;
        return g;
      })
      .finally(() => { root.clearTimeout(timer); loadingGames = null; });
    return loadingGames;
  }
  function isSafeAiReply(payload) {
    return payload && typeof payload.reply === 'string' && payload.reply.length <= 1600 &&
      Array.isArray(payload.games) && payload.games.length <= 5 &&
      payload.games.every(g => g && /^[a-z0-9-]{1,100}$/.test(g.slug) && typeof g.title === 'string');
  }
  async function tryAI(question) {
    if (!aiEnabled || !endpoint || !siteKey || !turnstileToken) return false;
    const token = turnstileToken;
    turnstileToken = '';
    try {
      const controller = new AbortController();
      const timeout = root.setTimeout(() => controller.abort(), 12000);
      try {
        const resp = await root.fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, turnstileToken: token }), signal: controller.signal });
        if (!resp.ok) return false;
        const data = await resp.json();
        if (!isSafeAiReply(data)) return false;
        addMessage(data.reply, 'bot');
        data.games.forEach(card);
        return true;
      } finally { root.clearTimeout(timeout); }
    } catch (_) { return false; }
    finally {
      if (root.turnstile && turnstileWidgetId !== null) root.turnstile.reset(turnstileWidgetId);
    }
  }
  async function ask(question) {
    if (waiting) return;
    question = String(question).trim().slice(0,280);
    if (question.length < 3) return;
    const wantsMore = /^(?:show\s+me\s+)?more(?:\s+(?:games|results|like these))?\??$/i.test(question);
    if (wantsMore && !lastArchiveQuestion) {
      addMessage('Ask about a game, platform or genre first, then request more results.', 'bot');
      return;
    }
    const archiveQuestion = wantsMore ? lastArchiveQuestion : contextualQuestion(lastArchiveQuestion, question);
    const resultOffset = wantsMore ? lastArchiveOffset + 5 : 0;
    waiting = true;
    input.disabled = true;
    form.querySelector('button').disabled = true;
    addMessage(question,'visitor');
    status.textContent = 'Checking the archive…';
    try {
      const hardware = hardwareFact(archiveQuestion);
      if (hardware) {
        addMessage(hardware, 'bot');
        status.textContent = 'Verified hardware reference · no external AI';
        return;
      }
      const games = await loadCatalogue();
      const fact = archiveFact(games, archiveQuestion);
      if (fact) {
        addMessage(fact.reply, 'bot');
        card(fact.game);
        lastArchiveQuestion = archiveQuestion;
        lastArchiveOffset = 0;
        status.textContent = 'Answer from CCG catalogue · no external AI';
        return;
      }
      if (await tryAI(archiveQuestion)) { status.textContent = 'Answer based on the CCG archive'; return; }
      const hits = matchingGames(games, archiveQuestion, 5, resultOffset);
      if (hits.length) {
        lastArchiveQuestion = archiveQuestion;
        lastArchiveOffset = resultOffset;
        addMessage(wantsMore
          ? 'Here are more matches from the CCG archive.'
          : 'Here are matches from the CCG archive. These are catalogue search results, not an AI-generated review. Open a game page for its original information and ratings.', 'bot');
        hits.forEach(card);
      } else {
        if (!wantsMore) { lastArchiveQuestion = archiveQuestion; lastArchiveOffset = 0; }
        addMessage(wantsMore
          ? 'That’s all the matching games I can confirm in the current archive.'
          : 'I couldn’t confirm a match in the current CCG catalogue. Try a game title, publisher, genre or year. I won’t invent an answer.', 'bot');
      }
      status.textContent = aiEnabled ? 'Archive search (AI unavailable or verification incomplete)' : 'Archive search · AI not enabled';
    } catch (_) {
      addMessage('The archive could not be loaded just now. Please use Browse Games and try again later.', 'bot');
      status.textContent = 'Catalogue temporarily unavailable';
    } finally {
      waiting = false;
      input.disabled = false;
      form.querySelector('button').disabled = false;
      input.value = '';
      input.focus();
      chat.scrollTop = chat.scrollHeight;
    }
  }
  function loadTurnstile() {
    if (!aiEnabled || !endpoint || !siteKey || root.turnstile || doc.querySelector('script[data-ccg-retro-turnstile]')) return;
    const badge = panel.querySelector('.ccg-ra__verification');
    badge.hidden = false;
    const s = node('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-ccg-retro-turnstile', '');
    s.onload = () => {
      if (!root.turnstile) return;
      turnstileWidgetId = root.turnstile.render(badge, { sitekey: siteKey,
        theme: 'dark', callback: t => { turnstileToken = t; status.textContent = 'AI verified · ready'; },
        'expired-callback': () => { turnstileToken = ''; },
        'error-callback': () => { turnstileToken = ''; } });
    };
    doc.head.appendChild(s);
  }
  function toggle(force) {
    const next = force !== undefined ? force : !opened;
    if (next === opened) return;
    opened = next;
    panel.hidden = !opened;
    trigger.setAttribute('aria-expanded', String(opened));
    if (opened) {
      lastFocused = doc.activeElement;
      input.focus();
      loadTurnstile();
    } else (lastFocused?.isConnected ? lastFocused : trigger).focus();
  }
  function init() {
    if (doc.getElementById('ccg-retro-assistant')) return;
    const css = node('link');
    css.rel = 'stylesheet'; css.href = '/resources/css/ccg-retro-assistant.css';
    doc.head.appendChild(css);
    const host = node('div', 'ccg-ra'); host.id = 'ccg-retro-assistant';
    trigger = node('button','ccg-ra__trigger','ASK CCG');
    trigger.type = 'button'; trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls','ccg-ra-panel');
    trigger.setAttribute('aria-label','Open Ask CCG retro game assistant');
    panel = node('section','ccg-ra__panel'); panel.id = 'ccg-ra-panel'; panel.hidden = true; panel.setAttribute('aria-label','CCG Retro Assistant');
    const header = node('div','ccg-ra__header');
    const headerCopy = node('div');
    const tag = node('span','ccg-ra__tag','CHEEKY COMMODORE GAMER');
    const h2 = node('h2','ccg-ra__title','Ask CCG');
    const subtitle = node('p','ccg-ra__subtitle','Your retro game finder');
    headerCopy.append(tag,h2,subtitle);
    closeButton = node('button','ccg-ra__close','×'); closeButton.type='button';closeButton.setAttribute('aria-label','Close game assistant');
    header.append(headerCopy,closeButton);
    chat = node('div','ccg-ra__chat');chat.setAttribute('role','log');chat.setAttribute('aria-live','polite');chat.setAttribute('aria-relevant','additions');
    const suggestions = node('div','ccg-ra__suggestions');
    ['Find platform games','C64 games from 1987','Two-player C64 games'].forEach(s => {
      const b = node('button','ccg-ra__suggestion',s); b.type='button';b.addEventListener('click',()=>ask(s));suggestions.appendChild(b);
    });
    status = node('p','ccg-ra__status',aiEnabled?'AI beta · verification required':'Archive search · AI not enabled');
    const verification = node('div','ccg-ra__verification'); verification.hidden = true;
    form = node('form','ccg-ra__form');
    input = node('input','ccg-ra__input'); input.type='text';input.maxLength=280;input.autocomplete='off';input.placeholder='Ask about a game, genre or year…';input.setAttribute('aria-label','Ask about Commodore games');
    const send = node('button','ccg-ra__send','SEND');send.type='submit';
    form.append(input,send);
    const privacy = node('p','ccg-ra__notice',aiEnabled ?
      'When AI is enabled, your question is sent to an external AI provider. Do not enter personal details.' :
      'Local archive search only. No AI question is sent to a third party.');
    panel.append(header,chat,suggestions,status,verification,form,privacy);
    host.append(trigger,panel); doc.body.appendChild(host);
    trigger.addEventListener('click',()=>toggle());
    closeButton.addEventListener('click',()=>toggle(false));
    form.addEventListener('submit',e=>{ e.preventDefault();ask(input.value); });
    doc.addEventListener('keydown',e=>{ if (opened && e.key==='Escape') { e.preventDefault(); toggle(false); } });
    welcome();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})(typeof window !== 'undefined' ? window : globalThis);
