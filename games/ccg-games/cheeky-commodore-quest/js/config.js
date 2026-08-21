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
    maxHealth:8,maxMana:120,moveDelay:112,fireDelay:175,dashDelay:460,maxProjectiles:5,
    sightRadius:6,torchRadius:22.5,torchMs:56000,startingInventorySlots:3,inventorySlots:6,
    emergencyAmmo:15,emergencyRechargeMs:3500,ammoFlashMs:1150,hitStunMs:180
  },
  enemy:{
    thinkDelay:90,lineOfSightRange:14,torchSightRange:20,contactRange:1,
    alertMemory:{scout:2300,hunter:4200,ambusher:3000,guard:2400,charger:3200,ranger:3200,root:3500,cook:3100,firebreather:3200,ghost:2600,guardian:5200,champion:4300,treasure:1200},
    searchTime:4200,idleStepMin:1800,idleStepMax:3300,followerLightRadius:10,namedAttackMultiplier:.58,
    namedHpPerLevel:.13,namedArmorPerLevel:.09,namedDamagePerLevel:.075,namedPotionPerLevel:.45,namedCadencePerLevel:.025,hitStunMs:1000,
    chaseStep:{scout:760,hunter:560,ambusher:620,guard:999999,charger:430,ranger:760,root:820,cook:860,firebreather:680,ghost:720,guardian:560,champion:620,treasure:520}
  },
  stalker:{
    enabled:true,name:"Count Loadula",startFloor:2,moveMs:850,nearDistance:18,attackDistance:1.25,drainDistance:6,drainPerSecond:10,
    hitDamage:3,stunOnShotMs:500,spawnDelayMs:42000,musicKey:"count-loadula-default",
    banishVulnerableMs:12000,banishHpBase:8,flaskArtefacts:3,banishedRespawnMs:30000,banishPromptDistance:8
  },
  camping:{graceMs:60000,warningMs:650,blastIntervalMs:650,resetDistance:6,zoneRadius:3,damage:2,directBlastEvery:3},
  dungeon:{minLeaf:18,maxLeaf:32,roomMargin:3,targetRooms:34,maxLockedBranches:8,chestCount:10,secretRooms:3,secretPassages:2,sanctuaryRooms:2,wallTorchRooms:5,trapCount:20,generatorCount:3,generatorSpawnCap:3,sigilDefendersMin:3,standardEnemyTarget:44,ammoPacks:24,furnitureMin:5,furnitureMax:9,grandHallCount:1,boulderFloor:4,clueFloor:2,memoryPuzzleFloor:3,torchPuzzleFloor:4,weightBridgeFloor:5},
  loot:{rarities:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"]},
  difficulty:{
    CASUAL:{enemyHp:.8,enemyDamage:.75,loot:1.15,ammo:1.25,stalker:.8},
    ARCADE:{enemyHp:1,enemyDamage:1,loot:1,ammo:1,stalker:1},
    SIZZLER:{enemyHp:1.2,enemyDamage:1.15,loot:1.12,ammo:.92,stalker:1.12},
    "GOLD MEDAL":{enemyHp:1.45,enemyDamage:1.35,loot:1.28,ammo:.82,stalker:1.28}
  },
  floors:[
    {name:"Tape Vault",objective:"keys",theme:"C64_ARCHIVE"},
    {name:"1541 Catacombs",objective:"generators",theme:"1541_WORKSHOP"},
    {name:"Budget Bin Depths",objective:"rescue",theme:"BUDGET_BIN"},
    {name:"SID Reactor",objective:"explore_guardian",theme:"SID_REACTOR"},
    {name:"Zzap! Citadel",objective:"guardian",theme:"ZZAP_LIBRARY"}
  ],
  followerElites:[
    {name:"Peter Cortens",initials:"PC",kind:"hunter",hp:9,armor:5,avatar:"assets/peter-cortens.png",musicKey:"peter-cortens"},
    {name:"Swanh8ter",initials:"SH",kind:"charger",hp:7,armor:4,avatar:"assets/swanh8ter.png",musicKey:"swanh8ter"},
    {name:"Syragar",initials:"SY",kind:"ranger",hp:7,armor:4,avatar:"assets/syragar.png",musicKey:"syragar"},
    {name:"Parsnip Celery",initials:"PS",kind:"root",hp:8,armor:5,avatar:"assets/parsnip-celery.png",musicKey:"parsnip-celery"},
    {name:"CPU",initials:"CPU",kind:"cook",hp:10,armor:6,avatar:"assets/cpu.png",musicKey:"cpu"},
    {name:"Yoshi Yoshi",initials:"YY",kind:"firebreather",hp:8,armor:5,avatar:"assets/yoshi-yoshi.png",musicKey:"yoshi-yoshi"},
    {name:"CCG",initials:"CCG",kind:"hunter",hp:20,armor:5,avatar:"",musicKey:"ccg",ccgBoss:true,moveSpeedScale:.5,namedDamageScale:2}
  ],
  c64Loot:["Impossible Mission","Wizball","Paradroid","Boulder Dash","Bruce Lee","Uridium","The Last Ninja","Bubble Bobble","IK+","Turrican","Armalyte","Mayhem in Monsterland","Monty on the Run","Creatures","The Great Giana Sisters","Dropzone","Delta","Hawkeye","R-Type","Ghouls 'n Ghosts","California Games","World Games","Summer Games II","Winter Games","Pitstop II","Spy vs Spy","Nebulus","Cybernoid","Ghosts 'n Goblins","The Sentinel","International Karate","Elite"],
  roomThemes:["C64_ARCHIVE","1541_WORKSHOP","BUDGET_BIN","DEMO_LOUNGE","ARMOURY","CPU_KITCHEN","SID_REACTOR","WARP_GALLERY","ZZAP_LIBRARY","TAPE_STORE","CARTRIDGE_BAY","CRACKED_INTRO","PIXEL_FOUNDRY","MODEM_EXCHANGE","HIGH_SCORE_CRYPT","CRT_MAZE"],
  adminAudio:{stalker:null,dangerRoom:null,sanctuary:null,namedEnemies:{}}
});
