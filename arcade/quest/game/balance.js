(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};
  Q.TUNE={
    player:{runSpeed:470,crouchSpeed:175,accel:13,airControl:.8,jumpVelocity:955,gravity:2100,shotCooldown:.19,shotSpeed:980,invulnerabilityMs:820,crouchHeight:90},
    stage:{grace:1.8,itemMin:5.4,itemMax:7.5,powerMin:12,powerMax:16},
    beads:{duration:27,gravity:2250,minSpeed:350,maxSpeed:455,spawnMin:.95,spawnMax:1.35},
    fighter:{duration:50,playerSpeed:350,jumpVelocity:790,enemyThinkMin:.12,enemyThinkMax:.28},
    invaders:{rows:5,cols:9,baseSpeed:76,lateSpeedBonus:160,playerCooldown:.31,enemyCooldownMin:.3,enemyCooldownMax:.7},
    maze:{target:110,moveCooldown:.09,enemyEarly:.18,enemyMid:.145,enemyLate:.12},
    feedback:{shakeSmall:5,shakeHit:10,shakeBoss:14,flashHit:.16,flashBoss:.1}
  };

  // Main runner patterns and ambient enemies were arriving on top of one another.
  // Keep each individual hazard meaningful, but add breathing room between encounters.
  const baseRand=Q.rand;
  Q.rand=(a,b)=>{
    const value=baseRand(a,b);
    return a>=2.5&&b<=6.5?value*1.35:value;
  };
})();
