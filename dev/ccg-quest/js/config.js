window.CCG_CONFIG=Object.freeze({
  tile:30,
  worldWidth:80,
  worldHeight:52,
  keyTarget:3,
  maxPlayers:4,
  logoAsset:"/resources/images/ccgamer-logo.png",
  logoFallback:"assets/ccgamer-logo-fallback.svg",
  player:{
    maxHealth:8,maxMana:14,moveDelay:110,fireDelay:230,dashDelay:350,maxProjectiles:2,
    sightRadius:5,torchRadius:9,torchMs:16000
  },
  enemy:{
    thinkDelay:150,lineOfSightRange:10,torchSightRange:15,contactRange:1,
    alertMemory:{scout:2600,hunter:5200,ambusher:3400,guard:2300,charger:3300,ranger:3500,root:3800,cook:3200,firebreather:3400,ghost:2800},
    searchTime:3000,idleStepMin:1900,idleStepMax:3200,
    chaseStep:{scout:950,hunter:720,ambusher:790,guard:999999,charger:590,ranger:1000,root:1080,cook:1160,firebreather:860,ghost:820}
  },
  camping:{graceMs:10000,warningMs:1200,blastIntervalMs:900,resetDistance:5,blastRadius:1,zoneRadius:4},
  followerElites:[
    {name:"Peter Cortens",initials:"PC",kind:"hunter",hp:8,avatar:"embedded:Peter Cortens"},
    {name:"Swanh8ter",initials:"SH",kind:"charger",hp:6,avatar:"embedded:Swanh8ter"},
    {name:"Syragar",initials:"SY",kind:"ranger",hp:6,avatar:"embedded:Syragar"},
    {name:"Parsnip Celery",initials:"PS",kind:"root",hp:7,avatar:"embedded:Parsnip Celery"},
    {name:"CPU",initials:"CPU",kind:"cook",hp:9,avatar:"embedded:CPU"},
    {name:"Yoshi Yoshi",initials:"YY",kind:"firebreather",hp:7,avatar:"embedded:Yoshi Yoshi"}
  ],
  c64Loot:["Impossible Mission","Wizball","Paradroid","Boulder Dash","Bruce Lee","Uridium","The Last Ninja","Bubble Bobble"],
  roomThemes:["C64_ARCHIVE","1541_WORKSHOP","BUDGET_BIN","DEMO_LOUNGE","ARMOURY","CPU_KITCHEN","SID_REACTOR","WARP_GALLERY","ZZAP_LIBRARY"]
});
