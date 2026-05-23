#!/usr/bin/env python3
"""Generate simple PWA icons without external dependencies."""
import struct, zlib, os

def make_png(size):
    def write_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    # Green background (#16a34a) with white ₹ area
    bg = (22, 163, 74)      # brand green
    fg = (255, 255, 255)

    rows = []
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            # Simple circle mask
            cx, cy = size // 2, size // 2
            r = size * 0.42
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist <= r:
                # Inner white cross shape representing ₹
                mx = abs(x - cx) / r
                my = abs(y - cy) / r
                if mx < 0.12 or (my < 0.12 and y < cy + r * 0.3):
                    row += bytes(fg)
                else:
                    row += bytes(bg)
            else:
                row += bytes(bg)
        rows.append(row)

    raw = b''.join(rows)
    compressed = zlib.compress(raw)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = write_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    idat = write_chunk(b'IDAT', compressed)
    iend = write_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('public/icons', exist_ok=True)
for s in [192, 512]:
    path = f'public/icons/icon-{s}.png'
    with open(path, 'wb') as f:
        f.write(make_png(s))
    print(f'Generated {path}')
