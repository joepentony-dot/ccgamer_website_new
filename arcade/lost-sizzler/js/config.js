window.CCG_CONFIG=Object.freeze({
  tile:42,
  worldWidth:128,
  worldHeight:84,
  keyTarget:3,
  maxPlayers:4,
  maxFloors:5,
  levelCaps:[5,10,15,20,25],
  logoAsset:"assets/ccgamer-logo-fallback.svg",
  logoFallback:"assets/ccgamer-logo-fallback.svg",
  player:{
    maxHealth:8,maxMana:240,moveDelay:138,fireDelay:175,dashDelay:510,maxProjectiles:5,
    sightRadius:6,torchRadius:22.5,torchMs:56000,startingInventorySlots:3,inventorySlots:6,
    emergencyAmmo:15,emergencyRechargeMs:3500,ammoFlashMs:1150,hitStunMs:180
  },
  enemy:{
    thinkDelay:90,lineOfSightRange:14,torchSightRange:20,contactRange:1,
    alertMemory:{spider:1800,skeleton:2300,knight:4800,scout:2300,hunter:4200,ambusher:3000,guard:2400,charger:3200,ranger:3200,root:3500,cook:3100,firebreather:3200,ghost:2600,guardian:5200,champion:4300,treasure:1200},
    searchTime:5000,idleStepMin:2220,idleStepMax:4070,followerLightRadius:10,namedAttackMultiplier:.70,
    namedHpPerLevel:.13,namedArmorPerLevel:.09,namedDamagePerLevel:.075,namedPotionPerLevel:.45,namedCadencePerLevel:.025,hitStunMs:1000,
    chaseStep:{spider:720,skeleton:820,knight:980,scout:940,hunter:780,ambusher:765,guard:999999,charger:530,ranger:940,root:1010,cook:1060,firebreather:840,ghost:890,guardian:690,champion:765,treasure:640}
  },
  stalker:{
    enabled:true,name:"Count Loadula",startFloor:2,moveMs:850,nearDistance:18,attackDistance:1.25,drainDistance:6,drainPerSecond:10,
    hitDamage:3,stunOnShotMs:500,spawnDelayMs:90000,musicKey:"count-loadula-default",
    banishVulnerableMs:12000,banishHpBase:8,flaskArtefacts:3,essenceRequired:3,banishedRespawnMs:30000,banishPromptDistance:8
  },
  camping:{graceMs:60000,warningMs:650,blastIntervalMs:650,resetDistance:6,zoneRadius:3,blastRadius:.35,damage:1,directBlastEvery:2},
  dungeon:{minLeaf:18,maxLeaf:32,roomMargin:3,targetRooms:34,maxLockedBranches:8,chestCount:10,secretRooms:3,secretPassages:2,sanctuaryRooms:2,wallTorchRooms:5,trapCount:20,generatorCount:3,generatorSpawnCap:3,sigilDefendersMin:3,standardEnemyTarget:44,ammoPacks:12,furnitureMin:5,furnitureMax:9,grandHallCount:1,boulderFloor:4,clueFloor:2,memoryPuzzleFloor:3,torchPuzzleFloor:4,weightBridgeFloor:5},
  proceduralDungeon:{
    enabled:true,
    version:"V10.42",
    name:"The Lost Sizzler — Five Depths",
    targetRunMinutesMin:55,
    targetRunMinutesMax:75,
    gamePickupCount:26,
    pickupDistribution:[6,5,5,5,5],
    essenceRequired:3,
    escapeAlert:82,
    campaignFloors:[
      {floor:1,id:"threshold",name:"THE THRESHOLD",objective:"explore_guardian",targetMinutes:9,hpScale:.82,tempo:.88,ammoTarget:12,stalkerDelayMs:999999,deathStalkerSpeed:1.25,domain:null},
      {floor:2,id:"iron",name:"IRON KEEP",objective:"keys",targetMinutes:11,hpScale:.94,tempo:.96,ammoTarget:11,stalkerDelayMs:90000,deathStalkerSpeed:1.12,domain:"iron"},
      {floor:3,id:"bone",name:"MOSS CRYPT",objective:"keys",targetMinutes:12,hpScale:1.00,tempo:1.02,ammoTarget:10,stalkerDelayMs:75000,deathStalkerSpeed:1.00,domain:"bone"},
      {floor:4,id:"ash",name:"EMBER DEPTHS",objective:"keys",targetMinutes:13,hpScale:1.08,tempo:1.09,ammoTarget:9,stalkerDelayMs:60000,deathStalkerSpeed:.90,domain:"ash"},
      {floor:5,id:"sigil",name:"SIGIL SANCTUM",objective:"guardian",targetMinutes:15,hpScale:1.18,tempo:1.16,ammoTarget:8,stalkerDelayMs:45000,deathStalkerSpeed:.82,domain:null}
    ],
    keyDomains:[
      {id:"iron",floor:2,name:"KEY OF IRON",guardian:"Iron Warden",theme:"IRON_KEEP",weakness:"shock",sigilPower:"REVEAL"},
      {id:"bone",floor:3,name:"KEY OF BONE",guardian:"Bone Keeper",theme:"MOSS_CRYPT",weakness:"fire",sigilPower:"WARD"},
      {id:"ash",floor:4,name:"KEY OF ASH",guardian:"Ash Castellan",theme:"EMBER_DUNGEON",weakness:"energy",sigilPower:"BIND"}
    ],
    sigilPowers:[
      {id:"reveal",name:"REVEAL",desc:"The Sigil extends normal sight and exposes more of the dungeon around you."},
      {id:"ward",name:"WARD",desc:"The Sigil periodically absorbs one point of incoming damage."},
      {id:"bind",name:"BIND",desc:"The Sigil suppresses supernatural pursuers and slows their immediate pressure."},
      {id:"banish",name:"BANISH",desc:"Completing the Sigil grants one final Banishment charge for the escape."}
    ],
    relicChoices:3,
    developmentCopy:"Descend through five generated depths. Build your character, recover the Keys of Iron, Bone and Ash, complete the Sigil and survive the final escape."
  },
  loot:{rarities:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"]},
  difficulty:{
    CASUAL:{enemyHp:.8,enemyDamage:.75,loot:1.15,ammo:1.25,stalker:.8},
    ARCADE:{enemyHp:1,enemyDamage:1,loot:1,ammo:1,stalker:1},
    SIZZLER:{enemyHp:1.2,enemyDamage:1.15,loot:1.12,ammo:.92,stalker:1.12},
    "GOLD MEDAL":{enemyHp:1.45,enemyDamage:1.35,loot:1.28,ammo:.82,stalker:1.28}
  },
  floors:[
    {name:"The Threshold",objective:"explore_guardian",theme:"C64_ARCHIVE"},
    {name:"Iron Keep",objective:"keys",theme:"IRON_KEEP"},
    {name:"Moss Crypt",objective:"keys",theme:"MOSS_CRYPT"},
    {name:"Ember Depths",objective:"keys",theme:"EMBER_DUNGEON"},
    {name:"Sigil Sanctum",objective:"guardian",theme:"ZZAP_LIBRARY"}
  ],
  followerElites:[
    {name:"Peter Cortens",initials:"PC",kind:"hunter",hp:8,armor:4,avatar:"assets/peter-cortens.png",musicKey:"peter-cortens",strength:"Relentless close-range pressure and flanking.",weakness:"Short reach — kite him through cover and fire from range."},
    {name:"Swanh8ter",initials:"SH",kind:"charger",hp:6,armor:3,avatar:"assets/swanh8ter.png",musicKey:"swanh8ter",strength:"A telegraphed charge can close ground very quickly.",weakness:"The wind-up reveals the line — sidestep or put an obstacle between you."},
    {name:"Syragar",initials:"SY",kind:"ranger",hp:6,armor:3,avatar:"assets/syragar.png",musicKey:"syragar",strength:"Accurate long-range fire with clever use of cover.",weakness:"Break line of sight, use corners, then close the distance."},
    {name:"AZALEA",initials:"AZ",kind:"root",hp:7,armor:4,avatar:"assets/parsnip-celery.png",musicKey:"parsnip-celery",strength:"Root projectiles pin down open lanes while AZALEA keeps pressure from range.",weakness:"Walls stop the shots; break line of sight and close from cover."},
    {name:"CPU",initials:"CPU",kind:"cook",hp:9,armor:5,avatar:"assets/cpu.png",musicKey:"cpu",strength:"Heals nearby enemies while throwing damaging food.",weakness:"Isolate and focus CPU first so the healing cannot sustain the room."},
    {name:"Yoshi Yoshi",initials:"YY",kind:"firebreather",hp:7,armor:4,avatar:"assets/yoshi-yoshi.png",musicKey:"yoshi-yoshi",strength:"Powerful fire breath dominates a long, straight lane.",weakness:"Move sideways or use walls — the flame cannot pass solid cover."},
    {name:"CCG",initials:"CCG",kind:"hunter",hp:18,armor:4,avatar:"",musicKey:"ccg",ccgBoss:true,moveSpeedScale:1.35,namedDamageScale:2,strength:"Heavy armour, high health and double named-enemy damage.",weakness:"Deliberately slow — maintain range and keep moving around cover."}
  ],
  c64LootByLetter:{
    A:["Airborne Ranger","Archon","Armalyte","Auf Wiedersehen Monty"],
    B:["Bard's Tale","Boulder Dash","Bruce Lee","Bubble Bobble"],
    C:["California Games","Commando","Creatures","Cybernoid"],
    D:["Defender of the Crown","Delta","Dizzy","Dropzone"],
    E:["Elite","Emlyn Hughes International Soccer","Exile"],
    F:["Fantasy World Dizzy","Firelord","Flimbo's Quest","Fort Apocalypse"],
    G:["Gauntlet","Ghosts 'n Goblins","Ghouls 'n Ghosts","Great Giana Sisters"],
    H:["Hawkeye","Head Over Heels","Hunter's Moon","Hyper Sports"],
    I:["IK+","Impossible Mission","International Karate","IO"],
    J:["Jet Set Willy","Jumpman","Jupiter Lander"],
    K:["Katakis","Kikstart II","Krakout"],
    L:["Leaderboard","Last Ninja","Last Ninja 2","Lode Runner"],
    M:["Maniac Mansion","Mayhem in Monsterland","Monty on the Run","Myth"],
    N:["Nebulus","Netherworld","New Zealand Story","North & South"],
    O:["Ocean Ranger","Oids","Operation Wolf","Out Run"],
    P:["Paradroid","Pirates!","Pitstop II","Project Firestart"],
    Q:["Q-Bert","Qix","Quake Minus One","Quedex"],
    R:["R-Type","Raid Over Moscow","Rainbow Islands","Rick Dangerous"],
    S:["Sam's Journey","Sentinel","Spy vs Spy","Summer Games II"],
    T:["Turrican","Turrican II","Tusker","Turbo Outrun"],
    U:["Ultima IV","Underwurlde","Uridium","Usagi Yojimbo"],
    V:["Vendetta","Vigilante","Volfied"],
    W:["Winter Games","Wizball","World Games","Wonder Boy"],
    X:["X-Out","Xenon","Xenon Ranger"],
    Y:["Yie Ar Kung-Fu","Yie Ar Kung-Fu II","Yogi's Great Escape"],
    Z:["Zak McKracken and the Alien Mindbenders","Zamzara","Zaxxon","Zynaps"]
  },
  c64Loot:[
    "Airborne Ranger","Archon","Armalyte","Auf Wiedersehen Monty","Bard's Tale","Boulder Dash","Bruce Lee","Bubble Bobble",
    "California Games","Commando","Creatures","Cybernoid","Defender of the Crown","Delta","Dizzy","Dropzone","Elite","Emlyn Hughes International Soccer","Exile",
    "Fantasy World Dizzy","Firelord","Flimbo's Quest","Fort Apocalypse","Gauntlet","Ghosts 'n Goblins","Ghouls 'n Ghosts","Great Giana Sisters","Hawkeye","Head Over Heels","Hunter's Moon","Hyper Sports",
    "IK+","Impossible Mission","International Karate","IO","Jet Set Willy","Jumpman","Jupiter Lander","Katakis","Kikstart II","Krakout","Leaderboard","Last Ninja","Last Ninja 2","Lode Runner",
    "Maniac Mansion","Mayhem in Monsterland","Monty on the Run","Myth","Nebulus","Netherworld","New Zealand Story","North & South","Ocean Ranger","Oids","Operation Wolf","Out Run",
    "Paradroid","Pirates!","Pitstop II","Project Firestart","Q-Bert","Qix","Quake Minus One","Quedex","R-Type","Raid Over Moscow","Rainbow Islands","Rick Dangerous",
    "Sam's Journey","Sentinel","Spy vs Spy","Summer Games II","Turrican","Turrican II","Tusker","Turbo Outrun","Ultima IV","Underwurlde","Uridium","Usagi Yojimbo",
    "Vendetta","Vigilante","Volfied","Winter Games","Wizball","World Games","Wonder Boy","X-Out","Xenon","Xenon Ranger","Yie Ar Kung-Fu","Yie Ar Kung-Fu II","Yogi's Great Escape",
    "Zak McKracken and the Alien Mindbenders","Zamzara","Zaxxon","Zynaps"
  ],
  roomThemes:["C64_ARCHIVE","1541_WORKSHOP","BUDGET_BIN","DEMO_LOUNGE","ARMOURY","CPU_KITCHEN","SID_REACTOR","WARP_GALLERY","ZZAP_LIBRARY","TAPE_STORE","CARTRIDGE_BAY","CRACKED_INTRO","PIXEL_FOUNDRY","MODEM_EXCHANGE","HIGH_SCORE_CRYPT","CRT_MAZE","IRON_KEEP","MOSS_CRYPT","EMBER_DUNGEON"],
  adminAudio:{stalker:null,dangerRoom:null,sanctuary:null,namedEnemies:{}}
});