(function(){
  "use strict";
  const Q=window.CCGQuest;
  Q.STAGES=[
    {id:'bedroom',name:'THE BEDROOM',subtitle:'LOAD IT. WAIT. HOPE.',bg:'bedroom',duration:31,accent:'#62e2ff',hazard:'LOAD ERROR',boss:'LOAD ERROR',bossHp:18,bossPattern:1,music:0},
    {id:'budget',name:'THE BUDGET RACK',subtitle:'£1.99 GOOD. £9.99 SUSPICIOUS.',bg:'budget',duration:30,accent:'#ffd657',hazard:'FULL PRICE £9.99',boss:'FULL PRICE',bossHp:24,bossPattern:1,music:1},
    {id:'christmas',name:'CHRISTMAS MORNING',subtitle:'OPEN THE COMPILATION BEFORE GRAN\'S.',bg:'christmas',duration:29,accent:'#ff7188',hazard:'GRAN\'S HOUSE',boss:'WE\'RE LEAVING NOW',bossHp:28,bossPattern:2,music:2},
    {id:'amiga',name:'AMIGA UPGRADE',subtitle:'MORE COLOURS. SAME PANIC.',bg:'amiga',duration:31,accent:'#67e7ff',hazard:'DISK READ ERROR',boss:'DISK READ ERROR',bossHp:32,bossPattern:2,music:3},
    {id:'guru',name:'GURU MEDITATION',subtitle:'THE COMPUTER HAS HAD ENOUGH.',bg:'guru',duration:32,accent:'#ff4f66',hazard:'GURU FAULT',boss:'GURU MEDITATION',bossHp:40,bossPattern:3,music:4}
  ];
  Q.LEVELS=[['bedroom','The Bedroom'],['beads','Electric Bead Run'],['budget','The Budget Rack'],['fighter','36% Conversion Bout'],['christmas','Christmas Morning'],['amiga','Amiga Upgrade'],['guru','Guru Meditation']];
})();
