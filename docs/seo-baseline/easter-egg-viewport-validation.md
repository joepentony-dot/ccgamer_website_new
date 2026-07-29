# Easter Egg Viewport Positioning Validation

## Verdict

**PASS**

The three-click command menu, a shared framed result and the direct BSOD overlay were tested from a scrolled page position across phone portrait, small phone, phone landscape, desktop and the Games index.

| Case | Viewport | Result | Menu height | Result frame height |
|---|---:|---:|---:|---:|
| phone-portrait | 390×844 | PASS | 828 | 759.59 |
| small-phone | 360×640 | PASS | 624 | 576 |
| phone-landscape | 844×390 | PASS | 374 | 374 |
| desktop | 1366×768 | PASS | 669.59 | 691.19 |
| games-phone | 390×844 | PASS | 828 | 759.59 |

## Required behaviour

- Menu panel, close button, framed result, direct result and exit button remain inside the visible viewport.
- Long menus scroll internally with the close control remaining visible.
- Every reopen begins at the top of the command list.
- Opening and closing does not move the underlying page.
- The body is no longer changed to fixed positioning or touch-action none.
- Keyboard focus moves to the active close/exit control.

## Failed checks

- None
