(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};
  Q.TUNE={
    player:{runSpeed:470,crouchSpeed:150,accel:13,airControl:.78,jumpVelocity:800,gravity:2100,shotCooldown:.19,shotSpeed:980,invulnerabilityMs:760,deepCrouchHeight:62},
    stage:{grace:1.35,itemMin:4.7,itemMax:6.8,powerMin:10,powerMax:14},
    beads:{duration:30,gravity:2325,minSpeed:365,maxSpeed:500,spawnMin:.72,spawnMax:1.18},
    fighter:{duration:50,playerSpeed:350,jumpVelocity:760,enemyThinkMin:.12,enemyThinkMax:.28},
    invaders:{rows:5,cols:9,baseSpeed:76,lateSpeedBonus:160,playerCooldown:.31,enemyCooldownMin:.3,enemyCooldownMax:.7},
    maze:{target:110,moveCooldown:.09,enemyEarly:.18,enemyMid:.145,enemyLate:.12},
    feedback:{shakeSmall:5,shakeHit:10,shakeBoss:14,flashHit:.16,flashBoss:.1}
  };
})();
