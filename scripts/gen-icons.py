#!/usr/bin/env python3
"""
Generate PWA icons: a cute money-jar logo (jar outline with gold & silver
coins piled at the bottom) on the brand dark navy.

Pure stdlib (no PIL) — encodes PNG manually with simple shape primitives.
"""

import struct, zlib, os

# Brand colors
BASE   = (16, 18, 29)        # #10121D dark navy (page bg)
LIGHT  = (218, 224, 232)     # off-white for jar outline
GOLD   = (250, 191, 36)      # #FABF24 - golden coin
GOLD_E = (190, 138, 12)      # gold edge
SILVER = (199, 207, 219)     # #C7CFDB - silver coin
SILVER_E= (140, 152, 170)    # silver edge

REF = 512  # reference design size; output scales from this

# --- Geometry primitives ---

def in_rounded_rect(x, y, L, T, R, B, r):
    """True if point is inside a filled rounded rectangle."""
    if x < L or x > R or y < T or y > B:
        return False
    if L + r <= x <= R - r:
        return True
    if T + r <= y <= B - r:
        return True
    for cx, cy in ((L+r, T+r), (R-r, T+r), (L+r, B-r), (R-r, B-r)):
        if abs(x-cx) <= r and abs(y-cy) <= r:
            if (x-cx)**2 + (y-cy)**2 <= r*r:
                return True
    return False

def on_rounded_rect_outline(x, y, L, T, R, B, r, thickness):
    """True if point is on the outline (stroke) of a rounded rect."""
    if not in_rounded_rect(x, y, L, T, R, B, r):
        return False
    return not in_rounded_rect(
        x, y, L+thickness, T+thickness, R-thickness, B-thickness, max(0, r-thickness)
    )

def in_circle(x, y, cx, cy, r):
    return (x-cx)**2 + (y-cy)**2 <= r*r

# --- Logo design (jar + coins) ---

# Jar lid/rim — wide thin pill at top
LID = (156, 80, 356, 142, 18)   # L, T, R, B, corner-r

# Jar body — bigger pill below
BODY = (118, 158, 394, 438, 38)

STROKE = 10  # outline thickness

# Coins: list of (cx, cy, r, fill, edge), drawn back→front
COINS = [
    # Back row
    (175, 372, 32, GOLD,   GOLD_E),
    (252, 360, 36, SILVER, SILVER_E),
    (332, 372, 32, GOLD,   GOLD_E),
    # Front row (drawn on top)
    (158, 410, 28, SILVER, SILVER_E),
    (228, 412, 32, GOLD,   GOLD_E),
    (305, 410, 30, SILVER, SILVER_E),
    (375, 408, 26, GOLD,   GOLD_E),
]

def pixel_color(x, y):
    # Layer 1: jar outlines on top of everything except coins-inside check below
    lid_outline  = on_rounded_rect_outline(x, y, *LID, STROKE)
    body_outline = on_rounded_rect_outline(x, y, *BODY, STROKE)

    # Coins should appear INSIDE the jar (clipped by body interior).
    inside_body = in_rounded_rect(
        x, y, BODY[0]+STROKE, BODY[1]+STROKE,
        BODY[2]-STROKE, BODY[3]-STROKE, max(0, BODY[4]-STROKE)
    )

    # Coin layer (painter algorithm: later coins overwrite earlier ones)
    coin_color = None
    if inside_body:
        for cx, cy, r, fill, edge in COINS:
            if in_circle(x, y, cx, cy, r):
                # 3px edge ring for definition
                if in_circle(x, y, cx, cy, r - 3):
                    coin_color = fill
                else:
                    coin_color = edge

    # Compose: jar outline on top (so coins peek out from behind the rim if they cross),
    # but bottom of body outline is in front of coins (jar wall hides bottom of coin pile)
    if lid_outline:
        return LIGHT
    if body_outline:
        # Coins should be CLIPPED by the body outline (jar shows through where coin protrudes)
        # but we want the outline visible. So outline wins over coin.
        return LIGHT
    if coin_color is not None:
        return coin_color
    return BASE

# --- PNG encoder ---

def write_chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def make_png(size):
    scale = REF / size
    rows = []
    for py in range(size):
        row = b'\x00'
        y_ref = (py + 0.5) * scale
        for px in range(size):
            x_ref = (px + 0.5) * scale
            row += bytes(pixel_color(x_ref, y_ref))
        rows.append(row)
    raw = b''.join(rows)
    compressed = zlib.compress(raw, 9)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = write_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    idat = write_chunk(b'IDAT', compressed)
    iend = write_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('public/icons', exist_ok=True)
for s in (192, 512):
    path = f'public/icons/icon-{s}.png'
    with open(path, 'wb') as f:
        f.write(make_png(s))
    print(f'Generated {path}')

with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(make_png(180))
print('Generated public/apple-touch-icon.png')

with open('public/favicon.png', 'wb') as f:
    f.write(make_png(32))
print('Generated public/favicon.png')
