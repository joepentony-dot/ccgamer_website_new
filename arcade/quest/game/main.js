(function () {
  'use strict';

  const Q = window.CCGQuest;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loading = document.getElementById('loading');
  const input = new Q.Input(canvas);
  const assets = new Q.AssetLoader();
  const audio = new Q.AudioEngine();

  ctx.imageSmoothingEnabled = true;

  const S = {
    mode: 'loading',
    returnMode: 'title',
    practice: false,
    stage: 0,
    elapsed: 0,
    score: 0,
    lives: 3,
    mult: 1,
    best: 0,
    time: 0,
    last: 0,
    entities: [],
    shots: [],
    particles: [],
    pending: [],
    boss: null,
    fighter: null,
    beadTime: 0,
    transition: null,
    buttons: [],
    shake: 0,
    flash: 0,
    toast: null,
    itemSpawn: 0,
    powerSpawn: 0,
    patternTimer: 0,
    patternIndex: 0,
    finalHazardTimer: 0,
    stageGrace: 0,
    shieldLowBeep: 0,
  };

  const P = {
    x: 250,
    y: 0,
    w: 78,
    h: 132,
    vx: 0,
    vy: 0,
    ground: true,
    face: 1,
    hp: 100,
    max: 100,
    inv: 0,
    fire: 0,
    duck: false,
    shield: 0,
    speed: 0,
    double: 0,
    anim: 0,
    attack: null,
    attackT: 0,
    attackLen: 0,
    hitLatch: false,
    stun: 0,
    recoil: 0,
    combo: 0,
    comboUntil: 0,
  };

  P.y = Q.GROUND - P.h;

  const ACH = new Q.Achievements((a) => {
    S.toast = { text: a.name, xp: a.xp, until: Q.now() + 3200 };
    audio.sfx('unlock');
  });
  S.best = ACH.profile.best || 0;

  const now = () => Q.now();
  const rhit = (a, b) => Q.rectHit(a, b);
  const clamp = Q.clamp;
  const rand = Q.rand;
  const pick = Q.pick;

  function rr(x, y, w, h, r, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function text(t, x, y, size = 20, col = '#fff', align = 'left', weight = 800) {
    ctx.fillStyle = col;
    ctx.font = `${weight} ${size}px Consolas,monospace`;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  }

  function focus() {
    canvas.focus({ preventScroll: true });
    try {
      scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (_e) {
      scrollTo(0, 0);
    }
  }

  function mode(m) {
    S.mode = m;
    S.buttons = [];
    focus();
  }

  function load() {
    const jobs = [];
    ['bedroom', 'budget', 'christmas', 'amiga', 'guru', 'beads', 'fighter'].forEach((k) => {
      jobs.push(assets.optionalImage(`bg_${k}`, `assets/backgrounds/${k}.svg`));
      jobs.push(assets.optionalImage(`custom_bg_${k}`, Q.customAsset?.('backgrounds', k)));
    });

    jobs.push(assets.optionalImage('mascot_source', '/resources/images/ccgamer-logo.png'));
    jobs.push(assets.optionalImage('custom_mascot', Q.customAsset?.('player', 'mascot')));
    jobs.push(assets.optionalImage('player_head', Q.customAsset?.('player', 'head')));
    jobs.push(assets.optionalImage('player_body', Q.customAsset?.('player', 'body')));
    jobs.push(assets.optionalImage('player_arm', Q.customAsset?.('player', 'arm')));
    jobs.push(assets.optionalImage('player_leg', Q.customAsset?.('player', 'leg')));

    ['bedroom', 'budget', 'christmas', 'amiga', 'guru'].forEach((k) => {
      jobs.push(assets.optionalImage(`boss_${k}`, Q.customAsset?.('bosses', k)));
      jobs.push(assets.optionalImage(`hazard_${k}`, Q.customAsset?.('hazards', k)));
    });

    ['tape', 'disk', 'zzap', 'joystick'].forEach((k) => {
      jobs.push(assets.optionalImage(`item_${k}`, Q.customAsset?.('collectibles', k)));
    });

    ['shield', 'speed', 'double'].forEach((k) => {
      jobs.push(assets.optionalImage(`power_${k}`, Q.customAsset?.('powers', k)));
    });

    jobs.push(assets.optionalImage('fighter_enemy', Q.customAsset?.('fighter', 'enemy')));
    jobs.push(assets.optionalImage('fighter_enemy_punch', Q.customAsset?.('fighter', 'enemyPunch')));
    jobs.push(assets.optionalImage('fighter_enemy_kick', Q.customAsset?.('fighter', 'enemyKick')));
    jobs.push(assets.optionalImage('fighter_enemy_hit', Q.customAsset?.('fighter', 'enemyHit')));

    return Promise.all(jobs);
  }

  function clearWorld() {
    S.entities = [];
    S.shots = [];
    S.particles = [];
    S.pending = [];
    S.boss = null;
    S.fighter = null;
  }

  function resetPlayer() {
    P.x = 250;
    P.y = Q.GROUND - P.h;
    P.vx = 0;
    P.vy = 0;
    P.hp = 100;
    P.inv = 0;
    P.fire = 0;
    P.duck = false;
    P.shield = 0;
    P.speed = 0;
    P.double = 0;
    P.attack = null;
    P.attackT = 0;
    P.hitLatch = false;
    P.stun = 0;
    P.recoil = 0;
    P.combo = 0;
    P.comboUntil = 0;
    P.face = 1;
  }

  function reset() {
    S.score = 0;
    S.lives = 3;
    S.mult = 1;
    clearWorld();
    resetPlayer();
  }

  function startQuest() {
    audio.start();
    ACH.startRun();
    S.practice = false;
    reset();
    enterStage(0);
  }

  function practice(id) {
    audio.start();
    S.practice = true;
    reset();
    if (id === 'beads') startBeads();
    else if (id === 'fighter') startFighter();
    else enterStage(Math.max(0, Q.STAGES.findIndex((s) => s.id === id)));
  }

  function enterStage(i) {
    S.stage = i;
    S.elapsed = 0;
    S.patternTimer = 1.2;
    S.patternIndex = 0;
    S.itemSpawn = 0.7;
    S.powerSpawn = 7.5;
    S.stageGrace = 1.5;
    S.finalHazardTimer = 4.5;
    clearWorld();

    P.x = i === 2 ? 1260 : 250;
    P.y = Q.GROUND - P.h;
    P.vx = 0;
    P.vy = 0;
    P.face = i === 2 ? -1 : 1;
    P.hp = Math.max(65, P.hp);
    P.inv = now() + 1100;
    P.stun = 0;
    P.attack = null;

    const st = Q.STAGES[i];
    audio.setTheme(st.music, false, st.id);
    transition(st.name, st.subtitle, 'stage', 1.8);

    if (!S.practice && i === 3) ACH.flag('amiga');
    if (!S.practice && i === 4) ACH.flag('guru');
  }

  function transition(title, sub, next, dur = 1.8) {
    S.transition = { title, sub, next, t: 0, dur };
    mode('transition');
  }

  function stageNext() {
    if (S.practice) {
      transition('PRACTICE COMPLETE', 'Score not submitted.', 'title', 1.8);
      return;
    }
    if (S.stage === 0) startBeads();
    else if (S.stage === 1) startFighter();
    else if (S.stage < 4) enterStage(S.stage + 1);
    else win();
  }

  function startBeads() {
    clearWorld();
    S.beadTime = 0;
    S.patternTimer = 0.8;
    P.x = 240;
    P.y = Q.GROUND - P.h;
    P.vx = P.vy = 0;
    P.face = 1;
    P.hp = Math.max(65, P.hp);
    audio.setTheme(0, false, 'beads');
    transition('ELECTRIC BEAD RUN', '24 SECONDS. READ THE RHYTHM, THEN JUMP.', 'beads', 1.7);
  }

  function startFighter() {
    clearWorld();
    S.fighter = {
      x: 1150,
      y: Q.GROUND - 154,
      w: 96,
      h: 154,
      hp: 100,
      max: 100,
      vx: 0,
      vy: 0,
      ground: true,
      think: 0.35,
      cool: 0.9,
      guard: 0,
      attack: null,
      attackT: 0,
      attackLen: 0,
      hitLatch: false,
      stun: 0,
      face: -1,
      message: 'SPECIAL MOVES: STILL MISSING',
      messageT: 2,
      boutTime: 45,
    };

    P.x = 330;
    P.y = Q.GROUND - P.h;
    P.hp = 100;
    P.vx = P.vy = 0;
    P.face = 1;
    P.attack = null;
    P.stun = 0;
    P.combo = 0;
    audio.setTheme(1, true, 'fighter');
    transition('THE 36% CONVERSION BOUT', 'PUNCH, KICK, DUCK — AND MAKE SOME SPACE.', 'fighter', 1.9);
  }

  function playerBox() {
    if (P.duck && P.ground) return { x: P.x + 11, y: P.y + 70, w: 58, h: 57 };
    return { x: P.x + 10, y: P.y + 13, w: 60, h: 114 };
  }

  function score(n, x = P.x, y = P.y) {
    const v = Math.round(n * (now() < P.double ? 2 : 1) * S.mult);
    S.score += v;
    if (!S.practice) {
      ACH.score(S.score);
      ACH.profile.totals.scoreLifetime += v;
      if (S.score > S.best) {
        S.best = S.score;
        ACH.profile.best = S.best;
      }
      ACH.save();
    }
    float(`+${v}`, x, y, '#ffe66c');
  }

  function float(t, x, y, c = '#fff') {
    S.particles.push({ kind: 'text', t, x, y, c, life: 1 });
  }

  function sparks(x, y, c = '#6eeaff', n = 12) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(90, 330);
      S.particles.push({
        kind: 'dot', x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        c,
        r: rand(2, 6),
        life: rand(0.25, 0.7),
      });
    }
  }

  function hurt(n, knock = 0) {
    if (now() < P.inv || P.stun > 0) return false;
    if (now() < P.shield) {
      if (!S.practice) ACH.add('shieldBlocks', 1);
      audio.sfx('shield');
      float('BLOCKED', P.x, P.y - 12, '#7ef3ff');
      return false;
    }
    P.hp -= n;
    P.inv = now() + 760;
    P.stun = 0.24;
    P.vx += knock;
    P.vy = Math.min(P.vy, -95);
    S.shake = 10;
    S.flash = 0.2;
    audio.sfx('hit');
    sparks(P.x + 42, P.y + 64, '#ff6075', 18);
    if (P.hp <= 0) {
      S.lives -= 1;
      if (S.lives <= 0) {
        gameOver();
        return true;
      }
      P.hp = 100;
      P.x = S.stage === 2 ? 1260 : 210;
      P.vy = -350;
      P.inv = now() + 1600;
      P.stun = 0;
    }
    return true;
  }

  function updatePlayer(dt, fire = true) {
    P.stun = Math.max(0, P.stun - dt);
    P.duck = input.down('ArrowDown', 'KeyS') && P.ground && P.stun <= 0;
    let move = 0;
    if (P.stun <= 0) {
      move = (input.down('ArrowLeft', 'KeyA') ? -1 : 0) + (input.down('ArrowRight', 'KeyD') ? 1 : 0);
    }
    const max = (now() < P.speed ? 570 : 450) * (P.duck ? 0.32 : 1);
    const desired = move * max;
    P.vx = Q.lerp(P.vx, desired, 1 - Math.pow(0.001, dt));
    if (!move && P.stun <= 0) P.vx *= Math.pow(0.02, dt);
    if (move) P.face = move;
    if (!P.duck && P.stun <= 0 && input.tap('Space', 'ArrowUp', 'KeyW') && P.ground) {
      P.vy = -795;
      P.ground = false;
      audio.sfx('jump');
    }
    P.vy += 2050 * dt;
    P.x = clamp(P.x + P.vx * dt, 70, 1450 - P.w);
    P.y += P.vy * dt;
    if (P.y >= Q.GROUND - P.h) {
      P.y = Q.GROUND - P.h;
      P.vy = 0;
      P.ground = true;
    }
    P.fire = Math.max(0, P.fire - dt);
    if (fire && !P.duck && P.stun <= 0 && input.down('KeyZ', 'ControlLeft') && P.fire <= 0) {
      P.fire = now() < P.double ? 0.14 : 0.22;
      const dir = P.face || 1;
      const sx = dir > 0 ? P.x + P.w : P.x;
      const sy = P.y + 58;
      const vx = 930 * dir;
      // Player fire is deliberately straight. It never auto-aims at bosses or enemies.
      S.shots.push({ x: sx, y: sy, vx, vy: 0, r: 8, owner: 'p', life: 2.2 });
      if (now() < P.double) {
        S.shots.push({ x: sx, y: sy + 14, vx: vx * 0.98, vy: 0, r: 6, owner: 'p', life: 2.2 });
      }
      audio.sfx('shot');
    }
    P.anim += dt * (Math.abs(P.vx) > 45 ? 9 : 2.5);
    if (now() < P.shield) {
      const rem = (P.shield - now()) / 1000;
      if (rem < 2 && now() > S.shieldLowBeep) {
        S.shieldLowBeep = now() + 520;
        audio.sfx('shieldlow');
      }
    }
  }

  function laneY(height, lane = 'mid') {
    if (lane === 'ground') return Q.GROUND - height - 6;
    if (lane === 'low') return Q.GROUND - height - 58;
    if (lane === 'mid') return Q.GROUND - P.h - 20;
    return Q.GROUND - P.h - 100;
  }

  function stageDirection() {
    return S.stage === 2 ? 1 : -1;
  }

  function spawnXForDirection(dir, pad = 80) {
    return dir < 0 ? Q.W + pad : -pad - 120;
  }

  function schedule(delay, fn) {
    S.pending.push({ delay, fn });
  }

  function updatePending(dt) {
    for (const p of S.pending) {
      p.delay -= dt;
      if (p.delay <= 0 && !p.done) {
        p.done = true;
        p.fn();
      }
    }
    S.pending = S.pending.filter((p) => !p.done);
  }

  function addHazard({ label, m = 'slide', lane = 'ground', w = 100, h = 90, speed = 290, wait = 0.8, dir = stageDirection(), x = null, y = null, vx = null, vy = 0, life = 0, damage = 24 }) {
    const px = x ?? spawnXForDirection(dir);
    const py = y ?? laneY(h, lane);
    S.entities.push({ k: 'haz', label, m, x: px, y: py, w, h, vx: vx ?? speed * dir, vy, wait, life, damage, t: 0 });
    audio.sfx('bosswarn');
  }

  function spawnItem(lane = null, forcedType = null) {
    const dir = stageDirection();
    const type = forcedType || pick(S.stage < 3 ? ['tape', 'zzap', 'joystick'] : ['disk', 'zzap', 'joystick']);
    const chosenLane = lane || pick(['ground', 'mid', 'high']);
    S.entities.push({ k: 'item', type, x: spawnXForDirection(dir, 70), y: laneY(54, chosenLane), w: 54, h: 54, vx: (305 + S.stage * 14) * dir, t: 0 });
  }

  function spawnPower(lane = 'mid') {
    const dir = stageDirection();
    S.entities.push({ k: 'power', type: pick(['shield', 'speed', 'double']), x: spawnXForDirection(dir, 80), y: laneY(64, lane), w: 64, h: 64, vx: 275 * dir, t: 0 });
  }

  function spawnEnemy(lane = 'ground', speed = 250) {
    const dir = stageDirection();
    S.entities.push({ k: 'enemy', x: spawnXForDirection(dir, 90), y: laneY(70, lane), w: 70, h: 70, vx: speed * dir, hp: 1, t: Math.random() * 6 });
  }

  function bedroomPattern() {
    const n = S.patternIndex++ % 6;
    if (n === 0) {
      addHazard({ label: 'LOAD ERROR', lane: 'ground', w: 108, h: 92, speed: 285 });
      schedule(1.15, () => spawnItem('mid', 'tape'));
    } else if (n === 1) {
      addHazard({ label: 'LOAD ERROR — DUCK', lane: 'high', w: 118, h: 68, speed: 300 });
      schedule(1.0, () => spawnEnemy('ground', 270));
    } else if (n === 2) {
      addHazard({ label: 'TAPE TANGLE', lane: 'ground', w: 82, h: 68, speed: 330 });
      schedule(0.72, () => addHazard({ label: 'TAPE TANGLE', lane: 'ground', w: 82, h: 68, speed: 330, wait: 0.3 }));
      schedule(1.6, () => spawnItem('high', 'zzap'));
    } else if (n === 3) {
      addHazard({ label: 'LOAD ERROR — DUCK', lane: 'high', w: 118, h: 68, speed: 292 });
      schedule(1.25, () => addHazard({ label: 'LOAD ERROR', lane: 'ground', w: 104, h: 88, speed: 292, wait: 0.35 }));
    } else if (n === 4) {
      spawnEnemy('mid', 245);
      schedule(0.8, () => spawnEnemy('ground', 290));
      schedule(1.6, () => spawnItem('mid'));
    } else {
      spawnItem('ground', 'tape');
      schedule(0.55, () => spawnItem('mid', 'tape'));
      schedule(1.1, () => spawnItem('high', 'tape'));
      schedule(1.65, () => addHazard({ label: 'LOAD ERROR', lane: 'ground', w: 108, h: 90, speed: 310, wait: 0.4 }));
    }
    return rand(2.8, 3.8);
  }

  function budgetPattern() {
    const n = S.patternIndex++ % 6;
    if (n === 0) {
      addHazard({ label: 'FULL PRICE £9.99', lane: 'ground', w: 132, h: 112, speed: 305 });
      schedule(0.95, () => spawnItem('high', 'tape'));
    } else if (n === 1) {
      addHazard({ label: '£9.99 PRICE TAG — DUCK', lane: 'high', w: 152, h: 70, speed: 320 });
      schedule(1.1, () => spawnItem('ground', 'tape'));
      schedule(1.55, () => spawnItem('mid', 'tape'));
    } else if (n === 2) {
      spawnItem('ground', 'tape');
      schedule(0.42, () => spawnItem('mid', 'tape'));
      schedule(0.84, () => addHazard({ label: '£9.99!', lane: 'ground', w: 96, h: 96, speed: 345, wait: 0.35 }));
      schedule(1.28, () => spawnItem('high', 'zzap'));
    } else if (n === 3) {
      addHazard({ label: 'SHELF EDGE — JUMP', lane: 'ground', w: 180, h: 52, speed: 350 });
      schedule(0.9, () => addHazard({ label: 'PRICE CARD — DUCK', lane: 'high', w: 150, h: 66, speed: 330, wait: 0.3 }));
    } else if (n === 4) {
      spawnEnemy('ground', 300);
      schedule(0.65, () => spawnEnemy('mid', 260));
      schedule(1.4, () => addHazard({ label: 'FULL PRICE', lane: 'ground', w: 118, h: 105, speed: 315, wait: 0.35 }));
    } else {
      addHazard({ label: 'BUDGET BIN', lane: 'ground', w: 210, h: 66, speed: 285 });
      schedule(0.75, () => spawnItem('high'));
      schedule(1.5, () => spawnPower('mid'));
    }
    return rand(2.65, 3.45);
  }

  function christmasPattern() {
    const n = S.patternIndex++ % 5;
    const dir = 1; // Christmas attacks from the left.
    if (n === 0) {
      addHazard({ label: 'ROLLING PRESENT', m: 'slide', lane: 'ground', w: 84, h: 84, speed: 285, dir });
      schedule(0.9, () => spawnItem('mid'));
    } else if (n === 1) {
      addHazard({ label: 'FALLING PRESENT', m: 'fall', x: rand(120, 720), y: 115, w: 84, h: 84, vx: 80, vy: 190, wait: 1.0, dir });
      schedule(1.2, () => addHazard({ label: 'FALLING PRESENT', m: 'fall', x: rand(160, 760), y: 105, w: 76, h: 76, vx: 110, vy: 210, wait: 0.55, dir }));
    } else if (n === 2) {
      addHazard({ label: "GRAN'S HOUSE", lane: 'ground', w: 145, h: 118, speed: 275, dir });
      schedule(1.1, () => addHazard({ label: 'COAT ON — DUCK', lane: 'high', w: 150, h: 68, speed: 300, dir, wait: 0.3 }));
    } else if (n === 3) {
      spawnEnemy('ground', 265);
      schedule(0.75, () => spawnItem('high'));
      schedule(1.35, () => spawnEnemy('mid', 245));
    } else {
      spawnItem('ground');
      schedule(0.45, () => spawnItem('mid'));
      schedule(0.9, () => spawnItem('high'));
      schedule(1.5, () => addHazard({ label: 'CHRISTMAS DINNER', lane: 'ground', w: 126, h: 94, speed: 315, dir, wait: 0.4 }));
    }
    return rand(2.8, 3.8);
  }

  function amigaPattern() {
    const n = S.patternIndex++ % 5;
    if (n === 0) {
      addHazard({ label: 'BOUNCING DISK', m: 'bounce', x: Q.W + 80, y: Q.GROUND - 88, w: 88, h: 88, vx: -275, vy: -255, wait: 0.8 });
    } else if (n === 1) {
      addHazard({ label: 'READ ERROR — DUCK', lane: 'high', w: 135, h: 70, speed: 310 });
      schedule(1.0, () => spawnItem('ground', 'disk'));
    } else if (n === 2) {
      addHazard({ label: 'DISK 1 OF 11', lane: 'ground', w: 92, h: 78, speed: 335 });
      schedule(0.65, () => addHazard({ label: 'DISK 2 OF 11', lane: 'ground', w: 92, h: 78, speed: 335, wait: 0.25 }));
      schedule(1.35, () => spawnItem('high', 'disk'));
    } else if (n === 3) {
      spawnEnemy('mid', 280);
      schedule(0.85, () => addHazard({ label: 'BOUNCING DISK', m: 'bounce', x: Q.W + 80, y: Q.GROUND - 84, w: 84, h: 84, vx: -250, vy: -225, wait: 0.45 }));
    } else {
      spawnItem('ground', 'disk');
      schedule(0.6, () => spawnItem('mid', 'disk'));
      schedule(1.2, () => spawnPower('high'));
    }
    return rand(2.7, 3.7);
  }

  function guruBeam() {
    const sign = Math.random() < 0.5 ? -1 : 1;
    const targetX = clamp(P.x + sign * rand(150, 310), 120, 1420);
    addHazard({ label: 'GURU GLITCH — MOVE', m: 'beam', x: targetX, y: 420, w: 86, h: 315, vx: 0, wait: 3.0, life: 1.3, damage: 30 });
  }

  function guruPattern() {
    const n = S.patternIndex++ % 4;
    if (n === 0) guruBeam();
    else if (n === 1) {
      addHazard({ label: 'CORRUPT BLOCK', lane: 'ground', w: 104, h: 96, speed: 275 });
      schedule(1.35, () => guruBeam());
    } else if (n === 2) {
      spawnEnemy('mid', 260);
      schedule(0.8, () => spawnEnemy('ground', 300));
      schedule(1.4, () => guruBeam());
    } else {
      spawnItem('mid', 'disk');
      schedule(0.7, () => spawnItem('high', 'zzap'));
      schedule(1.45, () => guruBeam());
    }
    return rand(4.5, 5.6);
  }

  function stagePattern() {
    if (S.stage === 0) return bedroomPattern();
    if (S.stage === 1) return budgetPattern();
    if (S.stage === 2) return christmasPattern();
    if (S.stage === 3) return amigaPattern();
    return guruPattern();
  }

  function updateStage(dt) {
    S.elapsed += dt;
    S.stageGrace = Math.max(0, S.stageGrace - dt);
    updatePlayer(dt, true);
    updatePending(dt);
    S.patternTimer -= dt;
    S.itemSpawn -= dt;
    S.powerSpawn -= dt;
    if (S.stageGrace <= 0 && S.patternTimer <= 0) S.patternTimer = stagePattern();
    if (S.itemSpawn <= 0) {
      spawnItem();
      S.itemSpawn = rand(4.8, 6.8);
    }
    if (S.powerSpawn <= 0) {
      spawnPower(pick(['mid', 'high']));
      S.powerSpawn = rand(9.5, 13.5);
    }
    updateEntities(dt);
    updateShots(dt);
    if (S.elapsed >= Q.STAGES[S.stage].duration) enterBoss();
  }

  function updateEntities(dt) {
    const pb = playerBox();
    for (const e of S.entities) {
      e.t = (e.t || 0) + dt;
      if (e.wait > 0) {
        e.wait -= dt;
        continue;
      }
      if (e.k === 'haz') {
        if (e.m === 'fall') {
          e.vy += 650 * dt;
          e.y += e.vy * dt;
          if (e.y > Q.GROUND - e.h) {
            e.y = Q.GROUND - e.h;
            e.vy = 0;
            if (Math.abs(e.vx) < 120) e.vx = S.stage === 2 ? 250 : -250;
          }
        } else if (e.m === 'bounce') {
          e.vy += 900 * dt;
          e.y += e.vy * dt;
          if (e.y > Q.GROUND - e.h) {
            e.y = Q.GROUND - e.h;
            e.vy = -255;
          }
        } else if (e.m === 'beam') {
          e.life -= dt;
          if (e.life <= 0) e.dead = true;
        }
        e.x += (e.vx || 0) * dt;
      } else {
        e.x += (e.vx || 0) * dt;
        if (e.k === 'enemy') {
          if (S.stage === 3) e.y += Math.sin(e.t * 5) * 2.1;
          else if (S.stage === 4) e.y += Math.sin(e.t * 7) * 3.2;
        }
      }
      const box = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (!e.dead && !(e.m === 'beam' && e.hitPlayer) && rhit(pb, box)) {
        if (e.k === 'item') {
          score(130, e.x, e.y);
          audio.sfx('pickup');
          if (!S.practice) {
            ACH.add('pickups', 1);
            if (e.type === 'tape') ACH.add('tapes', 1);
          }
          e.dead = true;
        } else if (e.k === 'power') {
          if (e.type === 'shield') P.shield = now() + 7600;
          if (e.type === 'speed') P.speed = now() + 7200;
          if (e.type === 'double') P.double = now() + 7200;
          audio.sfx('pickup');
          score(200, e.x, e.y);
          e.dead = true;
        } else {
          const knock = e.x > P.x ? -250 : 250;
          hurt(e.damage || (e.k === 'enemy' ? 18 : 24), knock);
          if (e.m === 'beam') e.hitPlayer = true;
          else e.dead = true;
        }
      }
      if (e.x < -260 || e.x > Q.W + 260) e.dead = true;
    }
    S.entities = S.entities.filter((e) => !e.dead);
  }

  function enterBoss() {
    S.entities = S.entities.filter((e) => e.k === 'item' || e.k === 'power');
    S.pending = [];
    const st = Q.STAGES[S.stage];
    const startLeft = S.stage === 2;
    S.boss = {
      x: startLeft ? 250 : 1320,
      y: 535,
      homeX: startLeft ? 280 : 1320,
      homeY: 535,
      w: 205,
      h: 180,
      hp: st.bossHp,
      max: st.bossHp,
      t: 0,
      next: 1.8,
      warn: 0,
      warnDur: 1.25,
      type: 'direct',
      label: 'TRACKING SHOT',
      relocate: 2.5,
      volley: [],
      phase: 0,
      dir: S.stage === 4 ? -1 : 1,
      damaged: false,
      hazardTimer: 4.2,
    };
    audio.setTheme(st.music, true, st.id);
    transition(`BOSS: ${st.boss}`, 'READ THE ATTACK. MOVE, JUMP OR DUCK.', 'boss', 1.5);
  }

  function bossAttack() {
    const b = S.boss;
    const i = S.stage;
    let opts;
    if (i === 0) opts = ['direct', 'high', 'low'];
    else if (i === 1) opts = ['lead', 'high', 'low', 'bracket'];
    else if (i === 2) opts = ['lead', 'high', 'low', 'sweep'];
    else if (i === 3) opts = ['curve', 'lead', 'high', 'low', 'bracket'];
    else opts = ['curve', 'high', 'low', 'fan', 'sweep'];
    b.type = pick(opts);
    b.label = {
      direct: 'TRACKING SHOT — MOVE',
      lead: 'LEADING SHOT — CHANGE DIRECTION',
      high: 'HIGH SHOT — DUCK',
      low: 'LOW SHOT — JUMP',
      bracket: 'TWO-SHOT BRACKET — FIND THE GAP',
      sweep: 'SWEEP VOLLEY — KEEP MOVING',
      curve: 'CURVE SHOT — KEEP MOVING',
      fan: 'THREE-WAY FAN — USE THE GAP',
    }[b.type];
    b.warnDur = i === 4 ? 1.55 : 1.25;
    b.warn = b.warnDur;
    b.volley = [];
    audio.sfx('bosswarn');
  }

  function queueBossShot(delay, kind, off = 0, laneOffset = 0) {
    S.boss.volley.push({ delay, kind, off, laneOffset });
  }

  function buildBossVolley() {
    const b = S.boss;
    if (!b) return;
    if (b.type === 'bracket') {
      queueBossShot(0, 'high', -35);
      queueBossShot(0.62, 'low', 35);
    } else if (b.type === 'sweep') {
      queueBossShot(0, 'fixed', -35, -105);
      queueBossShot(0.58, 'fixed', 0, 35);
    } else if (b.type === 'fan') {
      queueBossShot(0, 'fixed', -42, -75);
      queueBossShot(0.58, 'fixed', 0, 0);
      queueBossShot(1.16, 'fixed', 42, 75);
    } else queueBossShot(0, b.type, 0);
  }

  function bossShoot(kind, off = 0, laneOffset = 0) {
    const b = S.boss;
    if (!b) return;
    const sx = b.x + (b.x > P.x ? -b.w / 2 : b.w / 2);
    const sy = b.y + off;
    const speed = 285 + S.stage * 14;
    let tx = P.x + P.w / 2;
    let ty = P.y + 62;
    if (kind === 'lead') tx += P.vx * 0.34;
    if (kind === 'high') ty = Q.GROUND - P.h + 50;
    if (kind === 'low') ty = Q.GROUND - 22;
    if (kind === 'fixed') {
      tx = P.x + (b.x > P.x ? -280 : 280);
      ty = P.y + 62 + laneOffset;
    }
    const dx = tx - sx;
    const dy = ty - sy;
    const m = Math.max(1, Math.hypot(dx, dy));
    S.shots.push({ x: sx, y: sy, vx: (dx / m) * speed, vy: (dy / m) * speed, r: S.stage === 4 ? 15 : 17, owner: 'b', life: 7, curve: kind === 'curve' ? (P.x < b.x ? 95 : -95) : 0 });
    audio.sfx('shot');
  }

  function moveBoss(dt) {
    const b = S.boss;
    const i = S.stage;
    b.t += dt;
    b.relocate -= dt;
    if (i === 0) {
      b.x = b.homeX + Math.sin(b.t * 0.8) * 72;
      b.y = 540 + Math.sin(b.t * 1.5) * 40;
    } else if (i === 1) {
      b.x = b.homeX + Math.sin(b.t * 1.05) * 180;
      b.y = b.homeY + Math.sin(b.t * 2.1) * 58;
      if (b.relocate <= 0) {
        b.homeY = pick([500, 535, 565]);
        b.relocate = rand(2.2, 3.4);
      }
    } else if (i === 2) {
      b.x = 320 + Math.sin(b.t * 0.75) * 170;
      b.y = 520 + Math.sin(b.t * 1.8) * 85;
    } else if (i === 3) {
      b.x = 1260 + Math.sin(b.t * 1.2) * 190;
      b.y = 520 + Math.sin(b.t * 2.4) * 75;
    } else {
      // Final boss crosses the whole arena from side to side.
      b.x += b.dir * 250 * dt;
      if (b.x < 230) { b.x = 230; b.dir = 1; }
      else if (b.x > 1370) { b.x = 1370; b.dir = -1; }
      b.y = 500 + Math.sin(b.t * 2.15) * 80;
    }
  }

  function updateBoss(dt) {
    const b = S.boss;
    if (!b) return;
    updatePlayer(dt, true);
    updateEntities(dt);
    updateShots(dt);
    moveBoss(dt);
    b.next -= dt;
    b.hazardTimer -= dt;
    if (b.warn > 0) {
      b.warn -= dt;
      if (b.warn <= 0) buildBossVolley();
    } else if (!b.volley.length && b.next <= 0) {
      bossAttack();
      b.next = rand(S.stage === 4 ? 2.8 : 3.2, S.stage === 4 ? 4.0 : 4.6);
    }
    if (b.volley.length) {
      for (const shot of b.volley) shot.delay -= dt;
      const ready = b.volley.filter((shot) => shot.delay <= 0 && !shot.done);
      for (const shot of ready) {
        shot.done = true;
        bossShoot(shot.kind, shot.off, shot.laneOffset);
      }
      b.volley = b.volley.filter((shot) => !shot.done);
    }
    if (S.stage === 4 && b.hazardTimer <= 0) {
      if (Math.random() < 0.58) guruBeam();
      else addHazard({ label: 'CORRUPT BLOCK', lane: 'ground', w: 98, h: 90, speed: 250, wait: 1.2 });
      b.hazardTimer = rand(4.2, 5.8);
    }
    if (b.hp <= 0) {
      if (!S.practice) {
        ACH.add('bosses', 1);
        if (S.stage === 1) ACH.flag('budgetBoss');
        if (S.stage === 2) ACH.flag('xmasBoss');
      }
      score(1800 + S.stage * 400, b.x, b.y);
      stageNext();
    }
  }

  function updateShots(dt) {
    for (const s of S.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += (s.curve || 0) * dt;
      s.life -= dt;
      if (s.owner === 'p') {
        if (S.boss && rhit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, { x: S.boss.x - S.boss.w / 2, y: S.boss.y - S.boss.h / 2, w: S.boss.w, h: S.boss.h })) {
          S.boss.hp -= 1;
          s.dead = true;
          sparks(s.x, s.y, '#ffe66c', 7);
        }
        for (const e of S.entities) {
          if (!s.dead && e.k === 'enemy' && rhit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, e)) {
            e.dead = true;
            s.dead = true;
            score(180, e.x, e.y);
            if (!S.practice) ACH.add('kills', 1);
          }
        }
      } else if (rhit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, playerBox())) {
        hurt(18, s.vx > 0 ? 170 : -170);
        s.dead = true;
      }
      if (s.life <= 0 || s.x < -100 || s.x > 1700 || s.y < -100 || s.y > 1000) s.dead = true;
    }
    S.shots = S.shots.filter((s) => !s.dead);
    S.entities = S.entities.filter((e) => !e.dead);
  }

  function updateBeads(dt) {
    S.beadTime += dt;
    updatePlayer(dt, false);
    S.patternTimer -= dt;
    if (S.patternTimer <= 0) {
      const speed = rand(420, 535);
      S.entities.push({ k: 'bead', x: Q.W + 40, y: Q.GROUND - 54, w: 54, h: 54, vx: -speed, t: 0 });
      if (S.beadTime > 8 && Math.random() < 0.34) schedule(0.62, () => S.entities.push({ k: 'bead', x: Q.W + 40, y: Q.GROUND - 54, w: 54, h: 54, vx: -speed * 0.96, t: 0 }));
      S.patternTimer = rand(0.8, 1.25);
    }
    updatePending(dt);
    const pb = playerBox();
    for (const e of S.entities) {
      if (e.k !== 'bead') continue;
      e.x += e.vx * dt;
      e.t += dt;
      if (!e.hit && rhit(pb, e)) { hurt(24, -180); e.hit = true; }
      if (!e.scored && e.x + e.w < P.x && P.y < Q.GROUND - P.h - 15) {
        e.scored = true;
        score(120, e.x, e.y);
        if (!S.practice) ACH.add('cleanJumps', 1);
      }
      if (e.x < -80) e.dead = true;
    }
    S.entities = S.entities.filter((e) => !e.dead);
    if (S.beadTime > 24) {
      if (!S.practice && P.hp >= 100) ACH.flag('beadPerfect');
      if (S.practice) transition('PRACTICE COMPLETE', 'Electric Bead Run complete.', 'title', 1.8);
      else enterStage(1);
    }
  }

  function fighterPlayerAttack(type) {
    if (P.attack || P.duck || P.stun > 0) return;
    P.attack = type;
    P.attackT = now();
    P.attackLen = type === 'kick' ? 500 : 340;
    P.hitLatch = false;
    audio.sfx(type);
  }

  function enemyStart(type) {
    const f = S.fighter;
    if (!f || f.attack || f.stun > 0) return;
    f.attack = type;
    f.attackT = now();
    f.attackLen = type === 'kick' ? 560 : 390;
    f.hitLatch = false;
    f.message = type === 'punch' ? 'TIER-TEX: HIGH PUNCH — DUCK' : 'TIER-TEX: LOW KICK — JUMP';
    f.messageT = 1.2;
  }

  function fighterHitTarget(target, damage, knock, label) {
    if (target === P) {
      if (hurt(damage, knock)) float(label, P.x, P.y - 18, '#ffcf68');
      return;
    }
    const f = target;
    f.hp -= damage;
    f.stun = 0.34;
    f.vx = knock;
    f.attack = null;
    f.guard = 0;
    audio.sfx('hit');
    sparks(f.x, f.y + 65, '#ffcf68', 14);
    float(label, f.x, f.y - 16, '#ffe66c');
  }

  function updateFighter(dt) {
    const f = S.fighter;
    if (!f) return;
    f.boutTime = Math.max(0, f.boutTime - dt);
    P.stun = Math.max(0, P.stun - dt);
    f.stun = Math.max(0, f.stun - dt);
    f.messageT = Math.max(0, f.messageT - dt);
    f.guard = Math.max(0, f.guard - dt);
    f.cool -= dt;
    f.think -= dt;
    P.duck = input.down('ArrowDown', 'KeyS') && P.ground && P.stun <= 0;
    let move = 0;
    if (P.stun <= 0) move = (input.down('ArrowLeft', 'KeyA') ? -1 : 0) + (input.down('ArrowRight', 'KeyD') ? 1 : 0);
    P.vx = Q.lerp(P.vx, move * (P.duck ? 130 : 340), 1 - Math.pow(0.001, dt));
    if (!move && P.stun <= 0) P.vx *= Math.pow(0.02, dt);
    if (input.tap('Space', 'ArrowUp', 'KeyW') && P.ground && !P.duck && P.stun <= 0) {
      P.vy = -760;
      P.ground = false;
      audio.sfx('jump');
    }
    if (P.stun <= 0 && input.tap('KeyZ', 'ControlLeft')) fighterPlayerAttack('punch');
    if (P.stun <= 0 && input.tap('KeyX', 'KeyC')) fighterPlayerAttack('kick');
    P.vy += 2050 * dt;
    P.x = clamp(P.x + P.vx * dt, 90, 1430);
    P.y += P.vy * dt;
    if (P.y >= Q.GROUND - P.h) { P.y = Q.GROUND - P.h; P.vy = 0; P.ground = true; }
    f.face = P.x < f.x ? -1 : 1;
    P.face = f.x >= P.x ? 1 : -1;
    const dist = f.x - P.x;
    const ad = Math.abs(dist);
    if (f.stun <= 0 && f.think <= 0 && !f.attack) {
      f.think = rand(0.2, 0.5);
      if (f.cool <= 0 && ad < 205 && Math.random() < 0.64) {
        enemyStart(Math.random() < 0.53 ? 'punch' : 'kick');
        f.cool = rand(0.82, 1.35);
      } else if (Math.random() < 0.2) f.guard = 0.55;
      else if (ad > 180) f.vx = -Math.sign(dist) * rand(125, 240);
      else f.vx = Math.sign(dist) * rand(90, 175);
      if (Math.random() < 0.07 && f.ground && ad > 220) { f.vy = -630; f.ground = false; }
    }
    if (f.guard > 0) f.vx *= 0.78;
    f.vy += 2050 * dt;
    f.x = clamp(f.x + f.vx * dt, 100, 1500);
    f.y += f.vy * dt;
    if (f.y >= Q.GROUND - f.h) { f.y = Q.GROUND - f.h; f.vy = 0; f.ground = true; }
    f.vx *= Math.pow(f.stun > 0 ? 0.28 : 0.12, dt);
    if (P.attack) {
      const prog = clamp((now() - P.attackT) / P.attackLen, 0, 1);
      const active = prog > 0.24 && prog < 0.64;
      const reach = P.attack === 'kick' ? 178 : 135;
      if (active && Math.abs(P.x - f.x) < reach && !P.hitLatch) {
        P.hitLatch = true;
        let dmg = P.attack === 'kick' ? 14 : 9;
        if (f.guard > 0) {
          dmg = Math.ceil(dmg * 0.35);
          f.hp -= dmg;
          f.vx = P.face * 120;
          float('BLOCKED', f.x, f.y - 15, '#8feaff');
        } else {
          fighterHitTarget(f, dmg, P.face * (P.attack === 'kick' ? 390 : 300), P.attack === 'kick' ? 'KICK' : 'PUNCH');
          P.combo = now() < P.comboUntil ? P.combo + 1 : 1;
          P.comboUntil = now() + 900;
          if (!S.practice && P.combo >= 5) ACH.flag('fighterCombo');
          score(90 + P.combo * 10, f.x, f.y);
        }
      }
      if (prog >= 1) { P.attack = null; P.hitLatch = false; }
    }
    if (f.attack) {
      const prog = clamp((now() - f.attackT) / f.attackLen, 0, 1);
      const active = prog > 0.3 && prog < 0.62;
      const range = f.attack === 'kick' ? 176 : 142;
      if (active && Math.abs(P.x - f.x) < range && !f.hitLatch) {
        f.hitLatch = true;
        const vertical = f.attack === 'kick'
          ? Math.abs((P.y + 95) - (f.y + 116)) < 72
          : Math.abs((P.y + (P.duck ? 105 : 52)) - (f.y + 58)) < 66;
        if (vertical) {
          if (f.attack === 'punch' && P.duck) float('DUCKED', P.x, P.y - 15, '#72f1ff');
          else if (f.attack === 'kick' && !P.ground) float('JUMPED', P.x, P.y - 15, '#72f1ff');
          else fighterHitTarget(P, f.attack === 'kick' ? 18 : 13, f.face * 330, f.attack === 'kick' ? 'STAGGERED' : 'HIT');
        }
      }
      if (prog >= 1) { f.attack = null; f.hitLatch = false; f.cool = rand(0.82, 1.35); }
    }
    // Keep fighters apart enough to avoid permanent overlap/button mashing.
    if (Math.abs(f.x - P.x) < 72 && P.ground && f.ground) {
      const push = (72 - Math.abs(f.x - P.x)) * 0.5;
      if (f.x > P.x) { f.x += push; P.x -= push; }
      else { f.x -= push; P.x += push; }
    }
    if (f.hp <= 0) {
      if (!S.practice) {
        ACH.add('fighterWins', 1);
        if (P.combo >= 5) ACH.flag('fighterCombo');
      }
      score(2600, f.x, f.y);
      if (S.practice) transition('PRACTICE COMPLETE', 'Tier-Tex has been defeated.', 'title', 1.8);
      else enterStage(2);
      return;
    }
    if (f.boutTime <= 0) {
      if (f.hp < P.hp) {
        score(1300, f.x, f.y);
        if (S.practice) transition('TECHNICAL WIN', 'The timer rescued the conversion.', 'title', 1.8);
        else enterStage(2);
      } else {
        if (S.practice) transition('TECHNICAL DRAW', 'Nobody found a special move.', 'title', 1.8);
        else enterStage(2);
      }
    }
  }

  function update(dt) {
    S.time += dt;
    if (S.mode === 'transition') {
      S.transition.t += dt;
      if (S.transition.t >= S.transition.dur) mode(S.transition.next);
    } else if (S.mode === 'stage') updateStage(dt);
    else if (S.mode === 'boss') updateBoss(dt);
    else if (S.mode === 'beads') updateBeads(dt);
    else if (S.mode === 'fighter') updateFighter(dt);
    for (const p of S.particles) {
      p.life -= dt;
      if (p.kind === 'dot') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 360 * dt;
      } else p.y -= 34 * dt;
    }
    S.particles = S.particles.filter((p) => p.life > 0);
    S.flash = Math.max(0, S.flash - dt);
    S.shake *= Math.pow(0.01, dt);
  }

  function bg(id) {
    const im = assets.get(`custom_bg_${id}`) || assets.get(`bg_${id}`);
    if (im) { ctx.drawImage(im, 0, 0, Q.W, Q.H); return; }
    const pal = {
      bedroom: ['#19133a', '#39284c'],
      budget: ['#101b2d', '#4c2d25'],
      christmas: ['#162e32', '#402044'],
      amiga: ['#06192c', '#192868'],
      guru: ['#13020b', '#460811'],
      beads: ['#341d65', '#111128'],
      fighter: ['#8072b7', '#302b5a'],
    }[id] || ['#111', '#222'];
    const g = ctx.createLinearGradient(0, 0, 0, Q.H);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, Q.W, Q.H);
  }

  function drawLine(x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function drawMascotHead(cx, top, size, face) {
    const custom = assets.get('player_head');
    const source = custom || assets.get('custom_mascot') || assets.get('mascot_source');
    if (!source) {
      ctx.fillStyle = '#efb58e';
      ctx.beginPath(); ctx.arc(cx, top + size * 0.5, size * 0.45, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save();
    if (face < 0) { ctx.translate(cx * 2, 0); ctx.scale(-1, 1); }
    if (custom) ctx.drawImage(source, cx - size * 0.5, top, size, size * 1.02);
    else {
      // Use only the mascot's head/cap/face from the supplied logo artwork.
      const sw = source.naturalWidth * 0.49;
      const sh = source.naturalHeight * 0.74;
      ctx.drawImage(source, 0, 0, sw, sh, cx - size * 0.55, top, size * 1.1, size * 1.05);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const duck = P.duck && P.ground;
    const run = Math.abs(P.vx) > 38 && !duck && P.stun <= 0;
    const jump = !P.ground;
    const attackProg = P.attack ? clamp((now() - P.attackT) / P.attackLen, 0, 1) : 0;
    const punchReach = P.attack === 'punch' ? Math.sin(attackProg * Math.PI) : 0;
    const kickReach = P.attack === 'kick' ? Math.sin(attackProg * Math.PI) : 0;
    const walk = run ? Math.sin(P.anim) : 0;
    const cx = P.x + P.w / 2;
    const groundY = P.y + P.h;
    const bodyTop = duck ? groundY - 88 : groundY - 120;
    const hipY = duck ? groundY - 48 : groundY - 61;
    const shoulderY = bodyTop + 38;
    const headTop = duck ? bodyTop - 35 : bodyTop - 54;
    const face = P.face || 1;
    if (now() < P.inv && Math.floor(now() / 85) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(cx, groundY + 10, duck ? 45 : 39, 10, 0, 0, Math.PI * 2); ctx.fill();
    const customBody = assets.get('player_body');
    const customArm = assets.get('player_arm');
    const customLeg = assets.get('player_leg');
    const legSwing = jump ? 0 : walk * 18;
    const legData = [
      { x: cx - 15, swing: legSwing, front: false },
      { x: cx + 15, swing: -legSwing, front: true },
    ];
    for (const leg of legData) {
      const thighEndX = leg.x + leg.swing * 0.55 + (P.attack === 'kick' && leg.front ? face * 62 * kickReach : 0);
      const thighEndY = hipY + (duck ? 24 : 31) - (P.attack === 'kick' && leg.front ? 26 * kickReach : 0);
      const footX = thighEndX + leg.swing * 0.55 + (P.attack === 'kick' && leg.front ? face * 72 * kickReach : 0);
      const footY = jump ? groundY - 18 : (P.attack === 'kick' && leg.front ? groundY - 45 * kickReach : groundY - 4);
      if (customLeg) {
        const lw = 38;
        const lh = Math.max(58, footY - hipY + 25);
        ctx.save(); ctx.translate(leg.x, hipY); ctx.rotate(Math.atan2(footY - hipY, footX - leg.x) - Math.PI / 2); ctx.drawImage(customLeg, -lw / 2, 0, lw, lh); ctx.restore();
      } else {
        drawLine(leg.x, hipY, thighEndX, thighEndY, 31, '#07111b');
        drawLine(leg.x, hipY, thighEndX, thighEndY, 21, '#194b67');
        drawLine(thighEndX, thighEndY, footX, footY - 8, 29, '#07111b');
        drawLine(thighEndX, thighEndY, footX, footY - 8, 19, '#24617e');
        ctx.fillStyle = '#080b10'; ctx.strokeStyle = '#07111b'; ctx.lineWidth = 5;
        rr(footX - (face > 0 ? 15 : 27), footY - 15, 42, 20, 8, true, true);
      }
    }
    if (customBody) ctx.drawImage(customBody, cx - 49, bodyTop + 20, 98, duck ? 72 : 92);
    else {
      ctx.fillStyle = '#194b67'; ctx.strokeStyle = '#07111b'; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 43, shoulderY - 5);
      ctx.quadraticCurveTo(cx - 55, bodyTop + 55, cx - 35, hipY + 12);
      ctx.lineTo(cx + 35, hipY + 12);
      ctx.quadraticCurveTo(cx + 55, bodyTop + 55, cx + 43, shoulderY - 5);
      ctx.quadraticCurveTo(cx, bodyTop + 8, cx - 43, shoulderY - 5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2e7898'; rr(cx - 31, bodyTop + 47, 62, 18, 8, true, false);
      text('CCG', cx, bodyTop + 61, 13, '#fff', 'center', 900);
    }
    const armSwing = jump ? 0 : -walk * 20;
    const forwardShoulderX = cx + face * 34;
    const backShoulderX = cx - face * 34;
    const forwardHandX = P.attack === 'punch'
      ? forwardShoulderX + face * (50 + 70 * punchReach)
      : (P.attack === 'kick' ? cx + face * 22 : forwardShoulderX + face * 22 + armSwing * 0.4);
    const forwardHandY = P.attack === 'punch' ? shoulderY + 8 : shoulderY + 44 + armSwing * 0.35;
    const backHandX = backShoulderX - face * 18 - armSwing * 0.4;
    const backHandY = shoulderY + 46 - armSwing * 0.35;
    function limbArm(sx, sy, hx, hy, forward) {
      if (customArm) {
        const dx = hx - sx; const dy = hy - sy; const len = Math.max(42, Math.hypot(dx, dy));
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(dy, dx)); if (!forward) ctx.scale(1, -1); ctx.drawImage(customArm, 0, -14, len, 28); ctx.restore();
      } else {
        const ex = (sx + hx) / 2 + (forward ? face * 5 : -face * 5);
        const ey = (sy + hy) / 2 + 7;
        drawLine(sx, sy, ex, ey, 28, '#07111b'); drawLine(sx, sy, ex, ey, 18, '#194b67');
        drawLine(ex, ey, hx, hy, 24, '#07111b'); drawLine(ex, ey, hx, hy, 14, '#efb58e');
        ctx.fillStyle = '#efb58e'; ctx.beginPath(); ctx.arc(hx, hy, 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    limbArm(backShoulderX, shoulderY, backHandX, backHandY, false);
    limbArm(forwardShoulderX, shoulderY, forwardHandX, forwardHandY, true);
    ctx.fillStyle = '#efb58e'; ctx.fillRect(cx - 13, bodyTop + 15, 26, 20);
    drawMascotHead(cx, headTop, duck ? 88 : 98, face);
    ctx.restore();
    ctx.globalAlpha = 1;
    bar(P.x - 14, P.y - 34, 108, P.hp / P.max, '#62ed8e');
    if (now() < P.shield) {
      const rem = clamp((P.shield - now()) / 7600, 0, 1);
      ctx.strokeStyle = rem < 0.25 ? '#ffd45d' : '#70efff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, P.y + 62, 78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem); ctx.stroke();
    }
  }

  function bar(x, y, w, p, c) {
    ctx.fillStyle = 'rgba(0,0,0,.75)'; rr(x, y, w, 14, 6, true, false);
    ctx.fillStyle = '#252334'; rr(x + 2, y + 2, w - 4, 10, 4, true, false);
    ctx.fillStyle = c; rr(x + 2, y + 2, (w - 4) * clamp(p, 0, 1), 10, 4, true, false);
  }

  function drawEntities() {
    for (const e of S.entities) {
      if (e.k === 'item') {
        const im = assets.get(`item_${e.type}`);
        if (im) ctx.drawImage(im, e.x, e.y, e.w, e.h);
        else { ctx.fillStyle = 'rgba(9,15,24,.82)'; ctx.strokeStyle = '#6eeaff'; ctx.lineWidth = 3; rr(e.x, e.y, e.w, e.h, 8, true, true); text(e.type.toUpperCase(), e.x + e.w / 2, e.y + 33, 12, '#fff', 'center'); }
      } else if (e.k === 'power') {
        const im = assets.get(`power_${e.type}`);
        if (im) ctx.drawImage(im, e.x, e.y, e.w, e.h);
        else { ctx.fillStyle = '#12101c'; ctx.strokeStyle = '#ffe56e'; ctx.lineWidth = 3; rr(e.x, e.y, e.w, e.h, 10, true, true); text(e.type === 'shield' ? 'AR' : e.type === 'double' ? 'X2' : 'CP', e.x + e.w / 2, e.y + 40, 18, '#ffe56e', 'center'); }
      } else if (e.k === 'enemy') {
        ctx.fillStyle = '#19141e'; ctx.strokeStyle = '#ff6bd5'; ctx.lineWidth = 4; rr(e.x, e.y, e.w, e.h, 10, true, true); text('8BIT', e.x + e.w / 2, e.y + 42, 13, '#7eeaff', 'center');
      } else if (e.k === 'haz') {
        if (e.wait > 0) {
          const countdown = e.m === 'beam' ? Math.max(1, Math.ceil(e.wait)) : null;
          text(countdown ? `GLITCH IN ${countdown}` : '! INCOMING !', e.x + e.w / 2, e.y - 18, countdown ? 18 : 14, countdown ? '#ffdf65' : '#ffd45d', 'center');
          ctx.strokeStyle = countdown ? '#ffdf65' : '#ff4964'; ctx.lineWidth = countdown ? 5 : 3; ctx.setLineDash([10, 8]); ctx.strokeRect(e.x - 8, e.y - 8, e.w + 16, e.h + 16); ctx.setLineDash([]);
          if (e.m === 'beam') { ctx.globalAlpha = 0.18 + 0.12 * Math.sin(now() / 80); ctx.fillStyle = '#ff4f66'; ctx.fillRect(e.x, e.y, e.w, e.h); ctx.globalAlpha = 1; }
          continue;
        }
        const im = assets.get(`hazard_${Q.STAGES[S.stage].id}`);
        if (im && e.m !== 'beam') ctx.drawImage(im, e.x, e.y, e.w, e.h);
        else if (e.m === 'beam') {
          ctx.shadowBlur = 24; ctx.shadowColor = '#ff3b61'; ctx.fillStyle = 'rgba(255,45,80,.68)'; ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = '#fff'; for (let yy = e.y; yy < e.y + e.h; yy += 34) ctx.fillRect(e.x + rand(5, e.w - 12), yy, rand(8, 25), 6);
          ctx.shadowBlur = 0;
        } else { ctx.fillStyle = '#3b1420'; ctx.strokeStyle = '#ff4964'; ctx.lineWidth = 4; rr(e.x, e.y, e.w, e.h, 10, true, true); text(e.label, e.x + e.w / 2, e.y + e.h / 2, 13, '#fff', 'center'); }
      } else if (e.k === 'bead') {
        ctx.shadowBlur = 22; ctx.shadowColor = '#66efff'; ctx.fillStyle = '#74f5ff'; ctx.beginPath(); ctx.arc(e.x + 27, e.y + 27, 23, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }

  function drawShots() {
    for (const s of S.shots) {
      ctx.shadowBlur = 14; ctx.shadowColor = s.owner === 'p' ? '#ffe66c' : '#ff536d'; ctx.fillStyle = s.owner === 'p' ? '#ffe66c' : '#ff536d'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  function drawBoss() {
    const b = S.boss;
    if (!b) return;
    const st = Q.STAGES[S.stage];
    const im = assets.get(`boss_${st.id}`);
    if (im) ctx.drawImage(im, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    else { ctx.fillStyle = '#12101a'; ctx.strokeStyle = st.accent; ctx.lineWidth = 6; rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 20, true, true); text(st.boss, b.x, b.y, 18, '#fff', 'center'); }
    bar(b.x - b.w / 2, b.y - b.h / 2 - 26, b.w, b.hp / b.max, '#ff5570');
    if (b.warn > 0) {
      const rem = Math.max(0, b.warn / b.warnDur);
      text(b.label, b.x, b.y - b.h / 2 - 50, 16, '#ffe66c', 'center');
      ctx.strokeStyle = '#ff5268'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y, 118 - 42 * rem, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawEnemyFighter(f) {
    let im = assets.get('fighter_enemy');
    if (f.stun > 0) im = assets.get('fighter_enemy_hit') || im;
    else if (f.attack === 'punch') im = assets.get('fighter_enemy_punch') || im;
    else if (f.attack === 'kick') im = assets.get('fighter_enemy_kick') || im;
    if (im) {
      ctx.save();
      if (f.face > 0) { ctx.translate(f.x * 2, 0); ctx.scale(-1, 1); }
      ctx.drawImage(im, f.x - 60, f.y - 4, 120, 158);
      ctx.restore();
      return;
    }
    const prog = f.attack ? clamp((now() - f.attackT) / f.attackLen, 0, 1) : 0;
    const punch = f.attack === 'punch' ? Math.sin(prog * Math.PI) : 0;
    const kick = f.attack === 'kick' ? Math.sin(prog * Math.PI) : 0;
    const dir = f.face || -1;
    const hipY = f.y + 102;
    const shoulderY = f.y + 53;
    ctx.save();
    if (f.stun > 0) ctx.rotate((dir * -3 * Math.PI) / 180);
    drawLine(f.x - 18, hipY, f.x - 25 - dir * 8, f.y + 145, 30, '#140e16');
    drawLine(f.x - 18, hipY, f.x - 25 - dir * 8, f.y + 145, 19, '#6a3740');
    const kickFootX = f.x + 18 + dir * (22 + 94 * kick);
    const kickFootY = f.y + 143 - 46 * kick;
    drawLine(f.x + 18, hipY, kickFootX, kickFootY, 30, '#140e16');
    drawLine(f.x + 18, hipY, kickFootX, kickFootY, 19, '#7d4248');
    ctx.fillStyle = '#111015'; rr(f.x - 48, f.y + 136, 50, 18, 7, true, false); rr(kickFootX - 20, kickFootY - 8, 50, 18, 7, true, false);
    ctx.fillStyle = f.guard > 0 ? '#46657b' : '#7b3c48'; ctx.strokeStyle = '#160f18'; ctx.lineWidth = 7; rr(f.x - 45, f.y + 42, 90, 75, 18, true, true);
    ctx.fillStyle = '#d6a075'; ctx.strokeStyle = '#160f18'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y + 25, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#161018'; ctx.fillRect(f.x - 25, f.y + 7, 50, 11);
    const punchHandX = f.x + dir * (50 + 76 * punch);
    const punchHandY = shoulderY + 3;
    const otherHandX = f.x - dir * 48;
    const otherHandY = shoulderY + 36;
    drawLine(f.x + dir * 34, shoulderY, punchHandX, punchHandY, 26, '#160f18'); drawLine(f.x + dir * 34, shoulderY, punchHandX, punchHandY, 16, '#d6a075');
    drawLine(f.x - dir * 34, shoulderY, otherHandX, otherHandY, 26, '#160f18'); drawLine(f.x - dir * 34, shoulderY, otherHandX, otherHandY, 16, '#d6a075');
    ctx.fillStyle = '#ffb759'; ctx.beginPath(); ctx.arc(punchHandX, punchHandY, 11, 0, Math.PI * 2); ctx.arc(otherHandX, otherHandY, 11, 0, Math.PI * 2); ctx.fill();
    text('TIER-TEX', f.x, f.y + 84, 13, '#fff', 'center');
    ctx.restore();
  }

  function drawFighter() {
    bg('fighter');
    const f = S.fighter;
    drawPlayer();
    drawEnemyFighter(f);
    bar(f.x - 52, f.y - 28, 104, f.hp / f.max, '#ff6a62');
    text('36% CONVERSION BOUT', 800, 88, 28, '#ffe56e', 'center');
    text('Z/CTRL PUNCH   X/C KICK   ↓ DUCK   SPACE JUMP', 800, 125, 15, '#fff', 'center');
    text(`ROUND TIMER ${Math.ceil(f.boutTime)}`, 800, 154, 15, '#7eeaff', 'center');
    if (f.messageT > 0) text(f.message, 800, 188, 18, '#ffcf68', 'center');
    if (P.combo > 1 && now() < P.comboUntil) text(`${P.combo} HIT COMBO`, P.x + P.w / 2, P.y - 56, 15, '#ffe66c', 'center');
  }

  function stageNextLabel() {
    if (S.stage === 0) return 'ELECTRIC BEAD RUN';
    if (S.stage === 1) return '36% CONVERSION BOUT';
    if (S.stage === 2) return 'AMIGA UPGRADE';
    if (S.stage === 3) return 'GURU MEDITATION';
    return 'FINAL BOSS';
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(4,4,12,.82)'; ctx.fillRect(0, 0, Q.W, 82);
    text(`SCORE ${Q.fmt(S.score)}`, 24, 31, 18, '#fff');
    text(`LIVES ${'♥'.repeat(Math.max(0, S.lives))}`, 24, 59, 16, '#ff7690');
    const title = S.mode === 'fighter' ? '36% BOUT' : S.mode === 'beads' ? 'ELECTRIC BEAD RUN' : Q.STAGES[S.stage]?.name || '';
    text(title, 800, 31, 19, '#7eeaff', 'center');
    text(`BEST ${Q.fmt(S.best)}`, 1570, 31, 17, '#fff', 'right');
    text(`RANK ${ACH.rank()}`, 1570, 58, 13, '#ffd45d', 'right');
    let progress = 0;
    let status = '';
    if (S.mode === 'stage') {
      const dur = Q.STAGES[S.stage].duration;
      progress = clamp(S.elapsed / dur, 0, 1);
      status = `NEXT: ${stageNextLabel()} IN ${Math.max(0, Math.ceil(dur - S.elapsed))}s`;
    } else if (S.mode === 'boss') {
      progress = S.boss ? 1 - S.boss.hp / S.boss.max : 0;
      status = 'BOSS PHASE — DEFEAT IT TO CONTINUE';
    } else if (S.mode === 'beads') {
      progress = clamp(S.beadTime / 24, 0, 1);
      status = `BEAD RUN ${Math.max(0, Math.ceil(24 - S.beadTime))}s`;
    } else if (S.mode === 'fighter') {
      progress = S.fighter ? 1 - S.fighter.boutTime / 45 : 0;
      status = 'WIN THE BOUT TO REACH CHRISTMAS MORNING';
    }
    if (['stage', 'boss', 'beads', 'fighter'].includes(S.mode)) {
      ctx.fillStyle = '#171525'; ctx.fillRect(330, 66, 940, 8);
      ctx.fillStyle = '#72eaff'; ctx.fillRect(330, 66, 940 * progress, 8);
      text(status, 800, 60, 12, '#d7d8e8', 'center');
    }
    if (now() < P.shield) {
      const rem = Math.max(0, (P.shield - now()) / 1000);
      text(`ACTION REPLAY ${rem.toFixed(1)}s`, 800, 80, 12, rem < 2 ? '#ffcf5a' : '#78efff', 'center');
    }
  }

  function particlesDraw() {
    for (const p of S.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      if (p.kind === 'dot') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      else text(p.t, p.x, p.y, 16, p.c, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function button(x, y, w, h, label, fn, danger = false) {
    ctx.fillStyle = danger ? '#32101a' : '#111223'; ctx.strokeStyle = danger ? '#ff6174' : '#68e7ff'; ctx.lineWidth = 3;
    rr(x, y, w, h, 10, true, true); text(label, x + w / 2, y + h / 2 + 7, 17, danger ? '#ff9aaa' : '#fff', 'center');
    S.buttons.push({ x, y, w, h, fn });
  }

  function title() {
    S.buttons = [];
    bg('bedroom');
    ctx.fillStyle = 'rgba(0,0,0,.56)'; ctx.fillRect(0, 0, Q.W, Q.H);
    text("CHEEKY'S COMMODORE QUEST", 800, 220, 55, '#72eaff', 'center', 900);
    text('C64 / AMIGA ARCADE PARODY', 800, 270, 21, '#ffe56e', 'center');
    drawMascotHead(800, 300, 130, 1);
    button(590, 485, 420, 62, 'START QUEST', startQuest);
    button(590, 565, 420, 58, 'LEVEL SELECT', () => mode('levels'));
    button(590, 640, 420, 58, 'ACHIEVEMENTS', () => mode('achievements'));
    text('MOVE: A/D OR ←/→   JUMP: SPACE   DUCK: S/↓   FIRE: Z/CTRL', 800, 750, 14, '#ddd', 'center');
  }

  function levels() {
    S.buttons = [];
    ctx.fillStyle = '#080713'; ctx.fillRect(0, 0, Q.W, Q.H);
    text('LEVEL SELECT', 800, 100, 42, '#72eaff', 'center');
    text('PRACTICE RUNS DO NOT SUBMIT SCORES', 800, 140, 14, '#ffe56e', 'center');
    Q.LEVELS.forEach(([id, label], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      button(270 + col * 545, 205 + row * 105, 500, 70, label.toUpperCase(), () => practice(id));
    });
    button(650, 700, 300, 52, 'BACK', () => mode('title'));
  }

  function achievementScreen() {
    S.buttons = [];
    ctx.fillStyle = '#080713'; ctx.fillRect(0, 0, Q.W, Q.H);
    text('CCG ACHIEVEMENTS', 800, 65, 40, '#72eaff', 'center');
    const list = ACH.entries();
    list.forEach((a, i) => {
      const c = i % 4;
      const r = Math.floor(i / 4);
      const x = 45 + c * 385;
      const y = 105 + r * 98;
      ctx.fillStyle = a.done ? 'rgba(45,130,80,.26)' : 'rgba(15,16,29,.9)';
      ctx.strokeStyle = a.done ? '#78efa4' : '#555a6d';
      rr(x, y, 355, 82, 10, true, true);
      text(`${a.done ? '✓ ' : ''}${a.name}`, x + 12, y + 24, 13, a.done ? '#8cffb5' : '#fff');
      text(a.desc.slice(0, 43), x + 12, y + 45, 10, '#adb1c2');
      text(`${Math.min(a.value, a.target)}/${a.target}`, x + 335, y + 68, 10, '#ffd45d', 'right');
    });
    button(650, 805, 300, 45, 'BACK', () => mode('title'));
  }

  function drawStageScene() {
    const id = Q.STAGES[S.stage]?.id || 'bedroom';
    bg(id); drawEntities(); drawShots(); drawPlayer(); if (S.mode === 'boss') drawBoss(); drawHUD();
  }

  function drawBeads() {
    bg('beads'); drawEntities(); drawPlayer(); drawHUD();
  }

  function overlay() {
    if (S.mode === 'transition') {
      ctx.fillStyle = 'rgba(0,0,0,.68)'; ctx.fillRect(0, 0, Q.W, Q.H);
      text(S.transition.title, 800, 410, 48, '#72eaff', 'center');
      text(S.transition.sub, 800, 465, 20, '#ffe56e', 'center');
    } else if (S.mode === 'pause' || S.mode === 'quit') {
      S.buttons = [];
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, Q.W, Q.H);
      text(S.mode === 'pause' ? 'PAUSED' : 'ABANDON THIS RUN?', 800, 300, 52, S.mode === 'pause' ? '#72eaff' : '#ff7183', 'center');
      button(590, 375, 420, 58, 'RESUME', () => mode(S.returnMode));
      if (S.mode === 'pause') button(590, 450, 420, 58, 'LEVEL SELECT', () => mode('levels'));
      button(590, S.mode === 'pause' ? 525 : 460, 420, 58, 'QUIT TO TITLE', quit, true);
    } else if (S.mode === 'over' || S.mode === 'won') {
      S.buttons = [];
      ctx.fillStyle = 'rgba(0,0,0,.74)'; ctx.fillRect(0, 0, Q.W, Q.H);
      text(S.mode === 'won' ? 'COMMODORE QUEST COMPLETE' : 'GAME OVER', 800, 280, 54, S.mode === 'won' ? '#7df0a5' : '#ff7183', 'center');
      text(`SCORE ${Q.fmt(S.score)}`, 800, 350, 30, '#fff', 'center');
      button(535, 420, 250, 60, 'PLAY AGAIN', startQuest);
      button(815, 420, 250, 60, 'LEVEL SELECT', () => mode('levels'));
      button(675, 505, 250, 54, 'TITLE', quit);
    }
  }

  function draw() {
    ctx.save();
    const sh = S.shake;
    ctx.translate(sh ? rand(-sh, sh) : 0, sh ? rand(-sh, sh) : 0);
    if (S.mode === 'title') title();
    else if (S.mode === 'levels') levels();
    else if (S.mode === 'achievements') achievementScreen();
    else if (S.mode === 'fighter') { drawFighter(); drawHUD(); }
    else if (S.mode === 'beads') drawBeads();
    else drawStageScene();
    particlesDraw();
    if (S.toast && now() < S.toast.until) {
      ctx.fillStyle = 'rgba(4,8,15,.94)'; ctx.strokeStyle = '#ffd45d'; ctx.lineWidth = 3;
      rr(1080, 760, 470, 105, 12, true, true);
      text('ACHIEVEMENT UNLOCKED', 1100, 790, 13, '#ffd45d');
      text(S.toast.text, 1100, 820, 19, '#fff');
      text(`+${S.toast.xp} CCG XP`, 1100, 846, 13, '#7ff0a4');
    }
    overlay();
    ctx.restore();
    if (S.flash > 0) {
      ctx.globalAlpha = S.flash; ctx.fillStyle = '#ff4964'; ctx.fillRect(0, 0, Q.W, Q.H); ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.07; ctx.fillStyle = '#000'; for (let y = 0; y < Q.H; y += 4) ctx.fillRect(0, y, Q.W, 1); ctx.globalAlpha = 1;
  }

  function gameOver() { mode('over'); if (!S.practice) ACH.save(); }
  function win() { if (!S.practice) { ACH.flag('won'); if (S.lives === 3) ACH.flag('oneCredit'); } mode('won'); }
  function quit() { audio.setTheme(0, false, 'title'); reset(); mode('title'); }

  function pointer(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) * Q.W) / r.width, y: ((ev.clientY - r.top) * Q.H) / r.height };
  }

  canvas.addEventListener('pointerdown', (e) => {
    focus();
    const p = pointer(e);
    for (let i = S.buttons.length - 1; i >= 0; i -= 1) {
      const b = S.buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); break; }
    }
  });

  function pause() {
    if (['stage', 'boss', 'beads', 'fighter', 'transition'].includes(S.mode)) { S.returnMode = S.mode; mode('pause'); }
    else if (S.mode === 'pause') mode(S.returnMode);
  }

  document.getElementById('btn-pause').onclick = pause;
  document.getElementById('btn-level').onclick = () => mode('levels');
  document.getElementById('btn-quit').onclick = () => { if (S.mode === 'title') return; S.returnMode = S.mode; mode('quit'); };
  document.getElementById('btn-fullscreen').onclick = () => {
    const sh = document.getElementById('game-shell');
    if (document.fullscreenElement) document.exitFullscreen?.();
    else sh.requestFullscreen?.();
    focus();
  };

  document.querySelectorAll('[data-touch]').forEach((b) => {
    const n = b.dataset.touch;
    ['pointerdown', 'touchstart'].forEach((ev) => b.addEventListener(ev, (e) => { e.preventDefault(); input.setVirtual(n, true); }));
    ['pointerup', 'pointercancel', 'pointerleave', 'touchend'].forEach((ev) => b.addEventListener(ev, (e) => { e.preventDefault(); input.setVirtual(n, false); }));
  });

  addEventListener('keydown', (e) => { if (e.code === 'Escape') pause(); });

  function loop(t) {
    const dt = Math.min(0.033, (t - S.last) / 1000 || 0);
    S.last = t;
    if (!['title', 'levels', 'achievements', 'pause', 'quit', 'over', 'won', 'loading'].includes(S.mode)) update(dt);
    draw();
    input.clear();
    requestAnimationFrame(loop);
  }

  window.CCGQuestDebug = {
    startQuest,
    practice,
    getState: () => ({
      mode: S.mode,
      stage: S.stage,
      score: S.score,
      elapsed: S.elapsed,
      player: { x: P.x, y: P.y, hp: P.hp, duck: P.duck, face: P.face, stun: P.stun },
      boss: S.boss && { x: S.boss.x, y: S.boss.y, hp: S.boss.hp, type: S.boss.type, warn: S.boss.warn },
      fighter: S.fighter && { x: S.fighter.x, hp: S.fighter.hp, attack: S.fighter.attack, stun: S.fighter.stun },
    }),
  };

  Promise.resolve(Q.hydrateRemoteAssets?.())
    .catch(() => false)
    .then(load)
    .then(() => {
      loading.classList.add('is-hidden');
      audio.setTheme(0, false, 'title');
      mode('title');
      requestAnimationFrame(loop);
    })
    .catch((e) => {
      loading.textContent = `LOAD ERROR: ${e.message}`;
      console.error(e);
    });
}());
