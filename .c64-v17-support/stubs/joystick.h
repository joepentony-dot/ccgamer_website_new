#ifndef JOYSTICK_H
#define JOYSTICK_H
#define JOY_1 0
#define JOY_2 1
extern const unsigned char joy_static_stddrv[];
unsigned char joy_install(const void*);
unsigned char joy_read(unsigned char);
#endif
