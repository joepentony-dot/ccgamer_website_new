(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};
  Q.STAGES=[
    {id:'bedroom',name:'THE BEDROOM',subtitle:'LOAD. REWIND. DUCK THE TAPE.',duration:42,accent:'#6eeaff',accent2:'#b36cff',ground:'#1c1730',music:0,boss:'THE LOAD ERROR',bossHp:34,objective:'TAPES',objectiveTarget:6,direction:-1,mechanic:'loading'},
    {id:'budget',name:'THE BUDGET RACK',subtitle:'BARGAINS BELOW. FULL PRICE ABOVE.',duration:42,accent:'#ffd75e',accent2:'#ff8a57',ground:'#2e251b',music:1,boss:'FULL PRICE',bossHp:40,objective:'BARGAINS',objectiveTarget:7,direction:-1,mechanic:'rack'},
    {id:'christmas',name:'CHRISTMAS MORNING',subtitle:'EVERYTHING IS COMING THE WRONG WAY.',duration:41,accent:'#ff7b8f',accent2:'#7dffb4',ground:'#23322f',music:2,boss:'WE\'RE LEAVING NOW',bossHp:44,objective:'PRESENTS',objectiveTarget:6,direction:1,mechanic:'reverse'},
    {id:'amiga',name:'AMIGA UPGRADE',subtitle:'SWAP DISKS. CLOSE WINDOWS. KEEP MOVING.',duration:43,accent:'#70e8ff',accent2:'#8f86ff',ground:'#102741',music:3,boss:'DISK READ ERROR',bossHp:48,objective:'DISKS',objectiveTarget:7,direction:-1,mechanic:'workbench'},
    {id:'guru',name:'GURU MEDITATION',subtitle:'THE FLOOR IS LYING TO YOU.',duration:46,accent:'#ff536d',accent2:'#f0d866',ground:'#230a16',music:4,boss:'GURU MEDITATION',bossHp:56,objective:'STABLE BLOCKS',objectiveTarget:8,direction:-1,mechanic:'glitch'}
  ];
  Q.LEVELS=[
    ['bedroom','The Bedroom'],['beads','Electric Bead Run'],['budget','The Budget Rack'],['fighter','36% Conversion Bout'],['invaders','Alien Formation'],['christmas','Christmas Morning'],['maze','Dot-Maze Run'],['amiga','Amiga Upgrade'],['guru','Guru Meditation']
  ];
  Q.STAGE_INDEX=Object.fromEntries(Q.STAGES.map((s,i)=>[s.id,i]));
})();
