#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import math, random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'arcade/quest/assets/production'
for sub in ['player','fighter','enemies','collectibles','powers','hazards','bosses','invaders']:
    (OUT/sub).mkdir(parents=True, exist_ok=True)

random.seed(64)

C = {
    'ink': '#081018', 'blue': '#175f8d', 'blue2': '#2e8fc2', 'skin': '#efb28a', 'white': '#f7f5ed',
    'orange': '#f0792f', 'yellow': '#ffe05b', 'green': '#62ef8b', 'red': '#ff445d', 'purple': '#8f55d8',
    'cyan': '#65eaff', 'grey': '#66717e', 'darkgrey': '#252a31', 'brown': '#764532', 'black': '#08090b'
}

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
    FONT_SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
except Exception:
    FONT = ImageFont.load_default(); FONT_SMALL = FONT


def rgba(size): return Image.new('RGBA', size, (0,0,0,0))
def outline_line(d, pts, fill, width, out=5):
    d.line(pts, fill=C['ink'], width=width+out, joint='curve')
    d.line(pts, fill=fill, width=width, joint='curve')
def ellipse(d, box, fill, outline=C['ink'], width=5): d.ellipse(box, fill=fill, outline=outline, width=width)
def rr(d, box, radius, fill, outline=C['ink'], width=5): d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
def txt(d, xy, text, fill=C['white'], font=FONT, anchor='mm', stroke=3):
    d.text(xy, text, fill=fill, font=font, anchor=anchor, stroke_width=stroke, stroke_fill=C['ink'])

def logo_head():
    p = ROOT/'resources/images/ccgamer-logo.png'
    if p.exists():
        im=Image.open(p).convert('RGBA')
        crop=im.crop((0,0,int(im.width*.52),int(im.height*.78)))
        bb=crop.getchannel('A').getbbox()
        if bb: crop=crop.crop(bb)
        return crop
    # fallback cartoon head
    im=rgba((140,120)); d=ImageDraw.Draw(im)
    ellipse(d,(18,22,122,110),C['skin'],width=6); rr(d,(22,5,116,46),20,C['blue'],width=6)
    d.arc((36,40,110,98),10,170,fill=C['ink'],width=8); d.ellipse((75,70,101,100),fill='#eb7180')
    return im
HEAD=logo_head()

def paste_fit(dst, src, box):
    x0,y0,x1,y1=box; w=x1-x0; h=y1-y0
    s=src.copy(); s.thumbnail((w,h),Image.Resampling.LANCZOS)
    dst.alpha_composite(s,(x0+(w-s.width)//2,y0+(h-s.height)//2))

def cheeky_pose(size, state, variant=0, fighter=False):
    im=rgba(size); d=ImageDraw.Draw(im)
    W,H=size; ground=H-12
    duck=state in ('duck','duckFire','guard')
    jump=state in ('jumpTakeoff','jumpRise','jumpApex','jump','fall')
    hit=state=='hit'; kick=state=='kick'; punch=state in ('punch','fire','duckFire')
    run=state in ('run','walk')
    bob = (variant%2)*3
    cx=W//2 + (4 if hit else 0)
    hip_y=ground-(75 if duck else 94)-(18 if jump else 0)
    shoulder_y=hip_y-62
    head_y=shoulder_y-88
    # shadow
    d.ellipse((cx-48,ground-8,cx+48,ground+5),fill=(0,0,0,75))
    # legs
    phase=[-1,.8,-.6,1][variant%4] if run else 0
    l1=(cx-18,hip_y); r1=(cx+18,hip_y)
    lf=(cx-30-int(32*phase),ground-6-(10 if jump else 0)); rf=(cx+30+int(32*phase),ground-6-(10 if jump else 0))
    if duck: lf=(cx-48,ground-7); rf=(cx+38,ground-7)
    if kick: rf=(cx+92,hip_y-18)
    outline_line(d,[l1,lf],C['blue'],26); outline_line(d,[r1,rf],C['blue2'],26)
    rr(d,(lf[0]-24,lf[1]-10,lf[0]+25,lf[1]+12),10,C['white'],width=5)
    rr(d,(rf[0]-24,rf[1]-10,rf[0]+25,rf[1]+12),10,C['white'],width=5)
    # torso
    torso_top=shoulder_y-5; torso_bottom=hip_y+18
    rr(d,(cx-46,torso_top,cx+46,torso_bottom),22,C['blue'],width=6)
    d.rectangle((cx-36,torso_top+38,cx+36,torso_top+58),fill=C['blue2'])
    txt(d,(cx,torso_top+48),'CCG',font=FONT_SMALL,stroke=2)
    # arms
    la=(cx-38,shoulder_y+16); ra=(cx+38,shoulder_y+16)
    lh=(cx-61,shoulder_y+68); rh=(cx+63,shoulder_y+66)
    if run: lh=(cx-58-int(20*phase),shoulder_y+54); rh=(cx+60-int(20*phase),shoulder_y+58)
    if punch: rh=(cx+103,shoulder_y+10)
    if state=='victory': lh=(cx-57,head_y-30); rh=(cx+57,head_y-35)
    if hit: lh=(cx-65,shoulder_y+28); rh=(cx+72,shoulder_y+10)
    outline_line(d,[la,lh],C['blue'],22); outline_line(d,[ra,rh],C['blue2'],22)
    ellipse(d,(lh[0]-12,lh[1]-12,lh[0]+12,lh[1]+12),C['skin'],width=4)
    ellipse(d,(rh[0]-12,rh[1]-12,rh[0]+12,rh[1]+12),C['skin'],width=4)
    # head from real mascot
    head=HEAD.copy()
    if hit: head=head.rotate(-12,Image.Resampling.BICUBIC,expand=True)
    if jump and state=='fall': head=head.rotate(5,Image.Resampling.BICUBIC,expand=True)
    paste_fit(im,head,(cx-63,head_y-8-bob,cx+63,head_y+104-bob))
    # joystick/projectile for fire states
    if state in ('fire','duckFire'):
        rr(d,(cx+87,shoulder_y-8,cx+120,shoulder_y+22),7,C['black'],width=4)
        d.line((cx+103,shoulder_y-8,cx+103,shoulder_y-31),fill=C['white'],width=6)
        ellipse(d,(cx+94,shoulder_y-42,cx+112,shoulder_y-24),C['black'],width=3)
        for i in range(3): d.line((cx+122+i*8,shoulder_y+6,cx+134+i*8,shoulder_y+6),fill=C['yellow'],width=4)
    return im

def make_sheet(path, cell, cols, rows, states, maker):
    sh=rgba((cell[0]*cols,cell[1]*rows))
    for i,state in enumerate(states):
        fr=maker(cell,state,i)
        sh.alpha_composite(fr,((i%cols)*cell[0],(i//cols)*cell[1]))
    sh.save(path,optimize=True)

main_states=['idle','idle','run','run','run','run','jumpTakeoff','jumpRise','jumpApex','fall','land','duck','fire','duckFire','hit','victory']
make_sheet(OUT/'player/cheeky-main-sheet.png',(256,320),4,4,main_states,lambda cell,s,i:cheeky_pose(cell,s,i,False))
fight_states=['idle','idle','walk','jump','guard','punch','kick','hit']
make_sheet(OUT/'player/cheeky-fight-sheet.png',(248,316),4,2,fight_states,lambda cell,s,i:cheeky_pose(cell,s,i,True))

# modular Cheeky parts
head=rgba((160,150)); paste_fit(head,HEAD,(5,5,155,145)); head.save(OUT/'player/cheeky-head.png',optimize=True)
body=rgba((130,130)); db=ImageDraw.Draw(body); rr(db,(20,12,110,118),28,C['blue'],width=7); txt(db,(65,64),'CCG',font=FONT_SMALL); body.save(OUT/'player/cheeky-body.png',optimize=True)
arm=rgba((130,60)); da=ImageDraw.Draw(arm); outline_line(da,[(14,30),(112,30)],C['blue2'],22); ellipse(da,(100,18,124,42),C['skin'],width=4); arm.save(OUT/'player/cheeky-arm.png',optimize=True)
leg=rgba((80,150)); dl=ImageDraw.Draw(leg); outline_line(dl,[(36,12),(38,126)],C['blue'],28); rr(dl,(12,118,70,145),10,C['white'],width=5); leg.save(OUT/'player/cheeky-leg.png',optimize=True)
cheeky_pose((256,320),'victory',0).save(OUT/'player/cheeky-mascot.png',optimize=True)

# Retsu: tall martial-arts monk, source faces right
def retsu_pose(size,state,variant=0):
    im=rgba(size); d=ImageDraw.Draw(im); W,H=size; g=H-10; cx=W//2
    jump=state=='jump'; guard=state=='guard'; hit=state=='hit'; punch=state=='punch'; kick=state=='kick'; walk=state=='walk'
    hip=g-92-(25 if jump else 0); sh=hip-70; head=sh-54
    d.ellipse((cx-48,g-6,cx+48,g+4),fill=(0,0,0,70))
    phase=30 if walk else 0
    lf=(cx-32-phase,g-7); rf=(cx+32+phase,g-7)
    if kick: rf=(cx+104,hip-22)
    outline_line(d,[(cx-18,hip),lf],C['darkgrey'],28); outline_line(d,[(cx+18,hip),rf],C['darkgrey'],28)
    rr(d,(cx-52,sh-4,cx+52,hip+20),24,'#ded8c8',width=6)
    # sash/robe
    d.polygon([(cx-48,sh+12),(cx+5,sh+8),(cx+44,hip+10),(cx-8,hip+16)],fill='#333842')
    d.line((cx-8,sh+4,cx+12,hip+18),fill=C['orange'],width=8)
    # arms
    lh=(cx-62,sh+58); rh=(cx+64,sh+54)
    if guard: lh=(cx-32,sh+18); rh=(cx+30,sh+12)
    if punch: rh=(cx+110,sh+20)
    if hit: lh=(cx-76,sh+20); rh=(cx+72,sh-5)
    outline_line(d,[(cx-40,sh+18),lh],C['skin'],22); outline_line(d,[(cx+40,sh+18),rh],C['skin'],22)
    ellipse(d,(lh[0]-11,lh[1]-11,lh[0]+11,lh[1]+11),C['skin'],width=4); ellipse(d,(rh[0]-11,rh[1]-11,rh[0]+11,rh[1]+11),C['skin'],width=4)
    ellipse(d,(cx-34,head-12,cx+34,head+55),C['skin'],width=6)
    d.pieslice((cx-35,head-18,cx+35,head+26),180,360,fill=C['black'])
    d.line((cx+5,head+10,cx+28,head+13),fill=C['ink'],width=4)
    # prayer beads
    for a in range(200,341,28):
        x=cx+int(math.cos(math.radians(a))*37); y=sh+8+int(math.sin(math.radians(a))*25)
        ellipse(d,(x-5,y-5,x+5,y+5),C['brown'],width=2)
    return im
make_sheet(OUT/'fighter/retsu-sheet.png',(248,316),4,2,['idle','idle','walk','jump','guard','punch','kick','hit'],retsu_pose)

# 8-bit threatening enemies
def enemy_frame(size,state,variant=0):
    im=rgba(size); d=ImageDraw.Draw(im); W,H=size; g=H-7; low=state=='low'; cx=W//2
    body_y=50 if low else 38; phase=[-13,-5,6,13][variant%4]
    ellipse(d,(cx-30,body_y-22,cx+30,body_y+32),'#5b426f',width=5)
    # spines
    for i in range(5):
        x=cx-24+i*12; d.polygon([(x,body_y-20),(x+7,body_y-42-(i%2)*7),(x+12,body_y-17)],fill=C['red'])
    ellipse(d,(cx+10,body_y-9,cx+21,body_y+2),C['red'],width=2)
    if low:
        outline_line(d,[(cx-18,body_y+22),(cx-43,g-8)],'#66417b',14); outline_line(d,[(cx+13,body_y+23),(cx+46,g-8)],'#66417b',14)
    else:
        outline_line(d,[(cx-15,body_y+28),(cx-30-phase,g-8)],'#66417b',16); outline_line(d,[(cx+14,body_y+28),(cx+31+phase,g-8)],'#66417b',16)
    outline_line(d,[(cx+20,body_y+5),(cx+46,body_y+22)],'#66417b',12)
    return im
make_sheet(OUT/'enemies/8bit-enemy-sheet.png',(128,128),4,2,['run']*4+['low']*4,enemy_frame)

# Collectibles
def save_icon(name,drawfn,size=(256,220)):
    im=rgba(size); d=ImageDraw.Draw(im); drawfn(d,size); im.save(OUT/name,optimize=True)

def tape(d,s):
    W,H=s; rr(d,(25,50,W-25,H-45),22,'#55535b',width=8); rr(d,(43,68,W-43,118),12,'#d7d2c5',width=5)
    for x in (82,W-82): ellipse(d,(x-22,76,x+22,120),'#eee9db',width=4)
    txt(d,(W//2,149),'CCG MIX',fill=C['cyan'],font=FONT_SMALL)
def disk(d,s):
    W,H=s; rr(d,(35,18,W-35,H-18),20,'#4d78ad',width=8); rr(d,(70,20,W-70,82),8,'#d8d0c3',width=4); rr(d,(78,103,W-78,H-35),8,'#eee9df',width=4); txt(d,(W//2,146),'CCG',fill=C['blue'],font=FONT_SMALL)
def zzap(d,s):
    W,H=s; rr(d,(53,15,W-53,H-15),10,'#fff0a5',width=7); txt(d,(W//2,56),'ZZAP!64',fill=C['blue2'],font=FONT,stroke=2); d.line((82,83,170,170),fill=C['cyan'],width=18); d.line((162,86,89,170),fill=C['red'],width=10)
def joystick(d,s):
    W,H=s; rr(d,(38,115,W-38,H-28),25,'#25262b',width=8); ellipse(d,(54,136,106,188),C['orange'],width=6); ellipse(d,(150,136,202,188),C['orange'],width=6); rr(d,(111,63,145,140),13,'#17181c',width=6); ellipse(d,(100,32,156,88),'#16191e',width=6)
for fn,func in [('collectibles/tape.png',tape),('collectibles/disk.png',disk),('collectibles/zzap.png',zzap),('collectibles/joystick.png',joystick)]: save_icon(fn,func)

# Powerups
def shield(d,s):
    W,H=s; pts=[(W//2,22),(W-52,56),(W-65,H-62),(W//2,H-18),(65,H-62),(52,56)]; d.polygon(pts,fill='#2f9de1',outline=C['white']); d.line(pts+[pts[0]],fill=C['ink'],width=8)
def speed(d,s):
    W,H=s; pts=[(142,20),(74,118),(119,118),(86,H-20),(188,94),(139,94)]; d.polygon(pts,fill=C['yellow']); d.line(pts+[pts[0]],fill=C['ink'],width=8)
def double(d,s):
    W,H=s
    for cx in (92,164): d.polygon([(cx,24),(cx+30,95),(cx+8,194),(cx-30,115)],fill=C['red'],outline=C['yellow'])
for fn,func in [('powers/shield.png',shield),('powers/speed.png',speed),('powers/double.png',double)]: save_icon(fn,func)

# Hazards: unmistakably hostile red/black silhouettes
def hazard(kind):
    im=rgba((256,220)); d=ImageDraw.Draw(im); W,H=im.size
    for r,a in [(96,35),(72,55),(52,85)]: ellipse(d,(W//2-r,H//2-r,W//2+r,H//2+r),(255,35,60,a),outline=None,width=1)
    if kind=='bedroom':
        rr(d,(36,62,220,166),24,'#3b1822',width=8); txt(d,(128,108),'LOAD',fill=C['red']); txt(d,(128,142),'ERROR',fill=C['yellow'],font=FONT_SMALL)
    elif kind=='budget':
        rr(d,(42,42,214,178),28,'#781f28',width=8); txt(d,(128,96),'£9.99',fill=C['yellow']); d.polygon([(68,147),(90,184),(108,147),(130,184),(150,147),(176,184)],fill=C['white'])
    elif kind=='christmas':
        rr(d,(50,56,206,184),18,'#8b1f31',width=8); d.line((128,55,128,184),fill=C['yellow'],width=14); d.line((50,100,206,100),fill=C['yellow'],width=14); d.polygon([(88,55),(128,17),(168,55)],fill=C['red'])
    elif kind=='amiga':
        rr(d,(42,34,214,190),24,'#313744',width=8); rr(d,(78,55,178,104),8,'#1a1b20',width=5); ellipse(d,(102,116,154,168),C['red'],width=6)
    else:
        ellipse(d,(48,30,208,190),'#54245f',width=9); ellipse(d,(80,74,112,106),C['red'],width=4); ellipse(d,(144,74,176,106),C['red'],width=4); d.polygon([(84,138),(104,170),(128,142),(150,170),(174,138)],fill=C['white'])
    return im
for k in ['bedroom','budget','christmas','amiga','guru']: hazard(k).save(OUT/f'hazards/{k}.png',optimize=True)

# Boss art and animation sheets
def boss_frame(kind, state, variant=0):
    im=rgba((256,224)); d=ImageDraw.Draw(im); W,H=im.size
    shake=(variant%3-1)*3; cx=128+shake
    charge=state=='charge'; hit=state=='hit'; defeat=state=='defeat'
    glow=C['red'] if (charge or hit) else C['purple']
    if kind=='bedroom':
        rr(d,(35,45,cx+88,176),30,'#5a3546',width=8); txt(d,(128,88),'LOAD',fill=C['yellow']); txt(d,(128,123),'ERROR',fill=C['red'],font=FONT_SMALL); ellipse(d,(70,135,105,170),glow,width=5); ellipse(d,(151,135,186,170),glow,width=5)
    elif kind=='budget':
        rr(d,(38,32,218,185),30,'#7d2632',width=8); txt(d,(128,91),'£9.99',fill=C['yellow']); d.polygon([(64,148),(90,192),(115,148),(140,192),(170,148),(194,190)],fill=C['white'])
    elif kind=='christmas':
        rr(d,(48,45,208,185),22,'#8d2035',width=8); d.line((128,45,128,185),fill=C['yellow'],width=16); d.line((48,105,208,105),fill=C['yellow'],width=16); txt(d,(128,80),'NOW!',fill=C['white'],font=FONT_SMALL)
    elif kind=='amiga':
        rr(d,(38,30,218,190),28,'#39445a',width=8); rr(d,(68,50,188,104),10,'#13151a',width=5); txt(d,(128,78),'DISK',fill=C['cyan'],font=FONT_SMALL); ellipse(d,(92,118,164,185),glow,width=7)
    else:
        ellipse(d,(35,20,221,196),'#4b255c',width=9); d.polygon([(54,72),(15,45),(45,105)],fill='#8e5b2c'); d.polygon([(202,72),(241,45),(211,105)],fill='#8e5b2c'); ellipse(d,(75,68,111,104),glow,width=5); ellipse(d,(145,68,181,104),glow,width=5); d.polygon([(75,137),(101,181),(128,146),(156,181),(183,137)],fill=C['white'])
    if charge:
        for a in range(0,360,45):
            x=128+int(math.cos(math.radians(a))*102); y=112+int(math.sin(math.radians(a))*91); d.ellipse((x-5,y-5,x+5,y+5),fill=C['yellow'])
    if hit: d.line((34,30,218,198),fill=C['white'],width=9); d.line((216,32,38,198),fill=C['red'],width=7)
    if defeat:
        d.rectangle((0,0,256,224),fill=(25,0,20,60)); txt(d,(128,112),'DOWN!',fill=C['green'])
    return im

for kind in ['bedroom','budget','christmas','amiga','guru']:
    boss_frame(kind,'idle',0).save(OUT/f'bosses/{kind}.png',optimize=True)
    states=['idle','idle','charge','charge','charge','hit','hit','defeat']
    sheet=rgba((1024,448))
    for i,st in enumerate(states): sheet.alpha_composite(boss_frame(kind,st,i),((i%4)*256,(i//4)*224))
    sheet.save(OUT/f'bosses/{kind}-sheet.png',optimize=True)

# Alien Formation
def alien_icon(row):
    im=rgba((160,100)); d=ImageDraw.Draw(im); colors=['#67f07e','#55d8ff','#bd6dff','#ff5f62','#ffb14d']; c=colors[row]
    if row==0:
        rr(d,(32,24,128,72),18,c,width=6); d.rectangle((48,68,64,90),fill=c); d.rectangle((96,68,112,90),fill=c)
    elif row==1:
        ellipse(d,(34,18,126,82),c,width=6); for x in (48,80,112): d.line((x,72,x-10,94),fill=c,width=9)
    elif row==2:
        d.polygon([(80,10),(136,42),(116,88),(44,88),(24,42)],fill=c); d.line([(80,10),(136,42),(116,88),(44,88),(24,42),(80,10)],fill=C['ink'],width=6)
    elif row==3:
        rr(d,(28,28,132,78),12,c,width=6); d.polygon([(28,43),(7,24),(18,60)],fill=c); d.polygon([(132,43),(153,24),(142,60)],fill=c)
    else:
        ellipse(d,(28,18,132,84),c,width=6); d.polygon([(50,74),(30,99),(70,82)],fill=c); d.polygon([(110,74),(130,99),(90,82)],fill=c)
    ellipse(d,(53,42,69,58),C['black'],width=2); ellipse(d,(91,42,107,58),C['black'],width=2)
    return im
for r in range(5): alien_icon(r).save(OUT/f'invaders/alien-row-{r+1}.png',optimize=True)
ship=rgba((200,120)); ds=ImageDraw.Draw(ship); ds.polygon([(100,10),(28,100),(72,87),(100,54),(128,87),(172,100)],fill=C['cyan'],outline=C['ink']); ds.line((100,54,100,104),fill=C['blue'],width=10); ship.save(OUT/'invaders/player-ship.png',optimize=True)
bunker=rgba((220,100)); db=ImageDraw.Draw(bunker); rr(db,(18,36,202,92),14,'#397354',width=7); rr(db,(66,20,154,70),12,'#4f9b6a',width=7); bunker.save(OUT/'invaders/bunker.png',optimize=True)
for name,col in [('enemy-shot.png',C['red']),('player-shot.png',C['yellow'])]:
    sh=rgba((40,90)); dd=ImageDraw.Draw(sh); dd.polygon([(20,4),(34,38),(25,38),(34,84),(20,64),(6,84),(15,38),(6,38)],fill=col,outline=C['ink']); sh.save(OUT/f'invaders/{name}',optimize=True)

print('Generated Commodore Quest production artwork:', OUT)
