/* CCG visitor statistics — public GoatCounter counters, no API token.
 *
 * Archive visitors: one event per browser per rolling 60-minute window,
 * across all public pages. This is not a count of lifetime unique humans.
 * Game views: all recorded game page loads, including refreshes.
 *
 * Public display needs GoatCounter Settings -> Site settings ->
 * "Allow adding visitor counts on your website" enabled.
 */
(function () {
  "use strict";

  if (window.CCGVisitorMetricsInitialized) return;
  window.CCGVisitorMetricsInitialized = true;

  var COUNTER_BASE = "https://cheekycommodoregamer.goatcounter.com/counter/";
  var SESSION_EVENT = "ccg-archive-session";
  var SESSION_KEY = "ccg-archive-hourly-visit-v1";
  var SESSION_WINDOW_MS = 60 * 60 * 1000;
  var STARTED = false;

  // Non-personal historical hits recovered from GoatCounter export
  // captured 2026-10-22 15:04:32 UTC. Do not import the raw export here.
  var HISTORICAL_HOME_HITS = 2361; // /, /home.html and /index.html
  var HISTORICAL_ARCHIVE_EVENTS = 1; // Already in the export
  var HISTORICAL_GAME_HITS = {"1942":38,"master-of-magic":80,"ninja-rabbits":73,"the-happiest-days-of-your-life":67,"downloads":58,"arachnophobia":50,"ace-of-aces":46,"brutal-sports-football":45,"friday-the-13th":45,"alter-ego":44,"airborne-ranger":43,"elite":42,"southern-belle":42,"curse-of-the-azure-bonds":40,"aliens-the-computer-game":39,"dune":39,"dan-dare-iii-the-escape":38,"bruce-lee":37,"another-world":36,"apollo-18-mission-to-the-moon":35,"barbarian-the-ultimate-warrior":34,"cybernoid":34,"action-biker":33,"dino-eggs":33,"back-to-the-future":32,"elidon":31,"skidmarks":31,"zeewolf":30,"archon-the-light-and-the-dark":29,"countdown-to-meltdown":29,"the-settlers":29,"tour-de-france":28,"accolade-s-comics":27,"agony":27,"alien-breed":27,"batman-the-movie":27,"commando":27,"the-lords-of-midnight":27,"zork-trilogy":27,"cannon-fodder":26,"dan-dare-pilot-of-the-future":26,"gauntlet":26,"ghostbusters":26,"hostages":26,"impossible-mission":26,"lotus-turbo-challenge-2":26,"rambo-first-blood-part-2":26,"west-bank":26,"years":26,"california-games":25,"paradroid":25,"720-degrees":24,"james-pond-underwater-agent":24,"knight-games":24,"tusker":24,"uridium":24,"battle-chess":23,"samantha-fox-strip-poker":23,"sid-meiers-pirates":23,"after-burner":22,"airwolf":22,"bangkok-knights":22,"defender":22,"defender-of-the-crown":22,"heroquest":22,"it-came-from-the-desert":22,"summer-games":22,"the-last-ninja":22,"aladdin":21,"batman-the-caped-crusader":21,"desert-strike":21,"emlyn-hughes-international-soccer":21,"fist-2-the-legend-continues":21,"laser-squad":21,"little-computer-people":21,"nodes-of-yesod":21,"the-new-zealand-story":21,"bloodwych":20,"boulder-dash":20,"creatures":20,"flashback-the-quest-for-identity":20,"heart-of-africa":20,"ik-amiga":20,"microprose-soccer":20,"north-south":20,"q-bert":20,"road-runner":20,"the-smiths-are-dead":20,"cabal":19,"choplifter":19,"dancing-monster":19,"donkey-kong":19,"gary-linekers-superstar-soccer":19,"ik-c64":19,"sanxion":19,"strip-poker-a-sizzling-game-of-chance":19,"the-activision-decathlon":19,"the-hitchhikers-guide-to-the-galaxy":19,"times-of-lore":19,"alcazar-the-forgotten-fortress":18,"alien":18,"auf-wiedersehen-monty":18,"aztec-challenge":18,"bcs-quest-for-tires":18,"hacker":18,"hero-of-the-golden-talisman":18,"neuromancer":18,"raid-over-moscow":18,"silent-service":18,"the-human-race":18,"the-staff-of-karnath":18,"the-train-escape-to-normandy":18,"uuno-turhapuro-muuttaa-maalle":18,"20-tons":17,"action-service":17,"alcatraz":17,"arcade-classics":17,"arkanoid":17,"barry-mcguigan-world-championship-boxing":17,"beyond-the-forbidden-forest":17,"blue-max":17,"bmx-kidz":17,"chuckie-egg":17,"dropzone":17,"he-man-and-the-masters-of-the-universe-the-movie":17,"legacy-of-the-ancients":17,"rampart":17,"shadow-dancer":17,"soccer-boss":17,"super-pipeline":17,"the-secret-of-monkey-island":17,"ultima-1-the-first-age-of-darkness":17,"alleykat":16,"barbarian-2-the-dungeon-of-drax":16,"cadaver":16,"d-generation":16,"danny-sullivans-indy-heat":16,"dizzy":16,"dreamweb":16,"dune-2-the-battle-for-arrakis":16,"give-my-regards-to-broad-street":16,"ikari-warriors":16,"kawasaki-rhythm-rocker":16,"myth-history-in-the-making":16,"nippon-safes-inc":16,"pole-position":16,"project-x":16,"robin-of-the-wood":16,"rtype":16,"ruff-n-tumble":16,"saint-dragon":16,"shadow-fighter":16,"starquake":16,"system-15000":16,"the-castles-of-dr-creep":16,"the-great-giana-sisters":16,"the-guild-of-thieves":16,"the-trap-door":16,"time-tunnel":16,"ween-the-prophecy":16,"wings":16,"blackwyche":15,"delta":15,"derby-day":15,"double-dragon":15,"exile":15,"fernandez-must-die":15,"future-wars":15,"grand-prix-simulator":15,"iridis-alpha":15,"judge-dredd":15,"lode-runner":15,"maniac-mansion":15,"narc":15,"pinball-dreams":15,"psycho-hopper":15,"renegade":15,"robocop":15,"rocket-ranger":15,"samurai-warrior-the-battles-of-usagi-yojimbo":15,"shadow-of-the-beast":15,"shinobi":15,"star-wars-droids":15,"water-polo":15,"andy-capp":14,"arcade-flight-simulator":14,"back-to-reality":14,"bad-dudes-vs-dragonninja":14,"badlands":14,"beach-head":14,"below-the-root":14,"blade-runner":14,"bubble-bobble":14,"bullys-sporting-darts":14,"cauldron":14,"caveman-ugh-lympics":14,"chase-h-q":14,"daley-thompsons-decathlon":14,"entombed":14,"escape-from-the-planet-of-the-robot-monsters":14,"eye-of-the-beholder-2-the-legend-of-darkmoon":14,"first-samurai":14,"frightmare":14,"grand-prix-circuit":14,"highlander":14,"koronis-rift":14,"law-of-the-west":14,"leader-board":14,"max-headroom":14,"monty-on-the-run":14,"nemesis":14,"park-patrol":14,"populous":14,"project-firestart":14,"project-stealth-fighter":14,"push-over":14,"saboteur":14,"sensible-soccer":14,"silkworm":14,"simcity":14,"son-of-blagger":14,"summer-games-2":14,"the-official-father-christmas":14,"the-sword-of-fargoal":14,"thunderbirds":14,"turbo-out-run":14,"turrican":14,"turrican-2-the-final-fight":14,"wasteland":14,"winter-games":14,"wonder-boy":14,"a-question-of-sport":13,"ant-attack":13,"arcade-pool":13,"black-tiger":13,"blood-n-guts":13,"bmx-simulator":13,"cannon-fodder-2":13,"castle-master":13,"creatures-2-torture-trouble":13,"crystal-dragon":13,"doriath":13,"face-off":13,"final-fight":13,"fire-king":13,"floor-13":13,"fruit-machine-simulator":13,"heimdall":13,"how-to-be-a-complete-bastard":13,"hudson-hawk":13,"international-soccer":13,"invade-a-load":13,"jet-set-willy":13,"kings-bounty":13,"last-ninja-2-back-with-a-vengeance":13,"mail-order-monsters":13,"mule":13,"nemesis-the-warlock":13,"nightbreed-the-interactive-movie":13,"pitstop-2":13,"sensible-golf":13,"space-taxi":13,"spy-vs-spy":13,"syndicate":13,"the-great-escape":13,"the-sentinel":13,"the-way-of-the-exploding-fist":13,"the-young-ones":13,"who-dares-wins-2":13,"wizball":13,"x-out":13,"a-nightmare-on-elm-street":12,"attack-of-the-mutant-camels":12,"automania":12,"beneath-a-steel-sky":12,"black-knight":12,"cliff-hanger":12,"combat-school":12,"darkseed":12,"falcon-patrol":12,"fighting-warrior":12,"fort-apocalypse":12,"ghetto-blaster":12,"ghostbusters-2":12,"hero":12,"indiana-jones-and-the-last-crusade-adventure":12,"infernal-runner":12,"marias-christmas-box":12,"nosferatu-the-vampyre":12,"outlaws":12,"pneumatic-hammers":12,"raid-on-bungeling-bay":12,"realm-of-impossibility":12,"sheep-in-space":12,"sid-meier-s-pirates":12,"space-hulk":12,"spy-vs-spy-2-the-island-caper":12,"super-cars-2":12,"super-cycle":12,"superfrog":12,"teenage-mutant-hero-turtles":12,"the-captive":12,"the-eidolon":12,"the-movie-monster-game":12,"the-sacred-armour-of-antiriad":12,"the-untouchables":12,"wizard-of-wor":12,"world-games":12,"xybots":12,"zak-mckracken-and-the-alien-mindbenders":12,"american-3d-pool":11,"android-2":11,"apocalypse":11,"beach-head-2":11,"benefactor":11,"big-trouble-in-little-china":11,"blades-of-steel":11,"bomb-jack":11,"buggy-boy":11,"chiller":11,"firelord":11,"flip-and-flop":11,"forbidden-forest":11,"ghosts-n-goblins":11,"gods":11,"grange-hill":11,"gryzor":11,"hawkeye":11,"he-man-and-the-masters-of-the-universe-the-ilearth-stone":11,"home-alone":11,"hunchback":11,"jack-the-nipper":11,"jack-the-nipper-2-in-coconut-capers":11,"kane-kane-2":11,"mega-lo-mania":11,"mountie-mick-s-death-ride":11,"omega-race":11,"pitfall-2-lost-caverns":11,"quick-draw-mcgraw":11,"rock-star-ate-my-hamster":11,"rocket-ball":11,"rolling-thunder":11,"skate-or-die":11,"skool-daze":11,"spartacus-the-swordslayer":11,"spelunker":11,"spiky-harold":11,"spy-hunter":11,"star-wars":11,"stardust":11,"street-fighter":11,"stunt-car-racer":11,"super-gran-the-adventure":11,"the-faces-of-haarne":11,"the-goonies":11,"the-immortal":11,"the-last-v8":11,"thing-on-a-spring":11,"thundercats":11,"top-gun":11,"total-recall":11,"wings-of-fury":11,"wizard":11,"wwf-wrestlemania":11,"antheads-it-came-from-the-desert-2":10,"arctic-shipwreck":10,"arnie":10,"asterix-and-the-magic-cauldron":10,"bounces":10,"bounder":10,"breakthru":10,"card-sharks":10,"cauldron-2-the-pumpkin-strikes-back":10,"championship-wrestling":10,"china-miner":10,"civilization":10,"cobra":10,"crazy-comets":10,"crossfire":10,"davy-king-of-the-wild-frontier":10,"defenders-of-the-earth":10,"dynablaster":10,"frankie-goes-to-hollywood":10,"freak-factory":10,"galactic-gardener":10,"ghost-hunters":10,"gobliiins":10,"green-beret":10,"heartland":10,"infiltrator":10,"jumpman":10,"kgb":10,"labyrinth":10,"lazy-jones":10,"le-mans":10,"lemmings":10,"mad-doctor":10,"magic-carpet":10,"manic-miner":10,"master-of-the-lamps":10,"mean-streets":10,"milk-race":10,"monkey-island-2-lechucks-revenge":10,"ninja-massacre":10,"painterboy":10,"popeye-c64-popeye-donpriestley":10,"prince-of-persia":10,"psycho-santa":10,"rock-n-wrestle":10,"savage-pond":10,"short-circuit":10,"simon-the-sorcerer":10,"skull-crossbones":10,"spy-vs-spy-3-arctic-antics":10,"stairways":10,"tapper":10,"terminator-2-judgment-day":10,"the-rocky-horror-show":10,"thrusta":10,"tooth-invaders":10,"uchi-mata":10,"up-n-down":10,"zaxxon":10,"accolades-comics":9,"aussie-games":9,"bc2-grogs-revenge":9,"bionic-commando":9,"bionic-granny":9,"bismark":9,"black-hawk":9,"blagger":9,"booty":9,"brian-bloodaxe":9,"by-fair-means-or-foul":9,"congo-bongo":9,"cops-n-robbers":9,"crystal-castles":9,"die-hard":9,"escape-from-colditz":9,"fire-ant":9,"flimbos-quest":9,"floyd-of-the-jungle":9,"frak":9,"fright-night":9,"gemstone-warrior":9,"gorf":9,"high-noon":9,"hollywood-or-bust":9,"hyper-sports":9,"indiana-jones-and-the-fate-of-atlantis":9,"indiana-jones-and-the-temple-of-doom":9,"international-basketball":9,"international-tennis":9,"ivan-ironman-stewarts-super-off-road":9,"jimmy-whites-whirlwind-snooker":9,"jupiter-lander":9,"kingpin":9,"lazarian":9,"midnight-resistance":9,"moonstone-a-hard-days-knight":9,"mr-robot-and-his-robot-factory":9,"nebulus":9,"nexus":9,"orc-attack":9,"paperboy":9,"pitfall":9,"platforms":9,"platoon":9,"premiere":9,"rags-to-riches":9,"rampage":9,"rick-dangerous":9,"robocop-3":9,"saboteur-2-avenging-angel":9,"schizofrenia":9,"seek-destroy":9,"shoot-out":9,"space-harrier":9,"street-hassle":9,"super-gridder":9,"super-trolley":9,"target-renegade":9,"teenage-mutant-hero-turtles-the-coin-op":9,"the-adventures-of-robin-hood":9,"the-lost-patrol":9,"the-neverending-story":9,"the-wombles":9,"toy-bizarre":9,"v-the-computer-game":9,"vendetta":9,"vigilante":9,"yie-ar-kung-fu":9,"zorro":9,"army-moves":8,"blagger-goes-to-hollywood":8,"breakdance":8,"cave-of-the-word-wizard":8,"cavelon":8,"dan-dare-2-mekons-revenge":8,"doctor-who-and-the-mines-of-terror":8,"dragon-skulle":8,"ducktales-the-quest-for-gold":8,"flying-feathers":8,"force-seven":8,"golden-axe":8,"halls-of-the-things":8,"head-over-heels":8,"kamikaze":8,"knight-tyme":8,"kung-fu-master":8,"live-and-let-die":8,"loom":8,"murder-on-the-mississippi":8,"mutant-monty":8,"nightbreed-the-action-game":8,"pit-fighter":8,"power-drift":8,"predator":8,"pyjamarama":8,"rainbow-islands":8,"rebel":8,"red-heat":8,"scarabaeus":8,"seaside-special":8,"shao-lin-s-road":8,"skate-rock":8,"slalom":8,"slicks":8,"speedball-2-brutal-deluxe":8,"strontium-dog-and-the-death-gauntlet":8,"switchblade":8,"tau-ceti":8,"terror-of-the-deep":8,"the-chaos-engine":8,"the-running-man":8,"the-transformers":8,"theme-park":8,"they-stole-a-million":8,"through-the-trap-door":8,"thunder-blade":8,"underwurlde":8,"weird-dreams":8,"yogi-bear":8,"zenji":8,"android-nim":7,"brian-jacks-superstar-challenge":7,"celtic-legends":7,"cosmic-tunnels":7,"deflektor":7,"double-dare":7,"double-dragon-2-the-revenge":7,"dynamite-dan":7,"eddie-kidd-jump-challenge":7,"feud":7,"finders-keepers":7,"flunky":7,"gateway-to-apshai":7,"gribblys-day-out":7,"indiana-jones-in-the-lost-kingdom":7,"insects-in-space":7,"joe-blade-2":7,"kickman":7,"kikstart-2":7,"klax":7,"moon-shuttle":7,"nightshade":7,"ninja":7,"operation-wolf":7,"popeye-c64":7,"radar-rat-race":7,"rescue-on-fractalus":7,"river-raid":7,"road-rash":7,"rodland":7,"spitting-image":7,"split-personalities":7,"super-robin-hood":7,"swiv":7,"tales-of-the-arabian-nights":7,"thanatos":7,"the-evil-dead":7,"the-muncher":7,"the-three-stooges":7,"the-willow-pattern-adventure":7,"to-be-on-top":7,"total-carnage":7,"track-field":7,"zamzara":7,"zone-trooper":7,"b-c-bill":6,"bc-bill":6,"blockbusters":6,"bozos-night-out":6,"chimera":6,"dan-dare-2-mekon-s-revenge":6,"deactivators":6,"donald-duck-s-playground":6,"dragon-s-lair-2-escape-from-singe-s-castle":6,"fiendish-freddys-big-top-o-fun":6,"flash-gordon":6,"go-for-the-gold":6,"guzzler":6,"gyropod":6,"herberts-dummy-run":6,"hover-bovver":6,"hunter":6,"indiana-jones-and-the-last-crusade-the-action-game":6,"jammin":6,"joe-blade":6,"jungle-hunt":6,"karateka":6,"king-s-bounty":6,"kobyashi-naru":6,"las-vegas-casino":6,"lure-of-the-temptress":6,"mad-nurse":6,"match-day-2":6,"miami-vice":6,"mike-read-s-computer-pop-quiz":6,"mikie":6,"miner-2049er":6,"poster-paster":6,"prince-clumsy":6,"raging-beast":6,"rastan":6,"revenge-of-the-mutant-camels":6,"serenade":6,"smash-tv":6,"speed-king":6,"stifflip-and-co":6,"the-rats":6,"the-real-ghostbusters":6,"tilt":6,"tir-na-nog":6,"toki":6,"trolls-and-tribulations":6,"visible-solar-system":6,"5-the-computer-game":5,"b-c-s-quest-for-tires":5,"bozo-s-night-out":5,"chomp":5,"chopper":5,"curse-of-ra":5,"developers":5,"dragons-lair":5,"dragonstone":5,"everyone-s-a-wally":5,"fiendish-freddy-s-big-top-o-fun":5,"henrys-house":5,"hunchback-at-the-olympics":5,"into-the-eagle-s-nest":5,"into-the-eagles-nest":5,"mike-reads-computer-pop-quiz":5,"mountie-micks-death-ride":5,"mr-weems-and-the-she-vampires":5,"night-driver":5,"one-man-and-his-droid":5,"robinsons-requiem":5,"roller-coaster-rumbler":5,"santas-xmas-caper":5,"spellbound":5,"stormbringer":5,"strider":5,"the-prince":5,"the-snowman":5,"traffic":5,"trains":5,"up-up-and-away":5,"walker":5,"bocce":4,"dragon-s-lair":4,"flimbo-s-quest":4,"henry-s-house":4,"hunchback-2-quasimodo-s-revenge":4,"micro-mouse-goes-debugging":4,"monkey-island-2-lechuck-s-revenge":4,"montezuma-s-revenge":4,"montezumas-revenge":4,"quinx":4,"slaine":4,"the-dolphin-s-rune":4,"trashman":4,"cosmic-convoy":3,"donald-ducks-playground":3,"granny-s-garden":3,"grannys-garden":3,"h-e-r-o":3,"hunchback-2-quasimodos-revenge":3,"ivan-ironman-stewart-s-super-off-road":3,"maria":3,"maria-s-christmas-box":3,"olli-and-lissa":3,"robinson-s-requiem":3,"santa-s-xmas-caper":3,"shao-lins-road":3,"bully-s-sporting-darts":2,"daley-thompson-s-decathlon":2,"dragons-lair-2-escape-from-singes-castle":2,"gary-lineker-s-superstar-soccer":2,"gribbly-s-day-out":2,"knightmare":2,"ollie-s-follies":2,"ollies-follies":2,"sas-combat-simulator":2,"agony-amiga-1992-psychgnosis-surreal-fantasy-shooter":1,"b-c-2-grog-s-revenge":1,"bc2-grog-s-revenge":1,"eve-of-the-beholder-2-the-legend-of-darkmoon":1,"everyones-a-wally":1,"fist-ii-the-legend-continues":1,"herbert-s-dummy-run":1,"jimmy-white-s-whirlwind-snooker":1,"m-u-l-e":1,"ninja-rabbit":1,"project-10":1,"smash-t-5":1,"speedking":1,"the-dolphins-rune":1};
  var HISTORICAL_LEGACY_QUERY_HITS = {"ace-of-aces":14,"curse-of-the-azure-bonds":7,"the-adventures-of-robin-hood":6,"silent-service":4,"simcity":4,"labyrinth":3,"beach-head-2":3,"cosmic-convoy":3,"creatures-2-torture-trouble":3,"deactivators":3,"gemstone-warrior":3,"kingpin":3,"moon-shuttle":3,"ninja":3,"paperboy":3,"rtype":3,"blagger-goes-to-hollywood":4,"target-renegade":2,"times-of-lore":2,"airborne-ranger":2,"airwolf":2,"california-games":2,"defender-of-the-crown":2,"elite":2,"feud":2,"force-seven":2,"genres":2,"green-beret":2,"hacker":2,"hunchback":2,"indiana-jones-in-the-lost-kingdom":2,"project-stealth-fighter":2,"river-raid":2,"samurai-warrior-the-battles-of-usagi-yojimbo":2,"silkworm":2,"skool-daze":2,"swiv":2,"system-15000":2,"the-sentinel":3,"the-train-escape-to-normandy":2,"vendetta":2,"visible-solar-system":2,"720-degrees":1,"a-nightmare-on-elm-street":1,"after-burner":2,"android-2":1,"auf-wiedersehen-monty":1,"aztec-challenge":2,"barry-mcguigan-world-championship-boxing":2,"breakthru":1,"cadaver":1,"crystal-castles":1,"deflektor":1,"galactic-gardener":1,"ghetto-blaster":1,"grand-prix-simulator":1,"karateka":1,"knightmare":1,"max-headroom":1,"nightbreed-the-action-game":1,"ninja-massacre":1,"pinball-dreams":1,"pyjamarama":1,"road-runner":2,"saint-dragon":1,"scarabaeus":2,"sensible-golf":1,"skate-rock":1,"soccer-boss":2,"star-wars":1,"superfrog":1,"thanatos":1,"the-last-ninja":1,"the-rats":1,"the-sacred-armour-of-antiriad":2,"the-transformers":2,"thundercats":1,"west-bank":1,"action-biker":1,"action-service":1,"alcazar-the-forgotten-fortress":1,"apocalypse":1,"apollo-18-mission-to-the-moon":1,"arcade-flight-simulator":1,"attack-of-the-mutant-camels":1,"b-c-s-quest-for-tires":1,"below-the-root":1,"beneath-a-steel-sky":1,"benefactor":1,"beyond-the-forbidden-forest":1,"blade-runner":1,"bloodwych":1,"bruce-lee":1,"bubble-bobble":1,"cabal":1,"cannon-fodder":1,"chase-h-q":1,"chimera":1,"collections":1,"countdown-to-meltdown":1,"dan-dare-pilot-of-the-future":1,"dynablaster":1,"escape-from-the-planet-of-the-robot-monsters":1,"falcon-patrol":1,"fernandez-must-die":1,"floor-13":1,"floyd-of-the-jungle":1,"frankie-goes-to-hollywood":1,"friday-the-13th":1,"fright-night":1,"gary-lineker-s-superstar-soccer":1,"gateway-to-apshai":1,"gauntlet":1,"ghost-hunters":1,"ghostbusters":1,"gods":1,"halls-of-the-things":1,"he-man-and-the-masters-of-the-universe-the-movie":1,"highlander":1,"ik-amiga":1,"infiltrator":1,"invade-a-load":1,"joe-blade-2":1,"kgb":1,"little-computer-people":1,"lotus-turbo-challenge-2":1,"mad-doctor":1,"mega-lo-mania":1,"microprose-soccer":1,"milk-race":1,"neuromancer":1,"nightshade":1,"orc-attack":1,"q-bert":1,"realm-of-impossibility":1,"rodland":1,"shadow-fighter":1,"shinobi":1,"skate-or-die":1,"super-gran-the-adventure":1,"tapper":1,"teenage-mutant-hero-turtles":1,"the-eidolon":1,"the-great-escape":1,"the-last-v8":1,"the-movie-monster-game":1,"ultima-1-the-first-age-of-darkness":1,"who-dares-wins-2":1,"x-out":1,"yie-ar-kung-fu":1,"yogi-bear":1};

  function claimHourlyVisit() {
    // No individual ID is stored: only a timestamp local to this browser.
    // Fail closed when local storage is blocked; otherwise frequent page loads
    // would inflate the visitor number instead of respecting the one-hour rule.
    try {
      var now = Date.now();
      var last = Number(window.localStorage.getItem(SESSION_KEY));
      if (Number.isFinite(last) && last > 0 && now >= last &&
          (now - last) < SESSION_WINDOW_MS) return false;
      window.localStorage.setItem(SESSION_KEY, String(now));
      return true;
    } catch (_) {
      return false;
    }
  }

  function isPublicPage() {
    var path = window.location.pathname || "/";
    return !/^\/(?:admin|auth)(?:\/|$)/i.test(path) &&
      !document.querySelector('meta[http-equiv="refresh" i]') &&
      document.documentElement.getAttribute("data-ccg-page") !== "admin";
  }

  function getGamePath() {
    if (document.documentElement.getAttribute("data-ccg-page") !== "single-game") {
      return null;
    }
    var canonical = document.querySelector('link[rel="canonical"][href]');
    if (!canonical) return null;
    try {
      var url = new URL(canonical.href, location.origin);
      if (url.origin !== location.origin ||
        !/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)) return null;
      return url.pathname;
    } catch (_) {
      return null;
    }
  }

  function displayNumber(node, number, source) {
    if (!node || !Number.isSafeInteger(number) || number < 0) return;
    node.textContent = number.toLocaleString("en-GB");
    node.setAttribute("data-ccg-counter-loaded", "true");
    node.setAttribute("data-ccg-counter-source", source);
    node.title = source === "live"
      ? "Recovered history plus live GoatCounter totals. GoatCounter may cache totals for up to four hours."
      : "Recovered GoatCounter history. More recent visits may not yet be available.";
  }

  function publicCount(path) {
    return window.fetch(COUNTER_BASE + encodeURIComponent(path) + ".json",
      { credentials: "omit", mode: "cors" }).then(function (response) {
      if (response.status === 404) return 0;
      if (!response.ok) throw new Error("GoatCounter public counter unavailable");
      return response.json().then(function (result) {
        if (!result || typeof result.count !== "string" ||
            !/^\d[\d,.\s\u2019\u0027]*$/.test(result.count)) {
          throw new Error("Unrecognised GoatCounter public count");
        }
        var number = Number(result.count.replace(/[,\s.'\u2019]/g, ""));
        if (!Number.isSafeInteger(number) || number < 0) {
          throw new Error("Invalid GoatCounter number");
        }
        return number;
      });
    });
  }

  function fetchPublicCount(path, node) {
    if (!node) return;
    if (path === SESSION_EVENT) {
      // Earlier visits were page hits across three home URLs. Subsequent
      // visits are at most once per browser per rolling hour across the site.
      // Remove the one event already recorded at export to avoid duplication.
      displayNumber(node, HISTORICAL_HOME_HITS, "historical");
      if (!window.fetch) return;
      publicCount(SESSION_EVENT).then(function (count) {
        displayNumber(node, HISTORICAL_HOME_HITS +
          Math.max(0, count - HISTORICAL_ARCHIVE_EVENTS), "live");
      }).catch(function () { /* Keep the recoverable historical number. */ });
      return;
    }

    // GoatCounter STRIPS trailing slashes from stored paths and from the
    // public-counter lookup. /games/slug and /games/slug/ are the SAME key.
    // Never add the two values: that would double recorded game views.
    // Old ?id= and ?slug= routes were separate paths and can be added once.
    if (!/^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(path)) return;
    var slug = path.slice("/games/".length, -1);
    var oldSnapshot = HISTORICAL_GAME_HITS[slug] || 0;
    var querySnapshot = HISTORICAL_LEGACY_QUERY_HITS[slug] || 0;
    displayNumber(node, oldSnapshot + querySnapshot, "historical");
    if (!window.fetch) return;

    publicCount(path.slice(0, -1)).then(function (now) {
      displayNumber(node, Math.max(oldSnapshot, now) + querySnapshot, "live");
    }).catch(function () { /* Keep the recoverable historical number. */ });
  }

  // Source-branch deployments may skip staging scripts. Restore the normal
  // GoatCounter pageview tracker, but never add a second existing tracker.
  function ensureGoatCounterTracker() {
    if (typeof document.createElement !== "function" || !document.head) return;
    var game = getGamePath();
    var existing = document.querySelector("script[data-goatcounter]");
    if (existing) {
      // Source HTML sometimes ships the tracker without the staging
      // pipeline's raw-view override. Apply it if the async script has
      // not yet initialised; staged HTML already has this setting.
      if (game && !window.goatcounter && typeof existing.getAttribute === "function") {
        var raw = existing.getAttribute("data-goatcounter-settings");
        var settingsFromTag;
        try { settingsFromTag = raw ? JSON.parse(raw) : {}; }
        catch (_) { settingsFromTag = null; }
        if (settingsFromTag && (!settingsFromTag.path || settingsFromTag.path === game)) {
          settingsFromTag.path = game;
          settingsFromTag.no_session = true;
          existing.setAttribute("data-goatcounter-settings", JSON.stringify(settingsFromTag));
        }
      }
      return;
    }
    if (window.goatcounter || document.querySelector('script[src*="gc.zgo.at/count.js"]')) return;
    var settings = { path: game || window.location.pathname || "/" };
    if (game) settings.no_session = true; // Count every game-page load.
    var script = document.createElement("script");
    script.src = "https://gc.zgo.at/count.js";
    script.async = true;
    script.setAttribute("data-goatcounter",
      "https://cheekycommodoregamer.goatcounter.com/count");
    script.setAttribute("data-goatcounter-settings", JSON.stringify(settings));
    script.setAttribute("data-ccg-tracker-recovery", "true");
    document.head.appendChild(script);
  }

  function addGameCounter() {
    var path = getGamePath();
    if (!path || document.getElementById("gameNotFound")?.hidden === false) return;

    var footer = document.querySelector(".ccg-footer--game");
    if (!footer || document.getElementById("ccg-game-view-count")) return;

    var badge = document.createElement("div");
    badge.className = "ccg-game-views";
    badge.setAttribute("aria-label", "Total recorded views of this game page");
    badge.title = "Recovered historical recorded visits and newer game page loads. GoatCounter may delay updates; browser blocking can prevent tracking.";

    var label = document.createElement("span");
    label.className = "ccg-game-views__label";
    label.textContent = "Game views";

    var count = document.createElement("span");
    count.className = "ccg-game-views__count";
    count.id = "ccg-game-view-count";
    count.textContent = "—";

    badge.appendChild(label);
    badge.appendChild(count);

    footer.appendChild(badge);

    fetchPublicCount(path, count);
  }

  function countArchiveSessionOnce() {
    // All public pages contribute to the same archive event. Our browser-local
    // timestamp enforces a rolling one-hour window. no_session tells GoatCounter
    // to count each permitted event even while its built-in 8-hour sessions are on.
    if (!isPublicPage() || STARTED) return;

    var tries = 0;
    var handle = window.setInterval(function () {
      tries++;
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        window.clearInterval(handle);
        STARTED = true;
        try {
          if (!claimHourlyVisit()) return;
          window.goatcounter.count({
            path: SESSION_EVENT,
            title: "CCG Archive Hourly Visits",
            event: true,
            no_session: true
          });
        } catch (_) {
          // Tracking blockers and network failures must not affect the archive.
        }
      } else if (tries >= 32) {
        window.clearInterval(handle);
      }
    }, 250);
  }

  function initialize() {
    if (!isPublicPage()) return;

    var homeCount = document.getElementById("ccg-visit-count");
    if (homeCount) {
      var homeLabel = document.querySelector(".ccg-footer-home__status");
      if (homeLabel) {
        homeLabel.textContent = "Archive visits";
        homeLabel.title = "Recovered historical homepage page hits through 22 October 2026, plus later archive visits counted at most once per browser per rolling hour. Not unique lifetime people.";
      }
      // This event began with the new counter. Historical pageviews cannot be
      // retrospectively translated into unique visitors.
      fetchPublicCount(SESSION_EVENT, homeCount);
    }

    addGameCounter();
    ensureGoatCounterTracker();
    countArchiveSessionOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
