(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};
  Q.TUNE={
    player:{
      runSpeed:425,crouchSpeed:165,accel:13,airControl:.76,jumpVelocity:900,gravity:2000,
      shotCooldown:.22,shotSpeed:930,invulnerabilityMs:1050,coyoteTime:.13,jumpBuffer:.14,
      maxHp:100,contactDamage:16
    },
    stage:{
      grace:2.2,patternMin:3.8,patternMax:5.2,itemMin:5.8,itemMax:8.2,powerMin:13,powerMax:18,
      minimumDecisionGap:.78,minimumSpawnSeparation:1.15
    },
    beads:{duration:22,gravity:2050,minSpeed:315,maxSpeed:405,spawnMin:1.15,spawnMax:1.62,warning:.32,damage:15},
    fighter:{
      duration:48,playerSpeed:325,jumpVelocity:780,gravity:1500,
      enemyThinkMin:.58,enemyThinkMax:.9,enemyCooldownMin:.92,enemyCooldownMax:1.36,
      punchTelegraph:.52,kickTelegraph:.68,punchActive:.16,kickActive:.18,punchRecover:.42,kickRecover:.56,
      playerPunchWindup:.08,playerKickWindup:.12,playerPunchActive:.13,playerKickActive:.17,
      playerPunchRecover:.18,playerKickRecover:.27
    },
    boss:{attackMin:1.9,attackMax:2.65,phase3Min:1.55,telegraph:.75},
    invaders:{rows:4,cols:8,baseSpeed:64,lateSpeedBonus:110,playerCooldown:.28,enemyCooldownMin:.52,enemyCooldownMax:.95},
    maze:{target:78,moveCooldown:.095,enemyEarly:.23,enemyMid:.19,enemyLate:.165,powerDuration:7.5},
    feedback:{shakeSmall:4,shakeHit:8,shakeBoss:12,flashHit:.11,flashBoss:.08}
  };
})();
