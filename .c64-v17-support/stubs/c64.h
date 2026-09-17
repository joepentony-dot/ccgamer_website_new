#ifndef C64_H
#define C64_H
#define COLOR_BLACK 0
#define COLOR_WHITE 1
#define COLOR_RED 2
#define COLOR_CYAN 3
#define COLOR_PURPLE 4
#define COLOR_GREEN 5
#define COLOR_BLUE 6
#define COLOR_YELLOW 7
#define COLOR_ORANGE 8
#define COLOR_BROWN 9
#define COLOR_LIGHTRED 10
#define COLOR_GRAY1 11
#define COLOR_GRAY2 12
#define COLOR_LIGHTGREEN 13
#define COLOR_LIGHTBLUE 14
#define COLOR_GRAY3 15
#define JOY_UP_MASK 0x01
#define JOY_DOWN_MASK 0x02
#define JOY_LEFT_MASK 0x04
#define JOY_RIGHT_MASK 0x08
#define JOY_BTN_1_MASK 0x10
struct pos { unsigned char x,y; };
struct vic_stub {
  struct pos spr_pos[8];
  unsigned char spr_hi_x, ctrl1, rasterline, strobe_x, strobe_y, spr_ena, ctrl2, spr_exp_y, addr, irr, imr,
    spr_bg_prio, spr_mcolor, spr_exp_x, spr_coll, spr_bg_coll, bordercolor, bgcolor0,bgcolor1,bgcolor2,bgcolor3,
    spr_mcolor0,spr_mcolor1;
  unsigned char spr_color[8];
};
struct sid_voice_stub { unsigned short freq; unsigned short pw; unsigned char ctrl,ad,sr; };
struct sid_stub { struct sid_voice_stub v1,v2,v3; unsigned short flt_freq; unsigned char flt_ctrl,amp,ad1,ad2,noise,read3; };
extern struct vic_stub VIC;
struct cia_stub { unsigned char pra,prb,ddra,ddrb,ta_lo,ta_hi,tb_lo,tb_hi,tod_10,tod_sec,tod_min,tod_hour,sdr,icr,cra,crb; };
extern struct sid_stub SID;
extern struct cia_stub CIA2;
#endif
