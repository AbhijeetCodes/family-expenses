#!/usr/bin/env python3
"""
Generate PWA icons: a friendly wallet logo on the brand-green rounded square.
Pure stdlib (no PIL) — encodes PNG manually.

Design (at 512px reference):
  - Outer rounded square: accent green (#00D689), corner radius 120
  - White wallet body: rounded rectangle, centered
  - Smaller white "tab" above body (the flap)
  - Small green circle on the right side of the body (the button)
  - Small dark "card peek" rectangle inside the wallet for character
"""

import struct, zlib, os

# Brand colors
BG     = (16, 18, 29)       # #10121D
GREEN  = (0, 214, 137)      # #00D689
WHITE  = (255, 255, 255)
DARK_HINT = (16, 18, 29)    # for subtle card peek

# Reference design coordinates assume a 512x512 canvas
REF = 512

def in_rounded_rect(x, y, left, top, right, bottom, r):
    if x < left or x > right or y < top or y > bottom:
        return False
    # Inside the straight regions
    if left + r <= x <= right - r:
        return True
    if top + r <= y <= bottom - r:
        return True
    # Check rounded corners
    for cx, cy in ((left+r, top+r), (right-r, top+r),
                   (left+r, bottom-r), (right-r, bottom-r)):
        # Determine which corner this point could belong to
        if abs(x-cx) <= r and abs(y-cy) <= r:
            if (x-cx)**2 + (y-cy)**2 <= r*r:
                return True
    return False

def in_circle(x, y, cx, cy, r):
    return (x-cx)**2 + (y-cy)**2 <= r*r

def pixel_color(x, y):
    """Return RGB for a pixel at ref-coord (x, y) in 0..512."""
    # Outside outer rounded square -> transparent/dark
    if not in_rounded_rect(x, y, 0, 0, REF, REF, 120):
        return BG
    color = GREEN

    # Wallet body (white): rect centered slightly below middle
    if in_rounded_rect(x, y, 116, 188, 396, 388, 36):
        color = WHITE

    # Flap above body (white)
    if in_rounded_rect(x, y, 150, 148, 362, 204, 22):
        color = WHITE

    # Card peek (subtle dark stripe inside wallet, top portion)
    if in_rounded_rect(x, y, 116, 224, 396, 258, 0):
        color = (210, 224, 220)  # very light gray-green for subtle card

    # Closure button (green circle on right side of wallet body)
    if in_circle(x, y, 360, 288, 14):
        color = GREEN

    return color

def write_chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def make_png(size):
    scale = REF / size
    rows = []
    for py in range(size):
        row = b'\x00'  # PNG filter byte
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

# Apple touch icon (180×180 is the iOS standard)
path = 'public/apple-touch-icon.png'
with open(path, 'wb') as f:
    f.write(make_png(180))
print(f'Generated {path}')

# Favicon (32×32 PNG; modern browsers accept PNG as favicon)
path = 'public/favicon.png'
with open(path, 'wb') as f:
    f.write(make_png(32))
print(f'Generated {path}')
