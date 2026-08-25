/* The Lost Sizzler — developer changelog / bug tracker. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__)return;
  window.__CCG_LOST_SIZZLER_DEVELOPER_CHANGELOG__=true;

  const days=[
    {
      date:"25 AUGUST 2026",
      iso:"2026-08-25",
      entries:[
        ["LS-0825-01","FIXED","Browser frame crash containment","The animation loop now survives isolated update or render exceptions, throttles repeated fault storms and repairs safe runtime state instead of allowing one frame error to strand the tab."],
        ["LS-0825-02","FIXED","Pause, focus and resume recovery","Pause/resume, tab visibility, browser focus and fullscreen restoration now clear stale input and repair frame timing, camera and canvas state before play continues."],
        ["LS-0825-03","CHANGED","Horde encounter pacing","Horde uses a compact combat arena so new waves reach players quickly instead of spending long periods crossing the near-full procedural world."],
        ["LS-0825-04","FIXED","Spy Vs Spy movement recovery","Spy rounds repair stale hit-stun and blocked spawn state, with a final walkability-checked movement fallback so an agent cannot be left rotating in place."],
        ["LS-0825-05","FIXED","Tutorial action ownership","Movement, sword and dash training now count real completed actions without wrapper chains double-counting or later enhancement modules stealing tutorial progress ownership."],
        ["LS-0825-06","CHANGED","Wandering merchant encounter","The wandering merchant is protected until genuinely seen, is brought to a safe visible position when needed, remains available for ninety seconds of usable encounter time, warns before leaving and never disappears during an open purchase."],
        ["LS-0825-07","CHANGED","r22 final cache-safe delivery","Build 2026.08.25.22 uses cache generation 20260825r22 across canonical runtime assets. The generation was advanced after a real stale-cache reproduction so browsers cannot reuse earlier r21 game files after the final stability fixes."],
        ["LS-0825-08","FIXED","Current browser regression coverage","Historical Chromium tests now use the canonical arcade path, matching Playwright Chromium and non-blocking held-fire sampling so release failures describe the game rather than stale test infrastructure."]
      ]
    },
    {
      date:"24 AUGUST 2026",
      iso:"2026-08-24",
      entries:[
        ["LS-0824-01","ADDED","Horde Survivor mode","A live solo and online co-op Horde mode now runs ten escalating waves with unlimited ammunition, weapon upgrades, revives and a timed armoured-knight finale."],
        ["LS-0824-02","ADDED","Spy Vs Spy multiplayer","Sizzler Saboteurs is now a live two-player-only browser mode with room searches, traps, novelty weapons, extraction objectives and a best-of-five match structure."],
        ["LS-0824-03","CHANGED","Online room rules and synchronisation","Multiplayer lobbies now enforce each mode's player cap, use host-authoritative simulation and synchronise room mode, doors, player state and special-mode snapshots for browser players in different locations."],
        ["LS-0824-04","CHANGED","Voice and music discipline","Speech uses one non-stacking channel with restrained dungeon ambience, lower overall volume and tighter cue rules. Music changes no longer overlap, preventing layered playback and associated stutter."],
        ["LS-0824-05","CHANGED","Bounties and floor mutations","Dungeon bounties wait 20 seconds before appearing and show a live enemy countdown. Floor mutations wait two minutes before activation, while Darkness now reduces the torchless light area more noticeably."],
        ["LS-0824-06","CHANGED","Combat and dungeon balance","The Gilded Elf moves 20% faster, enemies cannot occupy player tiles, the first floor's first defeated enemy guarantees an early firearm, and melee movement no longer loses its purpose through hostile tile overlap."],
        ["LS-0824-07","FIXED","Two-player split-screen startup","The retired solo tutorial chooser no longer intercepts local split-screen startup. Both local players are verified before play begins and a failed launch now returns safely to the menu."],
        ["LS-0824-08","FIXED","Locked chest feedback","Repeated movement into a locked chest is throttled so the lock sound and report cannot retrigger every input frame and make the screen appear to shudder."],
        ["LS-0824-09","CHANGED","Tutorial progress and visual tours","Sword and dash counters now repaint at 1/3, 2/3 and 3/3. The five information lessons pause for live highlighted interface tours and illustrated examples covering objectives, survival items, locks, enemies, the Death Stalker, events, shops, hazards and score."],
        ["LS-0824-10","CHANGED","Tutorial completion","The final lesson now states ‘You Are Ready To Take On The Adventure!’ and presents one Complete Tutorial action instead of two buttons that performed the same exit."],
        ["LS-0824-11","CHANGED","Pixel-art presentation","The title screen now uses a full dungeon scene with a responsive pixel title and rebuilt mode controls. The playable explorer has directional idle, walking, sword and hurt frames, while common, rare and locked chests have animated closed, glint, opening and open states."]
        ,["LS-0824-12","CHANGED","Dungeon-backed multiplayer modes","Horde and Spy Vs Spy now run on the main generated dungeon, retaining its tiles, doors, furniture, lighting, collision, player rendering and host-authoritative world synchronisation instead of using an abstract arena renderer."]
        ,["LS-0824-13","FIXED","Complete special-mode music","The original full-length Spy Vs Spy theme and all three Horde tracks were restored byte-for-byte and decode successfully; exclusive music ownership prevents overlap and the Spy theme loops only after the complete track."]
        ,["LS-0824-14","ADDED","Production sprite atlases","Common dungeon enemies, Horde enemies, four door families and wall torches now use fixed-cell transparent pixel atlases with idle, movement, attack, opening and flicker animation frames, retaining procedural fallbacks for exceptional characters."]
        ,["LS-0824-15","FIXED","Door accessibility validation","Every generated functional door is checked after decoration for a walkable approach on both sides. Blocking furniture or unsafe wall framing is removed or repaired before play and the invariant is covered across seeded floors."]
        ,["LS-0824-16","CHANGED","Sanctuary safe zones and healing","No monster type can enter a sanctuary. Each sanctuary contains a visible regeneration square that restores 1 HP every 3 seconds while occupied, and sanctuary speech is authorised only by genuine room entry."]
        ,["LS-0824-17","CHANGED","Contextual ammo-saving melee","Fire automatically uses the unlimited melee weapon when an enemy or smashable item occupies the faced adjacent tile; the firearm and ammunition are used only beyond melee range."]
        ,["LS-0824-18","FIXED","Synchronous bounty announcement","The New Dungeon Bounty speech and bounty banner now start together from one accepted announcement event, with a bounded fallback when voice playback is unavailable."]
        ,["LS-0824-19","ADDED","Beta and ownership marks","The menu now carries the requested beta-stage notice and the game view is permanently stamped © 2026 Cheeky Commodore Gamer."]
        ,["LS-0824-20","FIXED","Trap warnings and mobile notifications","Ordinary fire, spike and shock traps are now visible and active during their live cycles. Each player receives one warning when first entering a three-tile danger radius, and shared gameplay notifications such as Dungeon Bounty and trap alerts are kept visible on phone layouts."]
        ,["LS-0824-21","FIXED","Online melee visibility","Dungeon and Horde co-op players now receive the other player's directional melee swing state and slash effects, so close-range attacks are visible on both browsers instead of existing only on the attacking client."]
        ,["LS-0824-22","FIXED","Co-op teammate radar","Online Dungeon and Horde teammates now appear on the tactical radar with player markers and edge direction indicators when outside the current radar window. Spy Vs Spy retains its intentional no-minimap rule."]
        ,["LS-0824-23","FIXED","Dungeon, Horde and Spy room joining","The multiplayer join handshake now preserves the selected room mode, survives host start packets arriving during connection, and supplies late joiners with the host's active start metadata instead of falling back to the wrong mode or reopening the lobby."]
        ,["LS-0824-24","ADDED","Shared multiplayer invite joining","Invite links created by the multiplayer lobby carry the room and mode. Opening one now presents a dedicated player-name confirmation first; after the guest confirms their name, the game joins automatically and either waits in the correct lobby or enters the already-started Dungeon, Horde or Spy Vs Spy match."]
      ]
    },
    {
      date:"23 AUGUST 2026",
      iso:"2026-08-23",
      entries:[
        ["LS-0823-01","FIXED","Enemy dossier discovery","Unknown named enemies are no longer exposed. A dossier entry opens only on the first encounter with that enemy type, and later encounters do not reopen it."],
        ["LS-0823-02","FIXED","Direct-link startup freeze","Cold starts from direct and in-app links were hardened by loading browser stability protection earlier and allowing optional enhancements to fail or time out without blocking the game."],
        ["LS-0823-03","FIXED","Gameplay notification overlap","Important notices, rating prompts and status messages were moved outside the playable canvas so they cannot cover or split the action."],
        ["LS-0823-04","FIXED","Browser stability risks","Canvas allocation limits, transient render-state ceilings and bounded custom-audio retry behaviour were added to reduce runaway resource use and tab crashes."],
        ["LS-0823-05","CHANGED","Mobile gameplay layout","Phone layouts now prioritise the game view, reserve dedicated touch-control space and keep non-essential desktop panels away from active play."],
        ["LS-0823-06","CHANGED","Difficulty by dungeon depth","Early rooms are more forgiving while enemy pressure rises deeper into each generated floor. Ordinary enemies are also kept away from corridor and doorway spawn cells."],
        ["LS-0823-07","ADDED","Player activity and ratings","Actual run starts, supported device starts, play activity and the timed rating prompt are recorded for the developer insights dashboard."],
        ["LS-0823-08","ADDED","Bug-report reply workflow","Bug reports and suggestions now have their own admin area with reply support and feedback history instead of being mixed into Arcade Assets."],
        ["LS-0823-09","CHANGED","Mobile enemy projectile aiming","On mobile and touch devices, enemy projectiles are restricted to horizontal or vertical firing lanes instead of diagonal shots, improving fairness with touch movement controls."],
        ["LS-0823-10","ADDED","Mobile minimap toggle","A MAP button has been added to the mobile touch controls. It opens a compact minimap using the existing explored-area radar data and discovered markers, and can be toggled off during play."],
        ["LS-0823-11","CHANGED","Rating prompt timing","The automatic game-rating prompt now appears after five minutes of active gameplay instead of two minutes, giving players longer to form an opinion before being asked."],
        ["LS-0823-12","ADDED","Dedicated ratings admin page","Submitted 1–5 star ratings now have their own admin page with average score, total submissions, today's ratings, five-star share, prompt response rate, star distribution, filters and individual submission details."],
        ["LS-0823-13","ADDED","Weekly Dungeon reset countdown","After a registered player's ranked Weekly Dungeon attempt has been used, the locked start button now displays a live countdown to the Monday 00:00 UTC reset. The challenge state refreshes automatically when the countdown reaches zero so the next weekly attempt becomes available without a page reload."],
        ["LS-0823-14","ADDED","Gilded Elf bonus encounter","A rare seeded Gilded Elf can now appear on any floor. It has 10 HP and 5 armour, never attacks, flees for up to 30 seconds within a two-screen tether and leaves a dust trail. It drops 10 gold every three seconds and on damaging hits, with anti-spam protection, while defeating it releases a 100-gold jackpot."]
      ]
    },
    {
      date:"22 AUGUST 2026",
      iso:"2026-08-22",
      entries:[
        ["LS-0822-01","FIXED","Quit Game control","The Quit Game action now leaves the game and returns to the CCG Games hub instead of failing to exit."],
        ["LS-0822-02","FIXED","Uploaded playlist playback","Admin-uploaded soundtrack playlists now receive the active game music state correctly rather than being bypassed by the cached sound object."],
        ["LS-0822-03","CHANGED","Continuous exploration music","Exploration music now continues through ordinary rooms and corridors and resumes from the same position after temporary combat, sanctuary or named-enemy themes."],
        ["LS-0822-04","ADDED","Multi-track soundtrack playlists","Exploration, Combat, Sanctuary, Named Enemy and Count Loadula categories gained multi-track playlists with random no-repeat selection and controlled transitions."],
        ["LS-0822-05","FIXED","Sealed-room respawn soft-lock","Death recovery was hardened so a player cannot respawn into a state where a sealed challenge room leaves the run blocked."],
        ["LS-0822-06","CHANGED","Persistent inventory HUD","Carried items remain visible in the tactical sidebar and numbered quick-slot activation was added for faster item use."],
        ["LS-0822-07","FIXED","Sidebar and fullscreen UI","Carried-item positioning, tactical radar overlap and fullscreen popup contrast were corrected."],
        ["LS-0822-08","CHANGED","Death Stalker economy","Stalker rewards and Banishment Flask pricing were simplified and balanced, with regression coverage added around the revised rules."]
      ]
    }
  ];

  const statusClass=status=>status.toLowerCase().replace(/[^a-z]+/g,"-");
  const entryHtml=([id,status,title,copy])=>`<article class="developer-log-entry"><code class="developer-log-id">${id}</code><span class="developer-log-status ${statusClass(status)}">${status}</span><div class="developer-log-copy"><b>${title}</b><span>${copy}</span></div></article>`;

  function mount(){
    if(document.getElementById("developer-changelog"))return;
    const menu=document.querySelector("#menu .panel");
    if(!menu)return;
    const anchor=menu.querySelector(".secondary-menu")||menu.querySelector(".join-row")||menu.querySelector(".keys-help");
    if(!anchor)return;

    const details=document.createElement("details");
    details.id="developer-changelog";
    details.className="developer-changelog";
    details.innerHTML=`
      <summary>
        <span class="developer-changelog-summary"><i class="developer-changelog-pulse" aria-hidden="true"></i><span>Developer Changelog / Bug Tracker</span></span>
        <span class="developer-changelog-latest">LATEST UPDATE · 25 AUG 2026 · V10.41</span>
      </summary>
      <div class="developer-changelog-body">
        <p class="developer-changelog-intro"><span><strong>LIVE DEVELOPMENT LOG.</strong> Confirmed player-facing fixes and substantial gameplay changes are recorded here so testers can see what changed and when.</span><time datetime="2026-08-25">Last updated 25 August 2026 · V10.41</time></p>
        ${days.map(day=>`<section class="developer-log-day"><h4><time datetime="${day.iso}">${day.date}</time></h4><div class="developer-log-list">${day.entries.map(entryHtml).join("")}</div></section>`).join("")}
        <section class="developer-log-monitoring" aria-label="Known issues and monitoring"><h4>KNOWN / MONITORING</h4><p><b>Direct launches from YouTube and other in-app browsers:</b> startup hardening was deployed on 23 August 2026. This is currently marked as monitoring; please submit a bug report if a direct launch still freezes or fails to initialise.</p></section>
        <p class="developer-changelog-foot">Statuses describe the live website build: FIXED = confirmed code correction, CHANGED = deliberate behaviour or balance revision, ADDED = new capability, MONITORING = a reported issue with a mitigation deployed but still being watched.</p>
      </div>`;

    if(anchor.classList.contains("secondary-menu"))anchor.insertAdjacentElement("afterend",details);
    else anchor.insertAdjacentElement("beforebegin",details);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();