/* Dungeon Carnage 64 v1.3 -- compiled C/6502 implementation. No BASIC gameplay. */
#pragma charmap (0x41, 0x41)
#pragma charmap (0x42, 0x42)
#pragma charmap (0x43, 0x43)
#pragma charmap (0x44, 0x44)
#pragma charmap (0x45, 0x45)
#pragma charmap (0x46, 0x46)
#pragma charmap (0x47, 0x47)
#pragma charmap (0x48, 0x48)
#pragma charmap (0x49, 0x49)
#pragma charmap (0x4a, 0x4a)
#pragma charmap (0x4b, 0x4b)
#pragma charmap (0x4c, 0x4c)
#pragma charmap (0x4d, 0x4d)
#pragma charmap (0x4e, 0x4e)
#pragma charmap (0x4f, 0x4f)
#pragma charmap (0x50, 0x50)
#pragma charmap (0x51, 0x51)
#pragma charmap (0x52, 0x52)
#pragma charmap (0x53, 0x53)
#pragma charmap (0x54, 0x54)
#pragma charmap (0x55, 0x55)
#pragma charmap (0x56, 0x56)
#pragma charmap (0x57, 0x57)
#pragma charmap (0x58, 0x58)
#pragma charmap (0x59, 0x59)
#pragma charmap (0x5a, 0x5a)
#include <stdint.h>
#include <string.h>
#define R(a) (*(volatile unsigned char*)(a))
#define VIC ((volatile unsigned char*)0xd000)
#define SID ((volatile unsigned char*)0xd400)
#define SCR ((unsigned char*)0xc000)
#define COL ((unsigned char*)0xd800)
#define PTR ((unsigned char*)0xc3f8)
extern const unsigned char charset[],sprites[],titlebitmap[],titlescreen[];
typedef unsigned char u8;
typedef unsigned int u16;
typedef struct { u16 x; u8 y,hp,maxhp,type,phase,hurt; } Enemy;
Enemy en[5];
u8 map[200],floor_no,hp,loot,weapon,frame,invuln,cool,dir,alive,remaining,boss,mode,chain,chaintime,bossphase,boltspd;
u8 msgtime,shot,bolt,by,sy,sd,bd,msb,enabled,joy,oldjoy,hitflash,fx,fxage,target,targettime,hazardcool;
u16 px,sx,bx,score,hiscore,seed=0x64cc;
u8 py; u16 ticks;
const u8 themes[]={12,3,5,14,8,2};
/* Deliberately different floor rosters. No floor can become an all-bat mob. */
const u8 rosters[]={1,1,2,3, 1,3,1,2, 2,3,4,1, 3,4,3,1, 1,2,4,3, 1,3,4,4};
const char *names[]={"THE TAPE LOADING CELLAR","THE SID CRYPT","THE RUBBER KEY CATACOMBS","THE PIRATE'S BOOZE CUPBOARD","THE LOST SIZZLER","THE LORD OF BUFFERING"};
const char *foenames[]={"","SKEL","BAT ","SLIM","MAGE","BOSS"};
const u16 notes[]={4389,5219,5860,6577,7822,8779,10439,11718};
const u8 tune[]={0,2,4,2,0,2,5,4,0,2,4,6,5,4,2,1,0,2,4,2,0,2,5,7,6,5,4,2,1,2,4,2};
u8 rnd(void){seed^=seed<<7;seed^=seed>>9;seed^=seed<<8;return (u8)seed;}
void text(u8 x,u8 y,const char*s,u8 c){u16 p=(u16)y*40+x;while(*s && p<1000){SCR[p]=*s++;COL[p++]=c;}}
void number(u8 x,u8 y,u16 n,u8 digits,u8 c){u16 p=(u16)y*40+x+digits;while(digits--){--p;SCR[p]=48+n%10;COL[p]=c;n/=10;}}
void clear(void){memset(SCR,32,1000);memset(COL,1,1000);VIC[0x15]=0;}
void sound(u8 n){fx=n;fxage=16;SID[18]=0;SID[19]=0x08;SID[20]=0x83;SID[18]=n==2?0x81:0x21;}
void audio(void){u16 f;
 if(fxage){--fxage;f=fx==2?(u16)fxage*1100:(u16)(17-fxage)*420;SID[14]=f;SID[15]=f>>8;if(!fxage)SID[18]=0;}
 if(mode!=1 && !(ticks&7)){
  f=notes[tune[(ticks>>3)&31]];SID[4]=0;SID[0]=f;SID[1]=f>>8;SID[5]=0x09;SID[6]=0x98;SID[4]=0x21;
  f=notes[((ticks>>5)&3)]/2;SID[11]=0;SID[7]=f;SID[8]=f>>8;SID[9]=0;SID[10]=8;SID[12]=0x08;SID[13]=0xa8;SID[11]=0x41;
 }
}
extern void raster_wait(void);
extern void nmi_handler(void);
void waitframe(void){raster_wait();++ticks;++frame;audio();}
void pauseframes(u8 n){while(n--)waitframe();}
void message(const char*s){memset(SCR+960,32,40);text(1,24,s,7);msgtime=92;}
void spr(u8 n,u16 x,u8 y,u8 pic,u8 color){u16 xx=x+24;VIC[n*2]=xx;VIC[n*2+1]=y+50;if(xx>255)msb|=1<<n;PTR[n]=16+pic;VIC[0x27+n]=color;enabled|=1<<n;}
u8 tileat(int x,int y){if(x<0||x>319||y<24||y>183)return 1;return map[((y-24)>>4)*20+(x>>4)];}
u8 solid(int x,int y){u8 t=tileat(x,y);return t==1||t==2||t==14;}
u8 close_to(u16 a,u16 b,u8 r){return a>b?a-b<r:b-a<r;}
void tile(u8 cell){u8 t=map[cell],x=(cell%20)*2,y=(cell/20)*2+3,c;u16 p=(u16)y*40+x;
 if(t==1||t==2)c=themes[floor_no-1];else if(t==11)c=2;else if(t==13)c=5;else if(t==14)c=4;else if(t==15)c=11;else c=(t==0||t>=12)?6:(t==4?7:(t==7?14:(t==6?3:7)));
 SCR[p]=128+t*4;SCR[p+1]=129+t*4;SCR[p+40]=130+t*4;SCR[p+41]=131+t*4;
 COL[p]=c;COL[p+1]=c;COL[p+40]=(t==1?11:c);COL[p+41]=(t==2?11:c);
}
void hud(void){u8 i=target,j,bars;
 text(1,0,"HP",3);number(4,0,hp,2,invuln?2:1);text(8,0,"LOOT",7);number(13,0,loot,2,1);text(18,0,"FLOOR",3);number(24,0,floor_no,1,1);text(28,0,"SCORE",7);number(34,0,score,5,1);
 text(1,1,weapon?"SIZZLER AXE":"RUSTY AXE  ",weapon?7:15);text(18,1,"FOES",15);number(23,1,remaining+alive,2,1);memset(SCR+27+40,32,13);memset(COL+27+40,15,13);
 if(i<5&&en[i].hp&&(targettime||en[i].type==5)){
  if(en[i].type==5){text(27,1,"BOSS",2);bars=(u8)(((u16)en[i].hp*8+en[i].maxhp-1)/en[i].maxhp);for(j=0;j<8;j++){SCR[32+40+j]=j<bars?'#':'-';COL[32+40+j]=j<bars?(bars<3?2:(bars<5?8:7)):11;}}
  else{text(27,1,foenames[en[i].type],en[i].hp*2<=en[i].maxhp?2:7);number(32,1,en[i].hp,2,1);SCR[34+40]='/';COL[34+40]=15;number(35,1,en[i].maxhp,2,15);}
 }else{text(28,1,"HI",15);number(32,1,hiscore,5,1);}
}
void transition(const char*a,const char*b){u8 y;mode=2;SID[4]=SID[11]=0;VIC[0x15]=0;for(y=3;y<23;y++){memset(SCR+(u16)y*40,32,40);pauseframes(1);}text(4,9,a,7);text(3,12,b,3);pauseframes(60);}
void put(u8 x,u8 y,u8 t){map[(u16)y*20+x]=t;}
void layout(void){u8 i,x,y;
 /* Decorative floor cracks are non-solid. Authored obstacles are placed below. */
 for(y=0;y<10;y++)for(x=0;x<20;x++){i=y*20+x;map[i]=(x==0||x==19||y==0||y==9)?1:((rnd()&3)?0:((rnd()&1)?12:15));}
 if(floor_no==1){ /* Tape cellar: staggered loading pillars and narrow escape channels. */
  for(y=2;y<=7;y+=2){put(6,y,2);put(13,y+1,2);}put(9,4,2);put(10,5,2);put(4,5,2);put(15,4,2);
 }else if(floor_no==2){ /* SID crypt: tomb rows and a live spike aisle. */
  for(x=4;x<=15;x+=3){put(x,2,2);put(x,7,2);}for(x=6;x<=13;x++)put(x,4,11);put(9,4,0);put(10,4,0);put(3,5,11);put(16,5,11);
 }else if(floor_no==3){ /* Rubber-key catacombs: ribs plus sticky green membrane. */
  for(y=2;y<=7;y++){x=(y&1)?7:12;put(x,y,2);put(x+(y&1?1:-1),y,2);}put(9,3,13);put(10,3,13);put(9,6,13);put(10,6,13);put(4,4,13);put(15,5,13);
 }else if(floor_no==4){ /* Booze cupboard: shelving lanes, broken glass and sticky spills. */
  for(y=2;y<=7;y+=3)for(x=5;x<=14;x++)if(x!=9&&x!=10)put(x,y,2);put(5,4,11);put(14,5,11);put(10,7,11);put(8,3,13);put(11,6,13);
 }else if(floor_no==5){ /* Lost Sizzler vault: rune barricades and hot floor traps. */
  for(x=5;x<=14;x++){if(x!=9&&x!=10){put(x,2,2);put(x,7,2);}}for(y=3;y<=6;y++){put(5,y,2);put(14,y,2);}put(8,4,11);put(11,4,11);put(8,5,11);put(11,5,11);put(9,4,14);put(10,5,14);
 }else{ /* Boss floor: fast, broad arena with only corner buttresses and warning spikes. */
  put(4,2,2);put(5,2,2);put(14,2,2);put(15,2,2);put(4,7,2);put(5,7,2);put(14,7,2);put(15,7,2);put(9,2,11);put(10,7,11);
 }
 put(4,0,9);put(15,0,9);put(0,2,8);put(19,5,8);put(4,9,9);put(15,9,9);
 put(3,2,3);put(3,7,4);put(16,2,5);put(16,7,floor_no==3?6:4);put(18,8,10);
}
u8 counttype(u8 t){u8 i,n=0;for(i=0;i<5;i++)if(en[i].hp&&en[i].type==t)++n;return n;}
u8 spawnok(u8 c,u8 me){u8 j,t;u16 ex;u8 ey;t=map[c];if(!(t==0||t==12||t==13||t==15))return 0;ex=(c%20)*16+8;ey=(c/20)*16+32;
 if(close_to(ex,px,78)&&close_to(ey,py,52))return 0;
 for(j=0;j<5;j++)if(j!=me&&en[j].hp&&close_to(ex,en[j].x,42)&&close_to(ey,en[j].y,36))return 0;
 en[me].x=ex;en[me].y=ey;return 1;}
void spawn(u8 i){u8 j,c,t;t=rosters[(floor_no-1)*4+(rnd()&3)];if(t==2&&counttype(2)>=2)t=(floor_no&1)?1:3;en[i].type=t;
 en[i].hp=t==2?1:(t==3?4:(t==4?3:2));if(floor_no>=4&&t!=2)++en[i].hp;if(floor_no==6&&t!=2)++en[i].hp;
 en[i].maxhp=en[i].hp;en[i].phase=rnd();en[i].hurt=0;
 for(j=0;j<120;j++){c=(rnd()%7+1)*20+(rnd()%14+3);if(spawnok(c,i))break;}++alive;
}
void room(void){u8 i;clear();floor_no=floor_no>6?6:floor_no;px=40;py=56;dir=3;shot=bolt=0;boltspd=3;invuln=55;cool=0;alive=0;boss=0;bossphase=0;chain=chaintime=0;target=255;targettime=0;hazardcool=0;
 for(i=0;i<5;i++)en[i].hp=0;layout();for(i=0;i<200;i++)tile(i);
 for(i=0;i<40;i++){SCR[80+i]=45;COL[80+i]=6;SCR[920+i]=45;COL[920+i]=6;}
 remaining=4+floor_no+(floor_no>2?1:0);if(remaining>11)remaining=11;for(i=0;i<5;i++)if(remaining){--remaining;spawn(i);}
 mode=1;SID[4]=SID[11]=0;hud();message(names[floor_no-1]);
}
void damage(void){if(!invuln){if(hp)--hp;invuln=48;hitflash=5;sound(2);message("OH, BOLLOCKS.");hud();}}
void killed(u8 i){u8 t=en[i].type;en[i].hp=0;--alive;
 if(t==5){score+=1500;chain=chaintime=0;message("THE BUFFERING IS BREAKING!");}
 else{if(chaintime){if(chain<4)++chain;}else chain=1;chaintime=96;score+=(u16)100*chain;
  if(chain>1){if(chain==2)message("CARNAGE X2!");else if(chain==3)message("CARNAGE X3!");else message("CARNAGE X4! ABSOLUTE FILTH.");}
  else message((rnd()&1)?"GET IN THERE!":"THAT LOOKED EXPENSIVE.");}
 if(score>hiscore)hiscore=score;sound(3);target=i;targettime=24;if(remaining){--remaining;spawn(i);}hud();}
void hit(u8 i){u8 dmg=weapon?2:1;target=i;targettime=85;if(en[i].hp<=dmg)killed(i);else{en[i].hp-=dmg;en[i].hurt=10;sound(1);hud();}}
void attack(void){u8 i;cool=weapon?6:10;sound(1);
 for(i=0;i<5;i++)if(en[i].hp&&close_to(px,en[i].x,34)&&close_to(py,en[i].y,30)){
  if((dir==0&&en[i].y<py)||(dir==1&&en[i].y>py)||(dir==2&&en[i].x<px)||(dir==3&&en[i].x>px))hit(i);
 }
 if(!shot){shot=1;sx=px;sy=py;sd=dir;}
}
void movebullet(void){u8 i;
 if(shot){if(sd==0)sy-=9;if(sd==1)sy+=9;if(sd==2)sx-=9;if(sd==3)sx+=9;
  if(solid(sx,sy))shot=0;else for(i=0;i<5;i++)if(en[i].hp&&close_to(sx,en[i].x,en[i].type==5?25:13)&&close_to(sy,en[i].y,en[i].type==5?25:14)){hit(i);shot=0;break;}}
 if(bolt){if(bd==0)by-=boltspd;if(bd==1)by+=boltspd;if(bd==2)bx-=boltspd;if(bd==3)bx+=boltspd;if(solid(bx,by))bolt=0;else if(close_to(px,bx,11)&&close_to(py,by,12)){damage();bolt=0;}}
}
u8 clearstep(u8 me,int nx,int ny){u8 j;if(solid(nx,ny))return 0;for(j=0;j<5;j++)if(j!=me&&en[j].hp&&close_to((u16)nx,en[j].x,18)&&close_to((u16)ny,en[j].y,18))return 0;return 1;}
void enemystep(u8 i,int nx,int ny){if(clearstep(i,nx,en[i].y))en[i].x=nx;if(clearstep(i,en[i].x,ny))en[i].y=ny;}
void enemies(void){u8 i,j,t,speed,repel;int nx,ny;for(i=0;i<5;i++)if(en[i].hp){t=en[i].type;if(en[i].hurt)--en[i].hurt;
  /* Spread expensive path decisions over frames; larger steps keep the action brisk. */
  if(t==5){if((frame+en[i].phase)&1)continue;}else if(((frame+en[i].phase+(i<<1))&3)!=0)continue;
  nx=en[i].x;ny=en[i].y;
  if(t==5){bossphase=en[i].hp>16?0:(en[i].hp>8?1:2);speed=bossphase==2?4:(bossphase?3:2);
   if(close_to(px,nx,52)&&close_to(py,ny,44)){if((frame>>2)&1){nx+=px<nx?speed:-speed;}else{ny+=py<ny?speed:-speed;}}
   else if((frame>>3)&1){if(px<nx)nx-=speed;else if(px>nx)nx+=speed;}else{if(py<ny)ny-=speed;else if(py>ny)ny+=speed;}
   enemystep(i,nx,ny);if(en[i].x<30)en[i].x=30;if(en[i].x>290)en[i].x=290;if(en[i].y<52)en[i].y=52;if(en[i].y>157)en[i].y=157;
   if(!bolt&&((bossphase==0&&!(frame&31))||(bossphase==1&&!(frame&15))||(bossphase==2&&!(frame&7)))){bolt=1;boltspd=bossphase==2?5:4;bx=en[i].x;by=en[i].y;bd=close_to(px,bx,22)?(py<by?0:1):(px<bx?2:3);}
  }else if(t==2){ /* Bats get one fast dart, peel away, and repel other bats. */
   speed=6;repel=0;for(j=0;j<5;j++)if(j!=i&&en[j].hp&&en[j].type==2&&close_to(en[i].x,en[j].x,46)&&close_to(en[i].y,en[j].y,40)){nx+=en[i].x<en[j].x?-speed:speed;ny+=en[i].y<en[j].y?-2:2;repel=1;break;}
   if(!repel){if(close_to(px,nx,46)&&close_to(py,ny,40)){if((frame+en[i].phase)&8)nx+=px<nx?speed:-speed;else ny+=py<ny?speed:-speed;}
    else if((frame+en[i].phase)&4){if(px<nx)nx-=speed;else if(px>nx)nx+=speed;}else{if(py<ny)ny-=speed;else if(py>ny)ny+=speed;}}
   enemystep(i,nx,ny);
  }else if(t==4){ /* Sorcerers hold range and only shoot when roughly lined up. */
   speed=3;if(close_to(px,nx,68)&&close_to(py,ny,58)){if(px<nx)nx+=speed;else nx-=speed;if(py<ny)ny+=speed;else ny-=speed;enemystep(i,nx,ny);}
   else if(!close_to(px,nx,118)||!close_to(py,ny,86)){if((frame+en[i].phase)&4){if(px<nx)nx-=speed;else nx+=speed;}else{if(py<ny)ny-=speed;else ny+=speed;}enemystep(i,nx,ny);}
   if(!bolt&&!(frame&31)&&(close_to(px,en[i].x,24)||close_to(py,en[i].y,22))){bolt=1;boltspd=4;bx=en[i].x;by=en[i].y;bd=close_to(px,bx,24)?(py<by?0:1):(px<bx?2:3);}
  }else{ /* Skeletons pressure lanes; slimes are slower tanks. */
   speed=t==3?3:4;if(t==3&&((frame+en[i].phase)&4))continue;
   if(close_to(px,nx,22)){if(py<ny)ny-=speed;else if(py>ny)ny+=speed;}else if(close_to(py,ny,20)){if(px<nx)nx-=speed;else if(px>nx)nx+=speed;}
   else if((frame+en[i].phase)&4){if(px<nx)nx-=speed;else nx+=speed;}else{if(py<ny)ny-=speed;else ny+=speed;}enemystep(i,nx,ny);
  }
  if(close_to(px,en[i].x,t==5?23:14)&&close_to(py,en[i].y,t==5?23:14))damage();
 }}
u8 enemycolor(u8 i){u8 t=en[i].type,c;if(en[i].hurt)return 1;t=en[i].type;c=t==1?15:t==2?4:t==3?5:t==4?14:2;if(en[i].hp*3<=en[i].maxhp)c=2;else if(en[i].hp*2<=en[i].maxhp)c=8;return c;}
void render(void){u8 i,t;enabled=msb=0;VIC[0x17]=VIC[0x1d]=boss?2:0;
 if(!invuln||(frame&4))spr(0,px-12,py-10,(frame>>2)&1,cool>4?1:3);
 for(i=0;i<5;i++)if(en[i].hp){t=en[i].type;spr(i+1,en[i].x-(t==5?24:12),en[i].y-(t==5?21:10),t*2+((frame>>2)&1),enemycolor(i));}
 if(shot)spr(6,sx-12,sy-10,12+((frame>>1)&1),7);if(bolt)spr(7,bx-12,by-10,14+((frame>>1)&1),8);VIC[0x10]=msb;VIC[0x15]=enabled;
}
void pickups(void){u8 cell,t;cell=((py-24)>>4)*20+(px>>4);t=map[cell];
 if(t==11&&!hazardcool){damage();hazardcool=24;}
 if(t==3||t==4||t==5||t==6){map[cell]=0;tile(cell);sound(3);
  if(t==4){hp+=4;if(hp>12)hp=12;message("HAVE A BEER. YOU'VE EARNED IT.");}
  else if(t==6){weapon=1;message("SIZZLER AXE ACQUIRED. NOW WE'RE TALKING.");}
  else{loot++;score+=t==3?250:400;message(t==3?"LOOT. BETTER THAN EXPOSURE.":"THAT'S THE GAS BILL SORTED.");}
  if(score>hiscore)hiscore=score;hud();}
 if(!alive&&!remaining){
  if(floor_no==6&&!boss){boss=1;en[0].hp=24;en[0].maxhp=24;en[0].type=5;en[0].x=256;en[0].y=104;en[0].phase=0;en[0].hurt=0;alive=1;target=0;targettime=255;message("THE LORD OF BUFFERING HAS ARRIVED.");hud();}
  else{if(map[178]!=7){map[178]=7;tile(178);message("STAIRS OPEN. TRY NOT TO LOOK SMUG.");}if(cell==178){if(floor_no==6){mode=3;return;}transition("ANOTHER FLOOR?","COURSE THERE BLOODY IS.");++floor_no;hp+=2;if(hp>12)hp=12;room();}}
 }
}
void gameplay(void){int nx,ny;u8 i,step,cell;mode=1;floor_no=1;hp=12;score=0;loot=weapon=0;room();
 while(hp&&mode==1){waitframe();joy=~R(0xdc00)&31;nx=px;ny=py;cell=((py-24)>>4)*20+(px>>4);step=map[cell]==13?2:4;
  if(joy&1){ny-=step;dir=0;}else if(joy&2){ny+=step;dir=1;}if(joy&4){nx-=step;dir=2;}else if(joy&8){nx+=step;dir=3;}
  if(!solid(nx-5,py-5)&&!solid(nx+5,py+5)&&!solid(nx-5,py+5)&&!solid(nx+5,py-5))px=nx;
  if(!solid(px-5,ny-5)&&!solid(px+5,ny+5)&&!solid(px-5,ny+5)&&!solid(px+5,ny-5))py=ny;
  if(invuln)--invuln;if(cool)--cool;if(hazardcool)--hazardcool;if(chaintime){--chaintime;if(!chaintime)chain=0;}if(targettime&&targettime<255){--targettime;if(!targettime)hud();}
  if((joy&16)&&!cool)attack();movebullet();enemies();pickups();
  if(hitflash){--hitflash;VIC[0x20]=2;}else VIC[0x20]=0;
  if(msgtime){--msgtime;if(!msgtime){memset(SCR+960,32,40);text(1,24,"FIRE: AXE  RED: HURTS  GREEN: SLOWS",12);}}
  if(!(frame&7)){COL[3*40+8]=(frame&8)?7:8;COL[3*40+30]=(frame&8)?8:7;COL[21*40+8]=(frame&8)?8:7;COL[21*40+30]=(frame&8)?7:8;if(map[178]==7){for(i=0;i<4;i++)COL[19*40+36+(i&1)+(i>>1)*40]=(frame&16)?3:14;}}
  if(!(frame&7)){R(0xc800+(128+9*4)*8+1)=(frame&8)?0x16:0x0c;R(0xc800+(128+9*4)*8+2)=(frame&8)?0x1c:0x3a;}render();
 }
}
void charmode(void){VIC[0x11]=0x1b;VIC[0x16]=8;VIC[0x18]=2;VIC[0x21]=0;clear();}
void releasefire(void){while(!(R(0xdc00)&16))waitframe();}
void waitfire(void){releasefire();while(R(0xdc00)&16)waitframe();releasefire();}
void credits(void){charmode();mode=0;text(5,2,"CHEEKY COMMODORE GAMER",7);text(8,4,"DUNGEON CARNAGE 64",3);
 text(3,7,"FOR EVERYONE WHO WAITED THROUGH",15);text(3,9,"A TEN-MINUTE LOAD... THEN DIED.",15);
 text(3,12,"GREETINGS TO THE CCG COMMUNITY,",3);text(3,14,"MEMBERS OLD AND NEW, AND EVERY",3);text(3,16,"SID-LOVING, JOYSTICK-WRECKING SOUL.",3);
 text(7,19,"CHEEKYCOMMODOREGAMER.CO.UK",7);text(5,21,"YOUTUBE: CHEEKY COMMODORE GAMER",1);text(11,24,"FIRE TO RETURN",15);waitfire();}
void title(void){u8 i;mode=0;VIC[0x15]=0;memcpy((void*)0xe000,titlebitmap,8000);memcpy(SCR,titlescreen,1000);VIC[0x11]=0x3b;VIC[0x18]=8;VIC[0x16]=8;releasefire();
 for(;;){waitframe();seed+=ticks;joy=~R(0xdc00)&31;
  if(!(frame&3))for(i=0;i<40;i++)SCR[22*40+i]=((i+(frame>>2))%16<4?7:((i+(frame>>2))%16<8?3:((i+(frame>>2))%16<12?14:8)))<<4;
  if(!(frame&7)){SCR[11*40+7]=((frame&16)?8:7)<<4;SCR[11*40+32]=((frame&16)?7:8)<<4;SCR[14*40+19]=((frame&16)?3:14)<<4;SCR[7*40+4]=((frame&16)?14:3)<<4;SCR[7*40+35]=((frame&16)?3:14)<<4;}
  if(joy&16)break;if(joy&2){credits();memcpy(SCR,titlescreen,1000);VIC[0x11]=0x3b;VIC[0x18]=8;}
 }
 charmode();releasefire();
}
void endscreen(void){u8 won=mode==3;mode=0;transition(won?"GET IN THERE!":"OH, BOLLOCKS.",won?"THE BUFFERING ENDS HERE.":"YOU HAVE BEEN OUT-NERDED.");clear();
 text(6,3,won?"DUNGEON PROPERLY CARNAGED":"       GAME OVER",7);text(11,7,"FINAL SCORE",3);number(24,7,score,5,1);text(11,9,"HIGH SCORE",3);number(24,9,hiscore,5,7);
 text(7,12,won?"SIX FLOORS. STILL NO REFUND.":"NEXT TIME, BRING A LONGER AXE.",15);text(7,15,"CHEEKYCOMMODOREGAMER.CO.UK",3);text(5,17,"YOUTUBE: CHEEKY COMMODORE GAMER",3);text(10,21,"FIRE FOR ANOTHER GO",7);pauseframes(35);waitfire();}
int main(void){__asm__("sei");R(0xdc0d)=0x7f;R(0xdd0d)=0x7f;R(0xd01a)=0;R(1)=0x35;*(u16*)0xfffa=(u16)nmi_handler;R(0xdd02)|=3;R(0xdd00)&=0xfc;R(0xdc02)=0;R(0xdc03)=0;VIC[0x20]=0;
 memcpy((void*)0xc800,charset,2048);memcpy((void*)0xc400,sprites,1024);memset((void*)0xd400,0,25);SID[24]=15;VIC[0x1c]=255;VIC[0x25]=6;VIC[0x26]=1;VIC[0x1b]=0;VIC[0x17]=VIC[0x1d]=0;
 for(;;){title();gameplay();endscreen();}}
